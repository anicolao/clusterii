import type { Campaign } from "./campaign.js";
import { rules } from "./rules.js";
export type Development = keyof typeof rules.developments;
export type Layer = "orbit" | "surface";
export const developments = Object.keys(rules.developments) as Development[];
export const developmentField = {
  market: "markets",
  camp: "camps",
  base: "bases",
  station: "stations",
} as const;
export interface BuildOrder {
  id: string;
  uid: string;
  starId: string;
  type: Development;
  sequence: number;
  effectiveTick: number;
  paidMilli: number;
  executedTick: number | null;
  startedTick: number | null;
  progress: number;
}
export interface CancelOrder {
  id: string;
  uid: string;
  orderId: string;
  sequence: number;
  effectiveTick: number;
}
export interface BuildEvent {
  id: string;
  starId: string;
  type: Development;
  result: "completed" | "cancelled" | "captured" | "invalid";
  paidMilli: number;
  refundMilli: number;
}
export interface Construction {
  orders: BuildOrder[];
  cancellations: CancelOrder[];
  ledger: Record<string, BuildEvent[]>;
}
export function buildCost(type: Development, count: number) {
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count > rules.developmentTypeBaseCapacity + rules.maximumResearchLevel
  )
    throw new Error("invalid");
  const denominator = 20n ** BigInt(count),
    numerator =
      BigInt(rules.developments[type].baseCost) * 23n ** BigInt(count);
  return Number((numerator + denominator - 1n) / denominator) * 1000;
}
export function futureTick(campaign: Campaign, now: number) {
  const clock = campaign.economy;
  if (!clock) throw new Error("construction-unavailable");
  return (
    clock.tick +
    1 +
    (now < clock.nextTickAt
      ? 0
      : Math.floor((now - clock.nextTickAt) / (rules.tickSeconds * 1000)) + 1)
  );
}
export function layer(type: Development): Layer {
  return rules.developments[type].layer as Layer;
}
export function constructionCount(
  campaign: Campaign,
  starId: string,
  type: Development,
) {
  return (
    campaign.systems[starId][developmentField[type]] +
    (campaign.construction?.orders.filter(
      (o) => o.starId === starId && o.type === type,
    ).length ?? 0)
  );
}
export function admitBuild(
  current: Campaign,
  uid: string,
  id: string,
  sequence: number,
  now: number,
  starId: string,
  type: Development,
) {
  const system = current.systems[starId];
  if (!system || system[layer(type)] !== uid) throw new Error("permission");
  const research = current.economy?.research[uid];
  if (!research) throw new Error("construction-unavailable");
  const count = constructionCount(current, starId, type),
    capacity = rules.developmentTypeBaseCapacity + research.levels.terraforming;
  if (count >= capacity) throw new Error("construction-capacity");
  if (
    (current.construction?.orders.filter(
      (o) => o.starId === starId && layer(o.type) === layer(type),
    ).length ?? 0) >= rules.constructionQueuePerLayer
  )
    throw new Error("construction-queue-full");
  const paidMilli = buildCost(type, count);
  if (current.empires[uid].creditsMilli < paidMilli)
    throw new Error("insufficient-credits");
  current.construction ??= { orders: [], cancellations: [], ledger: {} };
  current.empires[uid].creditsMilli -= paidMilli;
  current.construction.orders.push({
    id,
    uid,
    starId,
    type,
    sequence,
    effectiveTick: futureTick(current, now),
    paidMilli,
    executedTick: null,
    startedTick: null,
    progress: 0,
  });
}
export function admitCancellation(
  current: Campaign,
  uid: string,
  id: string,
  sequence: number,
  now: number,
  orderId: string,
) {
  const construction = current.construction;
  if (!construction) throw new Error("permission");
  const order = construction.orders.find((o) => o.id === orderId);
  if (
    !order ||
    order.uid !== uid ||
    current.systems[order.starId][layer(order.type)] !== uid
  )
    throw new Error("permission");
  if (construction.cancellations.some((c) => c.orderId === orderId))
    throw new Error("cancellation-pending");
  construction.cancellations.push({
    id,
    uid,
    orderId,
    sequence,
    effectiveTick: futureTick(current, now),
  });
}
export function settleConstruction(
  campaign: Campaign,
  tick: number,
): BuildOrder[] {
  const construction = campaign.construction;
  if (!construction) return [];
  construction.ledger = {};
  const completed: BuildOrder[] = [];
  const finish = (
    order: BuildOrder,
    result: BuildEvent["result"],
    refundMilli: number,
  ) => {
    const balance = campaign.empires[order.uid].creditsMilli + refundMilli;
    if (!Number.isSafeInteger(balance))
      throw new Error("Construction balance overflow");
    campaign.empires[order.uid].creditsMilli = balance;
    construction.ledger[order.uid] ??= [];
    construction.ledger[order.uid].push({
      id: order.id,
      starId: order.starId,
      type: order.type,
      result,
      paidMilli: order.paidMilli,
      refundMilli,
    });
    construction.orders = construction.orders.filter((o) => o.id !== order.id);
  };
  const commands = [
    ...construction.orders
      .filter((o) => o.executedTick === null && o.effectiveTick <= tick)
      .map((o) => ({ sequence: o.sequence, id: o.id, build: o, cancel: null })),
    ...construction.cancellations
      .filter((c) => c.effectiveTick <= tick)
      .map((c) => ({ sequence: c.sequence, id: c.id, build: null, cancel: c })),
  ].sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
  for (const command of commands) {
    if (command.build) {
      const order = command.build,
        system = campaign.systems[order.starId];
      if (!construction.orders.includes(order)) continue;
      const research = campaign.economy?.research[order.uid];
      if (!research) throw new Error("Missing construction research");
      const capacity =
        rules.developmentTypeBaseCapacity + research.levels.terraforming;
      if (
        system[layer(order.type)] !== order.uid ||
        system[developmentField[order.type]] >= capacity
      ) {
        finish(order, "invalid", order.paidMilli);
        continue;
      }
      order.executedTick = tick; // Eligible orders wait in their serial layer queue.
    } else if (command.cancel) {
      const cancel = command.cancel;
      const order = construction.orders.find((o) => o.id === cancel.orderId);
      if (
        order &&
        order.uid === command.cancel.uid &&
        campaign.systems[order.starId][layer(order.type)] === order.uid
      )
        finish(
          order,
          "cancelled",
          order.progress ? Math.floor(order.paidMilli / 2) : order.paidMilli,
        );
    }
  }
  construction.cancellations = construction.cancellations.filter(
    (c) =>
      c.effectiveTick > tick &&
      construction.orders.some((o) => o.id === c.orderId),
  );
  const queues = new Map<string, BuildOrder[]>();
  for (const order of [...construction.orders].sort(
    (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
  )) {
    if (order.effectiveTick > tick) continue;
    if (campaign.systems[order.starId][layer(order.type)] !== order.uid) {
      finish(order, "captured", 0);
      continue;
    }
    const key = `${order.starId}:${layer(order.type)}`;
    const queue = queues.get(key) ?? [];
    queue.push(order);
    queues.set(key, queue);
  }
  for (const queue of queues.values()) {
    const order = queue[0];
    if (order.startedTick === null) order.startedTick = tick;
    else if (order.startedTick < tick) {
      order.progress++;
      if (order.progress === rules.developments[order.type].buildTicks) {
        campaign.systems[order.starId][developmentField[order.type]]++;
        completed.push(order);
        finish(order, "completed", 0);
        if (queue[1]) queue[1].startedTick = tick;
      }
    }
  }
  return completed;
}
