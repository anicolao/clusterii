import type { Campaign } from "./campaign.js";
import { type Development, developments, futureTick } from "./construction.js";
import { rules } from "./rules.js";
export type Allocation = Record<Development, number>;
export interface FocusOrder {
  id: string;
  sequence: number;
  effectiveTick: number;
  allocation: Allocation;
}
export interface MarketFocus {
  allocation: Allocation;
  orders: FocusOrder[];
  lastApplied?: FocusOrder;
  appliedOrders?: FocusOrder[];
}
export function initialFocus(): MarketFocus {
  return { allocation: { ...rules.defaultFocus }, orders: [] };
}
export function validAllocation(value: unknown): value is Allocation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const values = value as Record<string, unknown>;
  return (
    Object.keys(values).length === developments.length &&
    developments.every(
      (type) =>
        Number.isSafeInteger(values[type]) &&
        (values[type] as number) >= 0 &&
        (values[type] as number) <= rules.focusPoints,
    ) &&
    developments.reduce((sum, type) => sum + (values[type] as number), 0) ===
      rules.focusPoints
  );
}
export function admitFocus(
  current: Campaign,
  uid: string,
  id: string,
  allocation: Allocation,
  now: number,
) {
  const economy = current.economy;
  if (!economy) throw new Error("focus-unavailable");
  economy.marketFocus ??= {};
  economy.marketFocus[uid] ??= initialFocus();
  const focus = economy.marketFocus[uid];
  if (focus.orders.length >= 64) throw new Error("focus-queue-full");
  focus.orders.push({
    id,
    sequence: current.revision,
    effectiveTick: futureTick(current, now),
    allocation: { ...allocation },
  });
}
export function settleFocus(campaign: Campaign) {
  const economy = campaign.economy;
  if (!economy) throw new Error("focus-unavailable");
  economy.marketFocus ??= {};
  for (const seat of campaign.seats) {
    economy.marketFocus[seat.uid] ??= initialFocus();
    const focus = economy.marketFocus[seat.uid];
    const due = focus.orders
      .filter((order) => order.effectiveTick <= economy.tick)
      .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
    focus.appliedOrders = due;
    for (const order of due) {
      focus.allocation = { ...order.allocation };
      focus.lastApplied = order;
    }
    focus.orders = focus.orders.filter(
      (order) => order.effectiveTick > economy.tick,
    );
  }
}
