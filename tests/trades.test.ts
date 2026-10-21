import { expect, test } from "bun:test";
import {
  createCampaign,
  joinOrLeave,
  startCampaign,
  campaignView,
  type Campaign,
} from "../shared/campaign";
import {
  exchange,
  settleTrades,
  reservedCredits,
  assertTradeBalances,
} from "../shared/trades";
import { produce } from "../shared/production";
import { rules } from "../shared/rules";
import { creditMilli, tradeRecords } from "../src/lib/credit-offers";
function fixture(capacity: 4 | 8 = 4) {
  let c = createCampaign(
    "credits",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Exact terms",
      capacity,
      mode: "mock",
      development: true,
    },
    "c".repeat(64),
    0,
  );
  const factions = ["heliac", "pelagic", "vesper", "dracon"] as const;
  for (const [i, faction] of Array.from(
    { length: capacity },
    (_, i) => factions[i % 4],
  ).entries())
    c = joinOrLeave(
      c,
      { kind: "campaign.join", expectedRevision: c.revision, faction },
      `u${i}`,
      { alias: `Envoy ${i}`, portrait: "G1" },
      0,
    );
  return startCampaign(c, c.startAt!);
}
const command = (
  c: Campaign,
  uid: string,
  action: Record<string, unknown>,
  id: string = crypto.randomUUID(),
  now = c.economy!.nextTickAt - 1,
) => exchange(c, { expectedRevision: c.revision, ...action }, uid, id, now);
const offer = (c: Campaign, giveMilli = 10001, requestMilli = 20002) =>
  command(
    c,
    "u0",
    { kind: "trade.offer", seat: 1, giveMilli, requestMilli },
    "terms",
  );
const accept = (c: Campaign) =>
  command(c, "u1", { kind: "trade.accept", offerId: c.trades!.offers[0].id });
const total = (c: Campaign) =>
  Object.entries(c.empires).reduce(
    (sum, [uid, e]) => sum + BigInt(e.creditsMilli) + reservedCredits(c, uid),
    0n,
  );
test("credit offers reserve exact amounts and settle both sides once without a dividend", () => {
  const initial = fixture(),
    base = total(initial),
    offered = offer(initial),
    accepted = accept(offered);
  expect(total(offered)).toBe(base);
  expect(total(accepted)).toBe(base);
  expect(initial.trades!.offers).toEqual([]);
  expect(accepted.empires.u0.creditsMilli).toBe(
    initial.empires.u0.creditsMilli - 10001,
  );
  expect(accepted.empires.u1.creditsMilli).toBe(
    initial.empires.u1.creditsMilli - 20002,
  );
  settleTrades(accepted, 1);
  expect(total(accepted)).toBe(base);
  expect(accepted.trades!.offers).toEqual([]);
  expect(accepted.empires.u0.creditsMilli).toBe(
    initial.empires.u0.creditsMilli + 10001,
  );
  expect(accepted.empires.u1.creditsMilli).toBe(
    initial.empires.u1.creditsMilli - 10001,
  );
  expect(accepted.trades!.ledger[0]).toMatchObject({
    result: "settled",
    settledTick: 1,
  });
  const final = structuredClone(accepted.empires);
  settleTrades(accepted, 1);
  expect(accepted.empires).toEqual(final);
  const produced = produce(accept(offer(initial)), initial.economy!);
  const plain = produce(initial, initial.economy!);
  expect(produced.economy.ledger).toEqual(plain.economy.ledger);
  expect(total(produced.campaign)).toBe(total(plain.campaign));
});
test("only named participants see terms and outcomes, with no account IDs or opponent wallet", () => {
  let c = offer(fixture(), 12345, 54321);
  const publicView = JSON.stringify(campaignView(c, "u2"));
  expect(campaignView(c, "u2").trades).toEqual({
    enabled: true,
    offers: [],
    ledger: [],
  });
  expect(publicView).not.toContain("12345");
  expect(publicView).not.toContain("54321");
  expect(campaignView(c, "u0").trades.offers[0]).toMatchObject({
    issuer: 0,
    counterpart: 1,
    giveMilli: 12345,
    requestMilli: 54321,
  });
  expect(JSON.stringify(campaignView(c, "u1").trades)).not.toContain('"u0"');
  expect(campaignView(c, "u1").own.seat).toBe(1);
  c = accept(c);
  settleTrades(c, 1);
  expect(campaignView(c, "u2").trades.ledger).toEqual([]);
  expect(campaignView(c, "u0").trades.ledger).toHaveLength(1);
  const view = campaignView(c, "u0");
  expect(tradeRecords([view, view])).toHaveLength(1);
});
test("authorization, exact terms, affordability and revision guards leave canonical state unchanged", () => {
  const c = fixture(),
    before = structuredClone(c);
  for (const action of [
    { kind: "trade.offer", seat: 0, giveMilli: 1, requestMilli: 0 },
    { kind: "trade.offer", seat: 4, giveMilli: 1, requestMilli: 0 },
    { kind: "trade.offer", seat: 1, giveMilli: 0, requestMilli: 0 },
    { kind: "trade.offer", seat: 1, giveMilli: -1, requestMilli: 1 },
    { kind: "trade.offer", seat: 1, giveMilli: 0.5, requestMilli: 1 },
    {
      kind: "trade.offer",
      seat: 1,
      giveMilli: Number.MAX_SAFE_INTEGER + 1,
      requestMilli: 0,
    },
    {
      kind: "trade.offer",
      seat: 1,
      giveMilli: 1,
      requestMilli: 0,
      issuer: "u1",
    },
  ])
    expect(() => command(c, "u0", action)).toThrow("trade-invalid");
  expect(() => offer(c, c.empires.u0.creditsMilli + 1, 0)).toThrow(
    "insufficient-credits",
  );
  expect(() =>
    command(c, "outsider", {
      kind: "trade.offer",
      seat: 1,
      giveMilli: 1,
      requestMilli: 0,
    }),
  ).toThrow("permission");
  expect(() =>
    command(c, "u0", {
      kind: "trade.offer",
      seat: 1,
      giveMilli: 1,
      requestMilli: 0,
      expectedRevision: c.revision - 1,
    }),
  ).toThrow("conflict");
  expect(() => offer({ ...c, pausedAt: 1 })).toThrow("paused");
  expect(() => offer({ ...c, creditOffersVersion: undefined })).toThrow(
    "trade-unavailable",
  );
  expect(c).toEqual(before);
  const issued = offer(c, 1, Number.MAX_SAFE_INTEGER);
  expect(() => accept(issued)).toThrow("insufficient-credits");
  for (const [uid, kind] of [
    ["u0", "trade.accept"],
    ["u2", "trade.accept"],
    ["u1", "trade.withdraw"],
  ])
    expect(() =>
      command(issued, uid, { kind, offerId: issued.trades!.offers[0].id }),
    ).toThrow("permission");
});
test("first admitted acceptance or withdrawal wins and all cancellation paths conserve reservations", () => {
  const c = offer(fixture()),
    base = total(c),
    id = c.trades!.offers[0].id;
  const accepted = accept(c);
  expect(() =>
    command(accepted, "u0", { kind: "trade.withdraw", offerId: id }),
  ).toThrow("trade-pending");
  expect(() => accept(accepted)).toThrow("trade-pending");
  const withdrawn = command(c, "u0", { kind: "trade.withdraw", offerId: id });
  expect(() => accept(withdrawn)).toThrow("trade-pending");
  settleTrades(withdrawn, 0);
  expect(withdrawn.trades!.offers).toHaveLength(1);
  settleTrades(withdrawn, 1);
  expect(withdrawn.trades!.ledger[0].result).toBe("withdrawn");
  expect(total(withdrawn)).toBe(base);
  expect(reservedCredits(withdrawn, "u0")).toBe(0n);
  const expired = structuredClone(c);
  settleTrades(expired, rules.tradeExpiryTicks);
  expect(expired.trades!.ledger[0].result).toBe("expired");
  expect(total(expired)).toBe(base);
  const late = accept(c);
  settleTrades(late, rules.tradeExpiryTicks);
  expect(late.trades!.ledger[0].result).toBe("expired");
  expect(total(late)).toBe(base);
  expect(reservedCredits(late, "u1")).toBe(0n);
});
test("strict tick cutoff and expiry precede settlement during catch-up", () => {
  const c = fixture(),
    boundary = c.economy!.nextTickAt;
  const at = command(
    c,
    "u0",
    { kind: "trade.offer", seat: 1, giveMilli: 1, requestMilli: 0 },
    "at",
    boundary,
  );
  expect(at.trades!.offers[0].expiresTick).toBe(rules.tradeExpiryTicks + 1);
  const c1 = offer(c),
    id = c1.trades!.offers[0].id;
  const admitted = command(
    c1,
    "u1",
    { kind: "trade.accept", offerId: id },
    "before",
    boundary + 6 * 900000 - 1,
  );
  expect(admitted.trades!.offers[0].effectiveTick).toBe(7);
  expect(() =>
    command(
      c1,
      "u1",
      { kind: "trade.accept", offerId: id },
      "cutoff",
      boundary + 6 * 900000,
    ),
  ).toThrow("trade-expired");
  const now = boundary + 20 * 900000;
  const delayed = command(
    c,
    "u0",
    { kind: "trade.offer", seat: 1, giveMilli: 1, requestMilli: 0 },
    "delayed",
    now,
  );
  expect(delayed.trades!.offers[0].expiresTick).toBe(
    22 + rules.tradeExpiryTicks - 1,
  );
});
test("overflow fails the complete exchange and returns both reservations without partial credit", () => {
  const c = fixture();
  c.empires.u0.creditsMilli = Number.MAX_SAFE_INTEGER;
  const accepted = accept(offer(c, 1, 2)),
    before = total(accepted);
  settleTrades(accepted, 1);
  expect(accepted.trades!.ledger[0].result).toBe("failed");
  expect(accepted.empires).toEqual(c.empires);
  expect(total(accepted)).toBe(before);
  expect(accepted.trades!.offers).toEqual([]);
  const invalid = offer(c, 1, 0);
  invalid.empires.u0.creditsMilli++;
  const snapshot = structuredClone(invalid);
  expect(() => settleTrades(invalid, 1)).toThrow("trade-balance");
  expect(invalid).toEqual(snapshot);
  expect(() => assertTradeBalances(invalid)).toThrow("trade-balance");
  const nearLimit = fixture();
  nearLimit.empires.u0.creditsMilli = Number.MAX_SAFE_INTEGER - 1000;
  const reserved = offer(nearLimit, 9000, 0),
    original = structuredClone(reserved);
  expect(() => produce(reserved, reserved.economy!)).toThrow("trade-balance");
  expect(reserved).toEqual(original);
});
test("credit input accepts exact milliunits without float rounding or scientific notation", () => {
  for (const [input, expected] of [
    ["0", 0],
    ["1.001", 1001],
    ["10.1", 10100],
    ["9007199254740.991", Number.MAX_SAFE_INTEGER],
  ] as const)
    expect(creditMilli(input)).toBe(expected);
  for (const input of [
    "",
    "-1",
    "1.0001",
    "1e3",
    "01",
    " 1",
    "9007199254740.992",
  ])
    expect(creditMilli(input)).toBeNull();
});

test("co-faction commanders retain distinct trade identities and private entitlements", () => {
  const initial = fixture(8);
  const c = command(initial, "u4", {
    kind: "trade.offer",
    seat: 0,
    giveMilli: 1,
    requestMilli: 0,
  });
  expect(campaignView(c, "u4").own.seat).toBe(4);
  expect(campaignView(c, "u4").own.faction).toBe(
    campaignView(c, "u0").own.faction,
  );
  expect(campaignView(c, "u4").trades.offers[0]).toMatchObject({
    issuer: 4,
    counterpart: 0,
  });
  expect(campaignView(c, "u1").trades.offers).toEqual([]);
});
