import type { Campaign } from "./campaign.js";
import { detectionProbability, drawRange } from "./observations.js";
import { fleetPosition } from "./travel.js";
export interface FleetScans {
  tick: number;
  levels: Record<string, number>;
  draws: Record<string, Array<number | null>>;
}
export interface FleetContact {
  id: string;
  number: number;
  owner: string;
  observedTick: number;
  x: number;
  y: number;
  z: number;
  fighters: number;
  infantry: number;
}
function catalogue(state: Campaign) {
  return Object.values(state.military?.fleets ?? {}).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}
function sensorDistance(
  state: Campaign,
  uid: string,
  target: { x: number; y: number; z: number },
) {
  if (!state.economy) throw new Error("Missing contact scan clock");
  const origins = state.galaxy.stars
    .filter((s) => state.systems[s.id].orbit === uid)
    .map((s) => ({ x: s.x, y: s.y, z: s.z }));
  for (const fleet of catalogue(state).filter((f) => f.uid === uid))
    origins.push(fleetPosition(fleet, state.galaxy.stars, state.economy.tick));
  return origins.reduce(
    (nearest, p) =>
      Math.min(
        nearest,
        Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z),
      ),
    Infinity,
  );
}
/** Persist one domain-separated draw per observer/target, with frozen scan level.
 * Last-seen records live in the existing immutable recipient history, not an
 * ever-growing stale-contact cache in the canonical current document. */
export function acquireFleetScans(
  current: Campaign,
  next: Campaign,
  draw: (uid: string, target: string, tick: number) => number,
) {
  if (current.fleetContactsVersion === undefined) return;
  if (
    current.fleetContactsVersion !== 1 ||
    !current.economy ||
    !next.economy ||
    next.economy.tick !== current.economy.tick + 1
  )
    throw new Error("Invalid fleet scanning capability or tick");
  const targets = catalogue(next),
    tick = next.economy.tick;
  next.fleetScans = { tick, levels: {}, draws: {} };
  for (const { uid } of next.seats) {
    next.fleetScans.levels[uid] = current.economy.research[uid].levels.scanning;
    next.fleetScans.draws[uid] = targets.map((f) => {
      if (
        f.uid === uid ||
        !Number.isFinite(
          sensorDistance(next, uid, fleetPosition(f, next.galaxy.stars, tick)),
        )
      )
        return null;
      const roll = draw(uid, `fleet:${f.id}`, tick);
      if (!Number.isSafeInteger(roll) || roll < 0 || roll >= drawRange)
        throw new Error("Invalid fleet scan draw");
      return roll;
    });
  }
}
export function fleetContactView(
  state: Campaign,
  uid: string,
): FleetContact[] | null {
  if (state.fleetContactsVersion === undefined || !state.fleetScans)
    return null;
  if (
    state.fleetContactsVersion !== 1 ||
    state.fleetScans.tick !== state.economy?.tick
  )
    throw new Error("Invalid fleet scan version");
  const scans = state.fleetScans,
    targets = catalogue(state),
    draws = scans.draws[uid];
  if (!draws || draws.length !== targets.length)
    throw new Error("Incomplete fleet scans");
  const result: FleetContact[] = [];
  for (const [index, fleet] of targets.entries()) {
    const roll = draws[index];
    if (fleet.uid === uid || roll === null) continue;
    if (!Number.isSafeInteger(roll) || roll < 0 || roll >= drawRange)
      throw new Error("Invalid persisted fleet scan draw");
    const position = fleetPosition(fleet, state.galaxy.stars, scans.tick),
      distance = sensorDistance(state, uid, position);
    if (
      !Number.isFinite(distance) ||
      roll / drawRange >= detectionProbability(scans.levels[uid], distance)
    )
      continue;
    const owner = state.seats.findIndex((s) => s.uid === fleet.uid);
    if (owner < 0) throw new Error("Unknown fleet owner");
    result.push({
      id: `${owner}:${fleet.number}`,
      number: fleet.number,
      owner: state.seats[owner].profile.alias,
      observedTick: scans.tick,
      ...position,
      fighters: fleet.fighters,
      infantry: fleet.infantry,
    });
  }
  return result;
}
/** Select last observed facts only from records this recipient actually loaded. */
export function lastFleetContacts(
  records: Array<{ fleetContacts?: FleetContact[] | null }>,
) {
  const contacts = new Map<string, FleetContact>();
  for (const record of records)
    for (const contact of record.fleetContacts ?? []) {
      const prior = contacts.get(contact.id);
      if (!prior || prior.observedTick < contact.observedTick)
        contacts.set(contact.id, contact);
    }
  return [...contacts.values()].sort(
    (a, b) => b.observedTick - a.observedTick || a.id.localeCompare(b.id),
  );
}
