import type { Campaign } from "./campaign.js";
import { futureTick } from "./construction.js";
import { rules } from "./rules.js";
import type { ArrivalReport, TravelPlan } from "./travel.js";
export interface Fleet {
  id: string;
  uid: string;
  starId: string;
  fighters: number;
  infantry: number;
  formedTick: number;
  number: number;
  travel?: TravelPlan;
}
export type FleetAction =
  | { kind: "fleet.cancel"; expectedRevision: number; orderId: string }
  | {
      kind: "fleet.form";
      expectedRevision: number;
      starId: string;
      fighters: number;
      infantry: number;
    }
  | { kind: "fleet.disband"; expectedRevision: number; fleetId: string }
  | {
      kind: "fleet.split";
      expectedRevision: number;
      fleetId: string;
      fighters: number;
      infantry: number;
    }
  | {
      kind: "fleet.merge";
      expectedRevision: number;
      fleetId: string;
      targetFleetId: string;
    }
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
  reorganization?: "split" | "merge";
  targetFleetId?: string;
  waypoints?: string[];
}
export interface FleetOutcome {
  id: string;
  starId: string;
  fleetId: string;
  result:
    | "formed"
    | "disbanded"
    | "loaded"
    | "unloaded"
    | "split"
    | "merged"
    | "invalid"
    | "departed"
    | "arrived"
    | "destroyed"
    | "halted";
  fighters: number;
  infantry: number;
  targetFleetId?: string;
}
export interface Military {
  fleets: Record<string, Fleet>;
  orders: FleetOrder[];
  ledger: Record<string, FleetOutcome[]>;
  arrivals?: Record<string, ArrivalReport[]>;
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
    .filter((f) => f.starId === starId && f.travel?.status !== "traveling")
    .reduce(
      (sum, f) => ({
        fighters: sum.fighters + f.fighters,
        infantry: sum.infantry + f.infantry,
      }),
      { fighters: local.fighters, infantry: local.infantry },
    );
}
export function canSplit(
  fleet: Pick<Fleet, "fighters" | "infantry">,
  fighters: number,
  infantry: number,
) {
  return (
    Number.isSafeInteger(fighters) &&
    Number.isSafeInteger(infantry) &&
    fighters >= 1 &&
    fighters < fleet.fighters &&
    infantry >= 0 &&
    infantry <= fleet.infantry &&
    infantry <= fighters * rules.infantryCapacityPerFighter &&
    fleet.infantry - infantry <=
      (fleet.fighters - fighters) * rules.infantryCapacityPerFighter
  );
}
function canMerge(source: Fleet, target: Fleet) {
  return (
    source.fighters + target.fighters <= rules.maximumUnitsPerPlayerPerType &&
    source.infantry + target.infantry <= rules.maximumUnitsPerPlayerPerType &&
    source.infantry + target.infantry <=
      (source.fighters + target.fighters) * rules.infantryCapacityPerFighter
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
          : a.kind === "fleet.split"
            ? ["kind", "expectedRevision", "fleetId", "fighters", "infantry"]
            : a.kind === "fleet.merge"
              ? ["kind", "expectedRevision", "fleetId", "targetFleetId"]
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
  const reorganization =
    a.kind === "fleet.split"
      ? "split"
      : a.kind === "fleet.merge"
        ? "merge"
        : undefined;
  let targetFleetId: string | undefined;
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
      next.military.orders.filter(
        (o) =>
          o.uid === uid && (o.fleetId === null || o.reorganization === "split"),
      ).length;
    if (count >= rules.maximumFleetsPerPlayer) throw new Error("fleet-limit");
  } else {
    if (typeof a.fleetId !== "string") throw new Error("invalid");
    const fleet = next.military.fleets[a.fleetId];
    if (!fleet || fleet.uid !== uid) throw new Error("permission");
    if (fleet.travel) throw new Error("fleet-traveling");
    ({ starId, fighters, infantry } = fleet);
    fleetId = fleet.id;
    const system = next.systems[starId];
    if (
      system.orbit !== uid ||
      (!reorganization && (cargo || infantry > 0) && system.surface !== uid)
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
    const { orders } = next.military;
    const pending = (candidate: string) =>
      orders.some(
        (o) => o.fleetId === candidate || o.targetFleetId === candidate,
      );
    if (pending(fleetId)) throw new Error("fleet-order-pending");
    if (reorganization === "split") {
      if (
        !Number.isSafeInteger(a.fighters) ||
        !Number.isSafeInteger(a.infantry)
      )
        throw new Error("invalid");
      fighters = a.fighters as number;
      infantry = a.infantry as number;
      if (!canSplit(fleet, fighters, infantry))
        throw new Error("fleet-capacity");
      const count =
        Object.values(next.military.fleets).filter((f) => f.uid === uid)
          .length +
        next.military.orders.filter(
          (o) =>
            o.uid === uid &&
            (o.fleetId === null || o.reorganization === "split"),
        ).length;
      if (count >= rules.maximumFleetsPerPlayer) throw new Error("fleet-limit");
    } else if (reorganization === "merge") {
      if (typeof a.targetFleetId !== "string" || a.targetFleetId === fleetId)
        throw new Error("invalid");
      const target = next.military.fleets[a.targetFleetId];
      if (!target || target.uid !== uid || target.starId !== starId)
        throw new Error("permission");
      if (target.travel) throw new Error("fleet-traveling");
      if (pending(target.id)) throw new Error("fleet-order-pending");
      if (!canMerge(fleet, target)) throw new Error("fleet-capacity");
      targetFleetId = target.id;
    }
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
    ...(reorganization ? { reorganization } : {}),
    ...(targetFleetId ? { targetFleetId } : {}),
  });
  return next;
}
export function settleFleets(state: Campaign, tick: number) {
  const military = state.military;
  if (!military) return;
  military.ledger = {};
  const due = military.orders
    .filter((o) => !o.waypoints && o.effectiveTick <= tick)
    .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
  for (const order of due) {
    const system = state.systems[order.starId];
    let valid =
      system.orbit === order.uid &&
      (!!order.reorganization ||
        order.infantry === 0 ||
        system.surface === order.uid);
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
      if (order.reorganization === "split") {
        valid =
          valid &&
          canSplit(fleet, order.fighters, order.infantry) &&
          Object.values(military.fleets).filter((f) => f.uid === order.uid)
            .length < rules.maximumFleetsPerPlayer;
        if (valid) {
          fleet.fighters -= order.fighters;
          fleet.infantry -= order.infantry;
          const id = fleetIdentity(order.uid, order.id);
          military.fleets[id] = {
            id,
            uid: order.uid,
            starId: order.starId,
            fighters: order.fighters,
            infantry: order.infantry,
            formedTick: tick,
            number: order.sequence,
          };
        }
      } else if (order.reorganization === "merge") {
        const target = order.targetFleetId
          ? military.fleets[order.targetFleetId]
          : undefined;
        valid =
          valid &&
          !!target &&
          target.id !== fleet.id &&
          target.uid === order.uid &&
          target.starId === order.starId &&
          fleet.fighters === order.fighters &&
          fleet.infantry === order.infantry &&
          canMerge(fleet, target);
        if (valid && target) {
          target.fighters += fleet.fighters;
          target.infantry += fleet.infantry;
          delete military.fleets[fleet.id];
        }
      } else if (order.cargo) {
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
        ? order.reorganization === "split"
          ? "split"
          : order.reorganization === "merge"
            ? "merged"
            : order.cargo === "load"
              ? "loaded"
              : order.cargo === "unload"
                ? "unloaded"
                : order.fleetId === null
                  ? "formed"
                  : "disbanded"
        : "invalid",
      fighters: order.fighters,
      infantry: order.infantry,
      ...(order.reorganization === "split"
        ? { targetFleetId: fleetIdentity(order.uid, order.id) }
        : order.targetFleetId
          ? { targetFleetId: order.targetFleetId }
          : {}),
    });
  }
  military.orders = military.orders.filter(
    (o) => !!o.waypoints || o.effectiveTick > tick,
  );
}
export function militaryView(state: Campaign, uid: string) {
  if (state.schemaVersion !== 2 || !state.economy) return null;
  return {
    fleets: Object.values(state.military?.fleets ?? {})
      .filter((f) => f.uid === uid)
      .map(
        ({ id, starId, fighters, infantry, formedTick, number, travel }) => ({
          id,
          starId,
          fighters,
          infantry,
          formedTick,
          number,
          ...(travel ? { travel: structuredClone(travel) } : {}),
        }),
      ),
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
          reorganization,
          targetFleetId,
          waypoints,
        }) => ({
          id,
          starId,
          fighters,
          infantry,
          fleetId,
          effectiveTick,
          ...(cargo ? { cargo } : {}),
          ...(reorganization ? { reorganization } : {}),
          ...(targetFleetId ? { targetFleetId } : {}),
          ...(waypoints ? { waypoints: [...waypoints] } : {}),
        }),
      ),
    ledger: structuredClone(state.military?.ledger[uid] ?? []),
    ...(state.military?.arrivals?.[uid]?.length
      ? { arrivals: structuredClone(state.military.arrivals[uid]) }
      : {}),
  };
}

/** Cancel only an owned order whose authoritative admission cutoff is still open. */
export function cancelFleet(
  current: Campaign,
  raw: unknown,
  uid: string,
  now: number,
): Campaign {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("invalid");
  const a = raw as Record<string, unknown>;
  const keys = ["kind", "expectedRevision", "orderId"];
  if (
    a.kind !== "fleet.cancel" ||
    Object.keys(a).length !== keys.length ||
    Object.keys(a).some((k) => !keys.includes(k)) ||
    typeof a.orderId !== "string"
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
  const order = current.military?.orders.find(
    (o) => o.uid === uid && o.id === a.orderId,
  );
  if (!order) throw new Error("fleet-order-unavailable");
  // A delayed scheduler does not extend the cancellation window. At the exact
  // cutoff futureTick advances past this order, even before settlement runs.
  if (order.effectiveTick < futureTick(current, now))
    throw new Error("fleet-order-closed");
  const next = structuredClone(current);
  if (!next.military) throw new Error("fleet-order-unavailable");
  next.military.orders = next.military.orders.filter(
    (o) => !(o.uid === uid && o.id === a.orderId),
  );
  next.revision++;
  return next;
}
