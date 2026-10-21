import type { Campaign } from "./campaign.js";

export interface VisitCheckpoint {
  revision: number;
  tick: number;
  at: number;
}
export interface VisitAction {
  kind: "campaign.visit";
  expectedRevision: number;
  throughRevision: number;
}
export function visitReference(
  current: Campaign,
  raw: unknown,
  uid: string,
): number {
  if (current.briefingVersion !== 1) throw new Error("briefing-unavailable");
  if (!current.seats.some((seat) => seat.uid === uid))
    throw new Error("permission");
  if (current.phase !== "active") throw new Error("not-active");
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("visit-invalid");
  const action = raw as VisitAction;
  if (
    Object.keys(action).some(
      (key) => !["kind", "expectedRevision", "throughRevision"].includes(key),
    ) ||
    action.kind !== "campaign.visit" ||
    !Number.isSafeInteger(action.expectedRevision) ||
    action.expectedRevision < 1 ||
    action.expectedRevision > current.revision ||
    !Number.isSafeInteger(action.throughRevision) ||
    action.throughRevision < 1 ||
    action.throughRevision > action.expectedRevision
  )
    throw new Error("visit-invalid");
  return action.throughRevision;
}
export function acknowledgeVisit(
  current: Campaign,
  raw: unknown,
  uid: string,
  at: number,
  source: Campaign,
): Campaign {
  const revision = visitReference(current, raw, uid);
  if (
    source.id !== current.id ||
    source.revision !== revision ||
    source.phase !== "active" ||
    !source.seats.some((seat) => seat.uid === uid)
  )
    throw new Error("visit-invalid");
  // An older device acknowledges its own view without moving a later checkpoint back.
  if ((current.visits?.[uid]?.revision ?? 0) >= revision) return current;
  const next = structuredClone(current);
  next.visits ??= {};
  next.visits[uid] = { revision, tick: source.economy?.tick ?? 0, at };
  next.revision++;
  return next;
}
