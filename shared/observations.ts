import type { Campaign } from "./campaign.js";
import { stationedForces } from "./fleets.js";
import { distance, type Star } from "./galaxy.js";
import { rules } from "./rules.js";
import { fleetPosition } from "./travel.js";
// The tuple layout is versioned canonical storage, not a client data contract.
// tick, source star index, orbit seat index, surface seat index, fighters,
// infantry, markets, camps, bases, stations. -1 means an unclaimed layer.
export type ObservationTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export interface Intelligence {
  format: 1;
  tick: number;
  reports: Record<string, Record<string, ObservationTuple>>;
  draws: Record<string, Array<number | null>>;
}
export const drawRange = 2 ** 48;
export function detectionProbability(level: number, distanceLy: number) {
  if (
    !Number.isInteger(level) ||
    level < 0 ||
    !Number.isFinite(distanceLy) ||
    distanceLy < 0
  )
    throw new Error("Invalid scan input");
  return distanceLy === 0 ? 1 : Math.min(1, (10 * level * level) / distanceLy);
}
export function nearestSensor(
  stars: Star[],
  sourceIndexes: number[],
  target: Star,
) {
  let index: number | null = null,
    range = Infinity;
  for (const source of sourceIndexes) {
    const d = distance(stars[source], target);
    if (d < range) {
      index = source;
      range = d;
    }
  }
  return { index, distanceLy: range };
}
export function acquireObservations(
  current: Campaign,
  next: Campaign,
  draw: (uid: string, starId: string, tick: number) => number,
) {
  if (current.schemaVersion !== 2 || current.intelligenceVersion === undefined)
    return;
  if (current.intelligenceVersion !== 1)
    throw new Error("Unsupported scanning capability");
  if (
    !next.economy ||
    !current.economy ||
    next.economy.tick !== current.economy.tick + 1
  )
    throw new Error("Invalid observation tick");
  const tick = next.economy.tick,
    stars = next.galaxy.stars;
  next.intelligence ??= {
    format: 1,
    tick,
    reports: {},
    draws: {},
  };
  const intelligence = next.intelligence;
  if (intelligence.format !== 1)
    throw new Error("Unsupported intelligence format");
  intelligence.tick = tick;
  intelligence.draws = {};
  const ownerIndex = (uid: string | null) => {
    if (uid === null) return -1;
    const index = next.seats.findIndex((seat) => seat.uid === uid);
    if (index < 0) throw new Error("Unknown observed owner");
    return index;
  };
  for (const seat of next.seats) {
    const uid = seat.uid,
      research = current.economy.research[uid];
    if (!research) throw new Error("Missing scanning level");
    const sources = stars
      .map((star, index) => (next.systems[star.id].orbit === uid ? index : -1))
      .filter((index) => index >= 0);
    intelligence.reports[uid] ??= {};
    const reports = intelligence.reports[uid];
    const draws: Array<number | null> = [];
    intelligence.draws[uid] = draws;
    for (let index = 0; index < stars.length; index++) {
      const star = stars[index],
        system = next.systems[star.id],
        own = system.orbit === uid && system.surface === uid;
      let nearest = own
        ? { index, distanceLy: 0 }
        : nearestSensor(stars, sources, star);
      if (!own && next.travelVersion === 1) {
        for (const fleet of Object.values(next.military?.fleets ?? {}).filter(
          (f) => f.uid === uid,
        )) {
          const point = fleetPosition(fleet, stars, tick);
          const d = Math.hypot(
            point.x - star.x,
            point.y - star.y,
            point.z - star.z,
          );
          if (d < nearest.distanceLy) nearest = { index: -2, distanceLy: d };
        }
      }
      if (nearest.index === null) {
        draws.push(null);
        continue;
      }
      let acquired = own;
      if (own) draws.push(null);
      else {
        const roll = draw(uid, star.id, tick);
        if (!Number.isSafeInteger(roll) || roll < 0 || roll >= drawRange)
          throw new Error("Invalid scan draw");
        draws.push(roll);
        acquired =
          roll / drawRange <
          detectionProbability(research.levels.scanning, nearest.distanceLy);
      }
      if (acquired) {
        const forces = stationedForces(next, star.id);
        reports[star.id] = [
          tick,
          nearest.index,
          ownerIndex(system.orbit),
          ownerIndex(system.surface),
          forces.fighters,
          forces.infantry,
          system.markets,
          system.camps,
          system.bases,
          system.stations,
        ];
      }
    }
  }
}
export function observationView(state: Campaign, uid: string) {
  if (state.intelligenceVersion === undefined || !state.intelligence)
    return null;
  if (state.intelligenceVersion !== 1 || state.intelligence.format !== 1)
    throw new Error("Unsupported scanning capability");
  const owner = (index: number) => {
    if (index === -1) return "Unclaimed";
    const seat = state.seats[index];
    if (!seat) throw new Error("Invalid observed seat");
    return seat.uid === uid ? "You" : seat.profile.alias;
  };
  return Object.fromEntries(
    Object.entries(state.intelligence.reports[uid] ?? {}).map(
      ([starId, record]) => {
        const [
          observedTick,
          source,
          orbit,
          surface,
          fighters,
          infantry,
          markets,
          camps,
          bases,
          stations,
        ] = record;
        if (source !== -2 && !state.galaxy.stars[source])
          throw new Error("Invalid observation source");
        return [
          starId,
          {
            observedTick,
            sourceStarId: source === -2 ? null : state.galaxy.stars[source].id,
            orbit: owner(orbit),
            surface: owner(surface),
            fighters,
            infantry,
            markets,
            camps,
            bases,
            stations,
          },
        ];
      },
    ),
  );
}

// Reserve a complete future report table before admitting more queued work.
// 600 KB of canonical UTF-8 leaves room for base64/envelope metadata and tick
// ledger growth below Firestore's document limit. This does not truncate reports.
export function assertObservationBudget(
  state: Campaign,
  releasingFleetStorage = false,
) {
  if (state.intelligenceVersion !== 1) return;
  const reports: Intelligence["reports"] = {},
    draws: Intelligence["draws"] = {};
  const maximum = [
    Number.MAX_SAFE_INTEGER,
    state.galaxy.stars.length - 1,
    state.capacity - 1,
    state.capacity - 1,
    rules.maximumUnitsPerPlayerPerType,
    rules.maximumUnitsPerPlayerPerType,
    ...Array(4).fill(
      rules.developmentTypeBaseCapacity + rules.maximumResearchLevel,
    ),
  ] as ObservationTuple;
  for (const seat of state.seats) {
    reports[seat.uid] = Object.fromEntries(
      state.galaxy.stars.map((star) => [star.id, maximum]),
    );
    draws[seat.uid] = state.galaxy.stars.map(() => drawRange - 1);
  }
  const reserved = {
    ...state,
    intelligence: { format: 1, tick: Number.MAX_SAFE_INTEGER, reports, draws },
  };
  // Route admission also reserves future departure/arrival reports. Traveling
  // fleets may encounter owners at their destination before the next command.
  let travelBytes = 0;
  if (state.travelVersion === 1) {
    const moving = Object.values(state.military?.fleets ?? {}).filter(
      (f) => f.travel,
    );
    const queued = (state.military?.orders ?? []).filter((o) => o.waypoints);
    const count = moving.length + queued.length;
    const encoder = new TextEncoder();
    for (const f of moving)
      travelBytes += 1024 + encoder.encode(JSON.stringify(f.id)).length;
    for (const o of queued)
      travelBytes += 1024 + encoder.encode(JSON.stringify(o.fleetId)).length;
    for (const seat of state.seats) {
      const owned = Object.values(state.systems).filter(
        (s) => s.orbit === seat.uid || s.surface === seat.uid,
      ).length;
      const ownRoutes =
        moving.filter((f) => f.uid === seat.uid).length +
        queued.filter((o) => o.uid === seat.uid).length;
      travelBytes += Math.min(count, owned + ownRoutes) * 1536;
    }
  }
  // Reserve the complete next-tick fleet draw matrix, including queued new
  // fleets. Current scans are replaced, never accumulated in canonical state.
  if (state.fleetContactsVersion === 1) {
    const count =
      Object.keys(state.military?.fleets ?? {}).length +
      (state.military?.orders ?? []).filter(
        (o) => o.fleetId === null || o.reorganization === "split",
      ).length;
    const maximumScans = {
      tick: Number.MAX_SAFE_INTEGER,
      levels: Object.fromEntries(
        state.seats.map((s) => [s.uid, rules.maximumResearchLevel]),
      ),
      draws: Object.fromEntries(
        state.seats.map((s) => [s.uid, Array(count).fill(drawRange - 1)]),
      ),
    };
    const encoder = new TextEncoder();
    const futureBytes = encoder.encode(
      JSON.stringify({ fleetScans: maximumScans }),
    ).byteLength;
    const priorBytes = state.fleetScans
      ? encoder.encode(JSON.stringify({ fleetScans: state.fleetScans }))
          .byteLength
      : 0;
    travelBytes += Math.max(0, futureBytes - priorBytes);
  }
  // Merging and disbanding must remain admissible at the ordinary state budget. Its orders
  // become smaller outcomes and remove persistent fleets at settlement. The
  // higher bound still fits the encrypted document and cannot admit new forces.
  if (
    new TextEncoder().encode(JSON.stringify(reserved)).byteLength +
      travelBytes >
    (releasingFleetStorage ? 700000 : 600000)
  )
    throw new Error("pending-work-capacity");
}
