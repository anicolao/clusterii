import type { Campaign } from "./campaign.js";
import { futureTick } from "./construction.js";
import { rules } from "./rules.js";

export interface CreditOffer {
  id: string;
  issuer: string;
  counterpart: string;
  giveMilli: number;
  requestMilli: number;
  expiresTick: number;
  createdTick: number;
  state: "open" | "accepted" | "withdrawing";
  effectiveTick: number | null;
  sequence: number;
}
export interface TradeOutcome extends CreditOffer {
  result: "settled" | "withdrawn" | "expired" | "failed";
  settledTick: number;
}
export interface Trades {
  offers: CreditOffer[];
  ledger: TradeOutcome[];
}
export type TradeAction =
  | {
      kind: "trade.offer";
      expectedRevision: number;
      seat: number;
      giveMilli: number;
      requestMilli: number;
    }
  | {
      kind: "trade.accept" | "trade.withdraw";
      expectedRevision: number;
      offerId: string;
    };
const amount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
function credit(campaign: Campaign, uid: string, milli: number) {
  const result = BigInt(campaign.empires[uid].creditsMilli) + BigInt(milli);
  if (result < 0n || result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("trade-balance");
  campaign.empires[uid].creditsMilli = Number(result);
}
export function reservedCredits(campaign: Campaign, uid: string): bigint {
  return (campaign.trades?.offers ?? []).reduce(
    (total, offer) =>
      total +
      (offer.issuer === uid ? BigInt(offer.giveMilli) : 0n) +
      (offer.counterpart === uid && offer.state === "accepted"
        ? BigInt(offer.requestMilli)
        : 0n),
    0n,
  );
}
// Reservations remain part of a wallet's representable balance. Production must
// not consume the numeric headroom required to return an outstanding reservation.
export function assertTradeBalances(campaign: Campaign) {
  for (const [uid, empire] of Object.entries(campaign.empires)) {
    if (
      BigInt(empire.creditsMilli) + reservedCredits(campaign, uid) >
      BigInt(Number.MAX_SAFE_INTEGER)
    )
      throw new Error("trade-balance");
  }
}
export function offerIdentity(seat: number, commandId: string) {
  return `offer:${seat}:${commandId}`;
}
export function exchange(
  current: Campaign,
  raw: unknown,
  uid: string,
  commandId: string,
  now: number,
): Campaign {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("trade-invalid");
  const a = raw as TradeAction;
  const keys =
    a.kind === "trade.offer"
      ? ["kind", "expectedRevision", "seat", "giveMilli", "requestMilli"]
      : ["kind", "expectedRevision", "offerId"];
  if (
    !["trade.offer", "trade.accept", "trade.withdraw"].includes(a.kind) ||
    Object.keys(a).length !== keys.length ||
    Object.keys(a).some((key) => !keys.includes(key))
  )
    throw new Error("trade-invalid");
  const seat = current.seats.findIndex((seat) => seat.uid === uid);
  if (seat < 0) throw new Error("permission");
  if (
    current.creditOffersVersion !== 1 ||
    current.phase !== "active" ||
    !current.economy ||
    !current.trades
  )
    throw new Error("trade-unavailable");
  if (current.pausedAt != null) throw new Error("paused");
  if (a.expectedRevision !== current.revision) throw new Error("conflict");
  const next = structuredClone(current);
  const trades = next.trades;
  if (!trades) throw new Error("trade-unavailable");
  const effectiveTick = futureTick(current, now);
  if (a.kind === "trade.offer") {
    if (
      !Number.isInteger(a.seat) ||
      a.seat < 0 ||
      a.seat >= current.seats.length ||
      a.seat === seat ||
      !amount(a.giveMilli) ||
      !amount(a.requestMilli) ||
      (!a.giveMilli && !a.requestMilli)
    )
      throw new Error("trade-invalid");
    // Bound pending canonical storage without dropping accepted offers/history.
    if (trades.offers.length >= 64) throw new Error("trade-limit");
    const counterpart = current.seats[a.seat].uid;
    if (current.empires[uid].creditsMilli < a.giveMilli)
      throw new Error("insufficient-credits");
    credit(next, uid, -a.giveMilli);
    trades.offers.push({
      id: offerIdentity(seat, commandId),
      issuer: uid,
      counterpart,
      giveMilli: a.giveMilli,
      requestMilli: a.requestMilli,
      createdTick: current.economy.tick,
      expiresTick: effectiveTick + rules.tradeExpiryTicks - 1,
      state: "open",
      effectiveTick: null,
      sequence: current.revision + 1,
    });
  } else {
    if (typeof a.offerId !== "string") throw new Error("trade-invalid");
    const offer = trades.offers.find((offer) => offer.id === a.offerId);
    if (
      !offer ||
      (a.kind === "trade.accept" ? offer.counterpart : offer.issuer) !== uid
    )
      throw new Error("permission");
    if (offer.state !== "open") throw new Error("trade-pending");
    if (a.kind === "trade.accept") {
      if (effectiveTick >= offer.expiresTick) throw new Error("trade-expired");
      if (current.empires[uid].creditsMilli < offer.requestMilli)
        throw new Error("insufficient-credits");
      credit(next, uid, -offer.requestMilli);
      offer.state = "accepted";
    } else offer.state = "withdrawing";
    offer.effectiveTick = effectiveTick;
    offer.sequence = current.revision + 1;
  }
  next.revision++;
  return next;
}
export function settleTrades(state: Campaign, tick: number) {
  if (state.creditOffersVersion !== 1 || !state.trades) return;
  const trades = state.trades;
  assertTradeBalances(state);
  trades.ledger = [];
  for (const offer of [...trades.offers].sort(
    (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
  )) {
    const expired = offer.expiresTick <= tick;
    if (!expired && (offer.effectiveTick == null || offer.effectiveTick > tick))
      continue;
    let result: TradeOutcome["result"] = expired
      ? "expired"
      : offer.state === "accepted"
        ? "settled"
        : "withdrawn";
    if (result === "settled") {
      // Preflight both final wallets before touching either side. Other offers'
      // reservations still need refund headroom after this exchange settles.
      const issuerTotal =
        BigInt(state.empires[offer.issuer].creditsMilli) +
        reservedCredits(state, offer.issuer) -
        BigInt(offer.giveMilli) +
        BigInt(offer.requestMilli);
      const counterpartTotal =
        BigInt(state.empires[offer.counterpart].creditsMilli) +
        reservedCredits(state, offer.counterpart) -
        BigInt(offer.requestMilli) +
        BigInt(offer.giveMilli);
      if (
        issuerTotal > BigInt(Number.MAX_SAFE_INTEGER) ||
        counterpartTotal > BigInt(Number.MAX_SAFE_INTEGER)
      )
        result = "failed";
    }
    if (result === "settled") {
      credit(state, offer.issuer, offer.requestMilli);
      credit(state, offer.counterpart, offer.giveMilli);
    } else {
      credit(state, offer.issuer, offer.giveMilli);
      if (offer.state === "accepted")
        credit(state, offer.counterpart, offer.requestMilli);
    }
    trades.ledger.push({ ...offer, result, settledTick: tick });
    trades.offers = trades.offers.filter((active) => active.id !== offer.id);
  }
}
export function tradeView(state: Campaign, uid: string) {
  const entitled = (offer: CreditOffer) =>
    offer.issuer === uid || offer.counterpart === uid;
  const project = (offer: CreditOffer) => ({
    id: offer.id,
    issuer: state.seats.findIndex((s) => s.uid === offer.issuer),
    counterpart: state.seats.findIndex((s) => s.uid === offer.counterpart),
    giveMilli: offer.giveMilli,
    requestMilli: offer.requestMilli,
    expiresTick: offer.expiresTick,
    createdTick: offer.createdTick,
    state: offer.state,
    effectiveTick: offer.effectiveTick,
  });
  return {
    enabled: state.creditOffersVersion === 1,
    offers: (state.trades?.offers ?? []).filter(entitled).map(project),
    ledger: (state.trades?.ledger ?? []).filter(entitled).map((offer) => ({
      ...project(offer),
      result: offer.result,
      settledTick: offer.settledTick,
    })),
  };
}
