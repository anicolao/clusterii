import type { Campaign } from "./campaign.js";
import { futureTick } from "./construction.js";
import { rules } from "./rules.js";
export interface Fleet {
  id: string;
  uid: string;
  starId: string;
  fighters: number;
  infantry: number;
  formedTick: number;
  number: number;
}
export type FleetAction =
  | {
      kind: "fleet.form";
      expectedRevision: number;
      starId: string;
      fighters: number;
      infantry: number;
    }
  | { kind: "fleet.disband"; expectedRevision: number; fleetId: string }
  | {
      kind: "fleet.load" | "fleet.unload";
      expectedRevision: number;
      fleetId: string;
      infantry: number;
    };
export interface FleetOrder {
  id: string;
  uid: string;
  sequence: number;
  effectiveTick: number;
  starId: string;
  fighters: number;
  infantry: number;
  fleetId: string | null;
  cargo?: "load" | "unload";
}
export interface FleetOutcome {
  id: string;
  starId: string;
  fleetId: string;
  result: "formed" | "disbanded" | "loaded" | "unloaded" | "invalid";
  fighters: number;
  infantry: number;
}
export interface Military {
  fleets: Record<string, Fleet>;
  orders: FleetOrder[];
  ledger: Record<string, FleetOutcome[]>;
}
export function fleetIdentity(uid: string, commandId: string) {
  return JSON.stringify([uid, commandId]);
}
export function reservedForces(state: Campaign, uid: string, starId: string) {
  const orders =
    state.military?.orders.filter(
      (o) =>
        o.uid === uid &&
        o.starId === starId &&
        (o.fleetId === null || o.cargo === "load"),
    ) ?? [];
  return orders.reduce(
    (sum, o) => ({
      fighters: sum.fighters + o.fighters,
      infantry: sum.infantry + o.infantry,
    }),
    { fighters: 0, infantry: 0 },
  );
}
export function stationedForces(state: Campaign, starId: string) {
  const local = state.systems[starId];
  return Object.values(state.military?.fleets ?? {})
    .filter((f) => f.starId === starId)
    .reduce(
      (sum, f) => ({
        fighters: sum.fighters + f.fighters,
        infantry: sum.infantry + f.infantry,
      }),
      { fighters: local.fighters, infantry: local.infantry },
    );
}
export function orderFleet(
  current: Campaign,
  raw: unknown,
  uid: string,
  id: string,
  now: number,
): Campaign {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("invalid");
  const a = raw as Record<string, unknown>;
  const keys =
    a.kind === "fleet.form"
      ? ["kind", "expectedRevision", "starId", "fighters", "infantry"]
      : a.kind === "fleet.disband"
        ? ["kind", "expectedRevision", "fleetId"]
        : a.kind === "fleet.load" || a.kind === "fleet.unload"
          ? ["kind", "expectedRevision", "fleetId", "infantry"]
          : [];
  if (
    !keys.length ||
    Object.keys(a).length !== keys.length ||
    Object.keys(a).some((k) => !keys.includes(k))
  )
    throw new Error("invalid");
  if (a.expectedRevision !== current.revision) throw new Error("conflict");
  if (!current.seats.some((s) => s.uid === uid)) throw new Error("permission");
  if (
    current.phase !== "active" ||
    current.schemaVersion !== 2 ||
    !current.economy
  )
    throw new Error("fleet-unavailable");
  if (current.pausedAt != null) throw new Error("paused");
  const next = structuredClone(current);
  next.military ??= { fleets: {}, orders: [], ledger: {} };
  const cargo =
    a.kind === "fleet.load"
      ? "load"
      : a.kind === "fleet.unload"
        ? "unload"
        : undefined;
  let starId: string,
    fighters: number,
    infantry: number,
    fleetId: string | null = null;
  if (a.kind === "fleet.form") {
    if (
      typeof a.starId !== "string" ||
      !Number.isSafeInteger(a.fighters) ||
      !Number.isSafeInteger(a.infantry)
    )
      throw new Error("invalid");
    starId = a.starId;
    fighters = a.fighters as number;
    infantry = a.infantry as number;
    if (
      fighters < 1 ||
      fighters > rules.maximumUnitsPerPlayerPerType ||
      infantry < 0 ||
      infantry > rules.maximumUnitsPerPlayerPerType ||
      infantry > fighters * rules.infantryCapacityPerFighter
    )
      throw new Error("fleet-capacity");
    const system = next.systems[starId];
    if (
      !system ||
      system.orbit !== uid ||
      (infantry > 0 && system.surface !== uid)
    )
      throw new Error("permission");
    const reserved = reservedForces(next, uid, starId);
    if (
      fighters > system.fighters - reserved.fighters ||
      infantry > system.infantry - reserved.infantry
    )
      throw new Error("insufficient-forces");
    const count =
      Object.values(next.military.fleets).filter((f) => f.uid === uid).length +
      next.military.orders.filter((o) => o.uid === uid && o.fleetId === null)
        .length;
    if (count >= rules.maximumFleetsPerPlayer) throw new Error("fleet-limit");
  } else {
    if (typeof a.fleetId !== "string") throw new Error("invalid");
    const fleet = next.military.fleets[a.fleetId];
    if (!fleet || fleet.uid !== uid) throw new Error("permission");
    ({ starId, fighters, infantry } = fleet);
    fleetId = fleet.id;
    const system = next.systems[starId];
    if (
      system.orbit !== uid ||
      ((cargo || infantry > 0) && system.surface !== uid)
    )
      throw new Error("permission");
    if (cargo) {
      if (
        !Number.isSafeInteger(a.infantry) ||
        (a.infantry as number) < 1 ||
        (a.infantry as number) > rules.maximumUnitsPerPlayerPerType
      )
        throw new Error("invalid");
      fighters = 0;
      infantry = a.infantry as number;
      if (cargo === "load") {
        if (
          fleet.infantry + infantry >
          fleet.fighters * rules.infantryCapacityPerFighter
        )
          throw new Error("fleet-capacity");
        if (
          infantry >
          system.infantry - reservedForces(next, uid, starId).infantry
        )
          throw new Error("insufficient-forces");
      } else if (infantry > fleet.infantry)
        throw new Error("insufficient-forces");
    }
    if (next.military.orders.some((o) => o.fleetId === fleetId))
      throw new Error("fleet-order-pending");
  }
  next.revision++;
  next.military.orders.push({
    id,
    uid,
    sequence: next.revision,
    effectiveTick: futureTick(next, now),
    starId,
    fighters,
    infantry,
    fleetId,
    ...(cargo ? { cargo } : {}),
  });
  return next;
}
export function settleFleets(state: Campaign, tick: number) {
  const military = state.military;
  if (!military) return;
  military.ledger = {};
  const due = military.orders
    .filter((o) => o.effectiveTick <= tick)
    .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
  for (const order of due) {
    const system = state.systems[order.starId];
    let valid =
      system.orbit === order.uid &&
      (order.infantry === 0 || system.surface === order.uid);
    if (order.fleetId === null) {
      valid =
        valid &&
        system.fighters >= order.fighters &&
        system.infantry >= order.infantry;
      if (valid) {
        system.fighters -= order.fighters;
        system.infantry -= order.infantry;
        military.fleets[fleetIdentity(order.uid, order.id)] = {
          id: fleetIdentity(order.uid, order.id),
          uid: order.uid,
          starId: order.starId,
          fighters: order.fighters,
          infantry: order.infantry,
          formedTick: tick,
          number: order.sequence,
        };
      }
    } else {
      const fleet = military.fleets[order.fleetId];
      valid =
        valid &&
        !!fleet &&
        fleet.uid === order.uid &&
        fleet.starId === order.starId;
      if (order.cargo) {
        valid =
          valid &&
          (order.cargo === "load"
            ? system.infantry >= order.infantry &&
              fleet.infantry + order.infantry <=
                fleet.fighters * rules.infantryCapacityPerFighter
            : fleet.infantry >= order.infantry);
        if (valid) {
          const delta =
            order.cargo === "load" ? order.infantry : -order.infantry;
          fleet.infantry += delta;
          system.infantry -= delta;
        }
      } else {
        valid =
          valid &&
          fleet.fighters === order.fighters &&
          fleet.infantry === order.infantry;
        if (valid) {
          system.fighters += fleet.fighters;
          system.infantry += fleet.infantry;
          delete military.fleets[fleet.id];
        }
      }
    }
    military.ledger[order.uid] ??= [];
    military.ledger[order.uid].push({
      id: order.id,
      starId: order.starId,
      fleetId: order.fleetId ?? fleetIdentity(order.uid, order.id),
      result: valid
        ? order.cargo === "load"
          ? "loaded"
          : order.cargo === "unload"
            ? "unloaded"
            : order.fleetId === null
              ? "formed"
              : "disbanded"
        : "invalid",
      fighters: order.fighters,
      infantry: order.infantry,
    });
  }
  military.orders = military.orders.filter((o) => o.effectiveTick > tick);
}
export function militaryView(state: Campaign, uid: string) {
  if (state.schemaVersion !== 2 || !state.economy) return null;
  return {
    fleets: Object.values(state.military?.fleets ?? {})
      .filter((f) => f.uid === uid)
      .map(({ id, starId, fighters, infantry, formedTick, number }) => ({
        id,
        starId,
        fighters,
        infantry,
        formedTick,
        number,
      })),
    orders: (state.military?.orders ?? [])
      .filter((o) => o.uid === uid)
      .map(
        ({
          id,
          starId,
          fighters,
          infantry,
          fleetId,
          effectiveTick,
          cargo,
        }) => ({
          id,
          starId,
          fighters,
          infantry,
          fleetId,
          effectiveTick,
          ...(cargo ? { cargo } : {}),
        }),
      ),
    ledger: structuredClone(state.military?.ledger[uid] ?? []),
  };
}
