import type { Campaign } from "./campaign.js";
import { futureTick } from "./construction.js";
import type { Fleet } from "./fleets.js";
import { distance, type Star } from "./galaxy.js";
import { rules } from "./rules.js";

export interface ArrivalReport {
  starId: string;
  tick: number;
  order: number[];
  contested: boolean;
  fightersBefore: number;
  fightersAfter: number;
  infantryBefore: number;
  infantryAfter: number;
  orbit: number;
  surface: number;
  detail?: {
    format: 1;
    orbitBefore: number;
    surfaceBefore: number;
    formations: number;
    melee: number;
    carriedBefore: number;
    transportLosses: number;
    landed: number;
    groundLosses: number;
    groundBefore: number;
    groundAfter: number;
    releasedEscrowMilli?: number;
  };
}
export interface TravelPlan {
  commandId: string;
  waypoints: string[];
  leg: number;
  from: string;
  to: string;
  departureTick: number;
  arrivalTick: number;
  status: "traveling" | "waypoint";
}
export type TravelAction = {
  kind: "fleet.route";
  expectedRevision: number;
  fleetId: string;
  waypoints: string[];
};
export function routePreview(
  stars: Star[],
  origin: string,
  waypoints: string[],
  navigation: number,
) {
  if (
    !waypoints.length ||
    waypoints.length > rules.maximumWaypoints ||
    waypoints.at(-1) === origin
  )
    throw new Error("route-invalid");
  const byId = new Map(stars.map((s) => [s.id, s]));
  const initial = byId.get(origin);
  if (!initial) throw new Error("route-invalid");
  let from: Star = initial;
  return waypoints.map((id) => {
    const to = byId.get(id);
    if (!to || to.id === from.id) throw new Error("route-invalid");
    const length = distance(from, to);
    const leg = {
      from: from.id,
      to: to.id,
      distanceLy: length,
      ticks: Math.max(1, Math.ceil(length / rules.fleetSpeedLyPerTick)),
      reachable: length <= navigation * rules.navigationLyPerLevel,
    };
    from = to;
    return leg;
  });
}
export function fleetPosition(
  fleet: Pick<Fleet, "starId" | "travel">,
  stars: Star[],
  tick: number,
) {
  const origin = stars.find(
    (s) =>
      s.id ===
      (fleet.travel?.status === "traveling" ? fleet.travel.from : fleet.starId),
  );
  if (!origin) throw new Error("route-invalid");
  const plan = fleet.travel;
  if (!plan || plan.status !== "traveling")
    return { x: origin.x, y: origin.y, z: origin.z };
  const target = stars.find((s) => s.id === plan.to);
  if (!target) throw new Error("route-invalid");
  const fraction = Math.max(
    0,
    Math.min(
      1,
      (tick - plan.departureTick) / (plan.arrivalTick - plan.departureTick),
    ),
  );
  return {
    x: origin.x + (target.x - origin.x) * fraction,
    y: origin.y + (target.y - origin.y) * fraction,
    z: origin.z + (target.z - origin.z) * fraction,
  };
}
export function orderRoute(
  current: Campaign,
  raw: unknown,
  uid: string,
  id: string,
  now: number,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("invalid");
  const a = raw as Record<string, unknown>,
    keys = ["kind", "expectedRevision", "fleetId", "waypoints"];
  if (
    a.kind !== "fleet.route" ||
    Object.keys(a).length !== keys.length ||
    Object.keys(a).some((k) => !keys.includes(k)) ||
    typeof a.fleetId !== "string" ||
    !Array.isArray(a.waypoints) ||
    a.waypoints.some((w) => typeof w !== "string")
  )
    throw new Error("invalid");
  if (a.expectedRevision !== current.revision) throw new Error("conflict");
  if (!current.seats.some((s) => s.uid === uid)) throw new Error("permission");
  if (
    current.phase !== "active" ||
    current.schemaVersion !== 2 ||
    !current.economy ||
    current.travelVersion !== 1
  )
    throw new Error("travel-unavailable");
  if (current.pausedAt != null) throw new Error("paused");
  const fleet = current.military?.fleets[a.fleetId];
  if (
    !fleet ||
    fleet.uid !== uid ||
    current.systems[fleet.starId].orbit !== uid
  )
    throw new Error("permission");
  if (fleet.travel?.status === "traveling") throw new Error("fleet-traveling");
  if (fleet.travel && fleet.travel.arrivalTick + 1 < futureTick(current, now))
    throw new Error("fleet-order-closed");
  if (
    current.military?.orders.some(
      (o) => o.fleetId === fleet.id || o.targetFleetId === fleet.id,
    )
  )
    throw new Error("fleet-order-pending");
  const waypoints = a.waypoints as string[];
  const preview = routePreview(
    current.galaxy.stars,
    fleet.starId,
    waypoints,
    current.economy.research[uid].levels.navigation,
  );
  if (preview.some((leg) => !leg.reachable)) throw new Error("route-range");
  const next = structuredClone(current);
  if (!next.military) throw new Error("fleet-unavailable");
  delete next.military.fleets[fleet.id].travel;
  next.revision++;
  next.military.orders.push({
    id,
    uid,
    sequence: next.revision,
    effectiveTick: futureTick(next, now),
    starId: fleet.starId,
    fleetId: fleet.id,
    fighters: fleet.fighters,
    infantry: fleet.infantry,
    waypoints: [...waypoints],
  });
  return next;
}
export type ArrivalRank = (starId: string, uid: string, tick: number) => number;
// Exact integer square root avoids floating-point rounding at combat boundaries.
export function integerRoot(n: bigint) {
  if (n < 0n) throw new Error("negative square root");
  if (n < 2n) return n;
  let x = n,
    y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}
export function orbitSurvivors(
  a: number,
  b: number,
  alpha: number,
  beta: number,
) {
  const delta =
    BigInt(alpha) * BigInt(a) ** 2n - BigInt(beta) * BigInt(b) ** 2n;
  return delta > 0n
    ? [Number(integerRoot(delta / BigInt(alpha))), 0]
    : delta < 0n
      ? [0, Number(integerRoot(-delta / BigInt(beta)))]
      : [0, 0];
}
export function groundSurvivors(
  a: number,
  d: number,
  attack: number,
  defence: number,
) {
  if (!a || !d) return [a, d];
  const q = Math.ceil(a / defence),
    r = Math.ceil(d / attack);
  return r < q ? [a - r * defence, 0] : [0, d - (q - 1) * attack];
}
function distribute(total: number, weights: { id: string; units: number }[]) {
  const sum = weights.reduce((n, w) => n + w.units, 0);
  if (!sum) return new Map(weights.map((w) => [w.id, 0]));
  const shares = weights
    .map((w) => ({
      id: w.id,
      amount: Number((BigInt(total) * BigInt(w.units)) / BigInt(sum)),
      remainder: (BigInt(total) * BigInt(w.units)) % BigInt(sum),
    }))
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.id.localeCompare(b.id)
        : a.remainder > b.remainder
          ? -1
          : 1,
    );
  let extra = total - shares.reduce((n, w) => n + w.amount, 0);
  for (const w of shares) if (extra-- > 0) w.amount++;
  return new Map(shares.map((w) => [w.id, w.amount]));
}
function outcome(
  state: Campaign,
  fleet: Fleet,
  id: string,
  result: "departed" | "arrived" | "destroyed" | "halted",
  starId = fleet.starId,
) {
  if (!state.military) return;
  state.military.ledger[fleet.uid] ??= [];
  state.military.ledger[fleet.uid].push({
    id,
    starId,
    fleetId: fleet.id,
    result,
    fighters: fleet.fighters,
    infantry: fleet.infantry,
  });
}
function depart(state: Campaign, fleet: Fleet, plan: TravelPlan, tick: number) {
  const research = state.economy?.research[fleet.uid];
  if (!research) throw new Error("Missing navigation");
  const leg = routePreview(
    state.galaxy.stars,
    fleet.starId,
    [plan.waypoints[plan.leg]],
    research.levels.navigation,
  )[0];
  if (!leg.reachable || state.systems[fleet.starId].orbit !== fleet.uid) {
    outcome(state, fleet, plan.commandId, "halted");
    delete fleet.travel;
    return;
  }
  fleet.travel = {
    ...plan,
    from: fleet.starId,
    to: leg.to,
    departureTick: tick,
    arrivalTick: tick + leg.ticks,
    status: "traveling",
  };
  outcome(state, fleet, plan.commandId, "departed");
}
export function settleTravel(
  state: Campaign,
  tick: number,
  rank?: ArrivalRank,
) {
  if (state.travelVersion !== 1 || !state.military) return;
  const military = state.military;
  military.arrivals = {};
  const economy = state.economy;
  if (!economy) throw new Error("Missing travel economy");
  const due = military.orders
    .filter((o) => o.waypoints && o.effectiveTick <= tick)
    .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
  for (const o of due) {
    const waypoints = o.waypoints;
    if (!waypoints) throw new Error("Missing route waypoints");
    const fleet = o.fleetId ? military.fleets[o.fleetId] : undefined;
    if (
      !fleet ||
      fleet.uid !== o.uid ||
      fleet.starId !== o.starId ||
      fleet.fighters !== o.fighters ||
      fleet.infantry !== o.infantry ||
      fleet.travel?.status === "traveling"
    ) {
      military.ledger[o.uid] ??= [];
      military.ledger[o.uid].push({
        id: o.id,
        starId: o.starId,
        fleetId: o.fleetId ?? "",
        result: "invalid",
        fighters: o.fighters,
        infantry: o.infantry,
      });
      continue;
    }
    depart(
      state,
      fleet,
      {
        commandId: o.id,
        waypoints: waypoints,
        leg: 0,
        from: fleet.starId,
        to: waypoints[0],
        departureTick: tick,
        arrivalTick: tick,
        status: "waypoint",
      },
      tick,
    );
  }
  military.orders = military.orders.filter(
    (o) => !o.waypoints || o.effectiveTick > tick,
  );
  for (const fleet of Object.values(military.fleets)) {
    const plan = fleet.travel;
    if (plan?.status === "waypoint" && plan.arrivalTick < tick)
      depart(state, fleet, plan, tick);
  }
  const arrivals = new Map<string, Fleet[]>();
  for (const fleet of Object.values(military.fleets)) {
    const plan = fleet.travel;
    if (plan?.status === "traveling" && plan.arrivalTick <= tick) {
      fleet.starId = plan.to;
      plan.status = "waypoint";
      const group = arrivals.get(plan.to) ?? [];
      group.push(fleet);
      arrivals.set(plan.to, group);
    }
  }
  for (const [starId, arrived] of arrivals) {
    const system = state.systems[starId],
      fleets = Object.values(military.fleets).filter(
        (f) => f.starId === starId && f.travel?.status !== "traveling",
      ),
      uids = [
        ...new Set([
          ...fleets.map((f) => f.uid),
          ...(system.orbit ? [system.orbit] : []),
        ]),
      ];
    const participants = [
      ...new Set([...uids, ...(system.surface ? [system.surface] : [])]),
    ];
    const orbitBefore = state.seats.findIndex((s) => s.uid === system.orbit);
    const surfaceBefore = state.seats.findIndex(
      (s) => s.uid === system.surface,
    );
    const groundBefore = system.infantry;
    const carriedBefore = new Map(
      participants.map((uid) => [
        uid,
        fleets.filter((f) => f.uid === uid).reduce((n, f) => n + f.infantry, 0),
      ]),
    );
    const transportLosses = new Map<string, number>();
    let landed = 0;
    const beforeInfantry = new Map(
      participants.map((uid) => [
        uid,
        fleets
          .filter((f) => f.uid === uid)
          .reduce(
            (n, f) => n + f.infantry,
            system.surface === uid ? system.infantry : 0,
          ),
      ]),
    );
    const hostile = uids.length > 1;
    const hostileSurface =
      system.surface !== null && arrived.some((f) => f.uid !== system.surface);
    if (hostile && !rank)
      throw new Error("Authoritative arrival ordering required");
    const ordered = uids
      .map((uid) => ({
        uid,
        rank: hostile ? (rank ? rank(starId, uid, tick) : 0) : 0,
      }))
      .sort((a, b) => a.rank - b.rank || a.uid.localeCompare(b.uid));
    if (system.orbit) {
      const index = ordered.findIndex((e) => e.uid === system.orbit);
      ordered.unshift(...ordered.splice(index, 1));
    }
    const counts = new Map(
      uids.map((uid) => [
        uid,
        fleets
          .filter((f) => f.uid === uid)
          .reduce(
            (n, f) => n + f.fighters,
            system.orbit === uid ? system.fighters : 0,
          ),
      ]),
    );
    let winner: string | null = null,
      survivors = 0;
    for (const { uid } of ordered) {
      const size = counts.get(uid) ?? 0;
      if (!winner) {
        winner = uid;
        survivors = size;
        continue;
      }
      const [a, b] = orbitSurvivors(
        survivors,
        size,
        economy.research[winner].levels.formations,
        economy.research[uid].levels.formations,
      );
      if (a) {
        survivors = a;
      } else {
        winner = b ? uid : null;
        survivors = b;
      }
    }
    for (const uid of uids) {
      const own = fleets.filter((f) => f.uid === uid);
      const weights = [
        ...own.map((f) => ({ id: f.id, units: f.fighters })),
        ...(system.orbit === uid
          ? [{ id: "system", units: system.fighters }]
          : []),
      ];
      const share = distribute(uid === winner ? survivors : 0, weights);
      if (system.orbit === uid) system.fighters = share.get("system") ?? 0;
      for (const f of own) {
        f.fighters = share.get(f.id) ?? 0;
        f.infantry = Math.min(
          f.infantry,
          f.fighters * rules.infantryCapacityPerFighter,
        );
      }
    }
    for (const uid of participants)
      transportLosses.set(
        uid,
        (carriedBefore.get(uid) ?? 0) -
          fleets
            .filter((f) => f.uid === uid)
            .reduce((n, f) => n + f.infantry, 0),
      );
    system.orbit = survivors > 0 ? winner : null;
    if (winner && survivors > 0 && system.surface !== winner) {
      const landers = fleets.filter((f) => f.uid === winner && f.fighters > 0),
        infantry = landers.reduce((n, f) => n + f.infantry, 0);
      if (infantry) {
        landed = infantry;
        const [a, d] = groundSurvivors(
          infantry,
          system.infantry,
          economy.research[winner].levels.melee,
          system.surface ? economy.research[system.surface].levels.melee : 1,
        );
        for (const f of landers) f.infantry = 0;
        if (a) {
          system.surface = winner;
          system.infantry = a;
        } else system.infantry = d;
      }
    }
    for (const f of fleets) {
      if (!f.fighters) {
        outcome(
          state,
          f,
          f.travel?.commandId ?? `combat:${tick}:${starId}`,
          "destroyed",
        );
        delete military.fleets[f.id];
      }
    }
    for (const uid of participants) {
      const own = Object.values(military.fleets).filter(
        (f) =>
          f.uid === uid &&
          f.starId === starId &&
          f.travel?.status !== "traveling",
      );
      const report: ArrivalReport = {
        starId,
        tick,
        order: ordered.map((e) =>
          state.seats.findIndex((s) => s.uid === e.uid),
        ),
        contested:
          hostile ||
          hostileSurface ||
          (beforeInfantry.get(uid) ?? 0) >
            own.reduce(
              (n, f) => n + f.infantry,
              system.surface === uid ? system.infantry : 0,
            ),
        fightersBefore: counts.get(uid) ?? 0,
        fightersAfter: own.reduce(
          (n, f) => n + f.fighters,
          system.orbit === uid ? system.fighters : 0,
        ),
        infantryBefore: beforeInfantry.get(uid) ?? 0,
        infantryAfter: own.reduce(
          (n, f) => n + f.infantry,
          system.surface === uid ? system.infantry : 0,
        ),
        orbit: state.seats.findIndex((s) => s.uid === system.orbit),
        surface: state.seats.findIndex((s) => s.uid === system.surface),
        detail: {
          format: 1,
          orbitBefore,
          surfaceBefore,
          formations: economy.research[uid].levels.formations,
          melee: economy.research[uid].levels.melee,
          carriedBefore: carriedBefore.get(uid) ?? 0,
          transportLosses: transportLosses.get(uid) ?? 0,
          landed: uid === winner ? landed : 0,
          groundBefore:
            state.seats[surfaceBefore]?.uid === uid ? groundBefore : 0,
          groundAfter: system.surface === uid ? system.infantry : 0,
          groundLosses:
            state.seats[surfaceBefore]?.uid === uid
              ? groundBefore - (system.surface === uid ? system.infantry : 0)
              : uid === winner
                ? landed - (system.surface === uid ? system.infantry : 0)
                : 0,
        },
      };
      military.arrivals[uid] ??= [];
      military.arrivals[uid].push(report);
    }
    for (const f of arrived) {
      if (!military.fleets[f.id]) continue;
      const plan = f.travel;
      if (!plan) throw new Error("Missing arrival route");
      outcome(state, f, plan.commandId, "arrived");
      if (hostile || hostileSurface || plan.leg + 1 >= plan.waypoints.length)
        delete f.travel;
      else plan.leg++;
    }
  }
}
