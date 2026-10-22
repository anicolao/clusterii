import { expect, test } from "bun:test";
import {
  createCampaign,
  joinOrLeave,
  startCampaign,
  selectResearch,
} from "../shared/campaign";
import { produce, technologies } from "../shared/production";
import { researchCostMilli, researchEstimate } from "../shared/research";
import { nextResearchEffect } from "../src/lib/research-effect";
import { detectionProbability } from "../shared/observations";
import { orbitSurvivors, groundSurvivors } from "../shared/travel";

function fixture() {
  let c = createCampaign(
    "forecast",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Forecast test",
      capacity: 4,
      mode: "mock",
      development: true,
    },
    "e".repeat(64),
    0,
  );
  for (const [i, faction] of (
    ["heliac", "pelagic", "vesper", "dracon"] as const
  ).entries())
    c = joinOrLeave(
      c,
      { kind: "campaign.join", expectedRevision: c.revision, faction },
      "p" + i,
      { alias: "Envoy " + i, portrait: "G1" },
      0,
    );
  return startCampaign(c, 900000);
}
test("next costs meet actual settlement boundaries for every track and uncapped level", () => {
  expect(Array.from({ length: 11 }, (_, n) => researchCostMilli(n))).toEqual([
    20000,
    40000,
    80000,
    160000,
    320000,
    640000,
    1280000,
    2560000,
    5120000,
    10240000,
    null,
  ]);
  for (const track of technologies)
    for (let level = 0; level < 10; level++) {
      const c = fixture(),
        r = c.economy!.research.p0;
      r.target = track;
      r.levels[track] = level;
      const rate = produce(c, c.economy!).economy.ledger.p0.scienceMilli;
      r.progressMilli[track] = researchCostMilli(level)! - rate - 1;
      const below = produce(c, c.economy!);
      expect(below.economy.research.p0.levels[track]).toBe(level);
      r.progressMilli[track]++;
      const at = produce(c, c.economy!);
      expect(at.economy.research.p0.levels[track]).toBe(level + 1);
      expect(at.economy.research.p0.progressMilli[track]).toBe(0);
    }
});
test("funded-tick estimate predicts completion under its unchanged-rate assumption", () => {
  let c = fixture();
  c = produce(c, c.economy!).campaign;
  const r = c.economy!.research.p0,
    rate = c.economy!.ledger.p0.scienceMilli;
  const estimate = researchEstimate(r, "navigation", rate);
  expect(estimate).toMatchObject({
    costMilli: 40000,
    remainingMilli: 38600,
    fundedTicks: 28,
    reason: null,
  });
  for (let n = 1; n <= 28; n++) {
    c = produce(c, c.economy!).campaign;
    expect(c.economy!.research.p0.levels.navigation).toBe(n < 28 ? 1 : 2);
  }
  expect(c.economy!.research.p0.progressMilli.navigation).toBe(600);
});
test("cap, unknown/zero rates, pause and accepted/uncertain switches never promise a date", () => {
  const r = fixture().economy!.research.p0,
    before = structuredClone(r);
  expect(researchEstimate(r, "investing", 1400).fundedTicks).toBe(15);
  expect(researchEstimate(r, "navigation", null).reason).toBe("unknown-rate");
  expect(researchEstimate(r, "navigation", 0).reason).toBe("zero-rate");
  expect(researchEstimate(r, "navigation", 1400, "paused").reason).toBe(
    "paused",
  );
  expect(researchEstimate(r, "navigation", 1400, "pending").reason).toBe(
    "pending",
  );
  expect(r).toEqual(before);
  r.orders = [
    { id: "original", sequence: 7, effectiveTick: 2, target: "investing" },
  ];
  expect(researchEstimate(r, "investing", 1400).reason).toBe("pending");
  r.orders = [];
  r.levels.navigation = 10;
  r.progressMilli.navigation = 50000;
  expect(researchEstimate(r, "navigation", 1400)).toMatchObject({
    costMilli: null,
    fundedTicks: null,
    reason: "capped",
  });
  expect(researchEstimate(r, "investing", 1400).reason).toBe("bank-transfer");
  // Enough retained progress still waits for one settlement, even at zero rate.
  r.target = "investing";
  r.progressMilli.investing = 20000;
  expect(researchEstimate(r, "investing", 0).fundedTicks).toBe(1);
  for (const invalid of [-1, NaN, Infinity, 1.2]) {
    expect(() => researchCostMilli(invalid)).toThrow();
    expect(() => researchEstimate(r, "investing", invalid)).toThrow();
  }
});
test("next effects describe recorded coefficients, units and historical capabilities", () => {
  const enabled = { scanning: true, travel: true, construction: true };
  expect(nextResearchEffect("navigation", 1, enabled)).toContain(
    "20 light years per leg. Speed stays 2",
  );
  expect(nextResearchEffect("scanning", 1, enabled)).toContain("40 / distance");
  expect(detectionProbability(2, 100)).toBe(0.4);
  expect(detectionProbability(2, 0)).toBe(1);
  expect(nextResearchEffect("formations", 1, enabled)).toContain(
    "coefficient: 2",
  );
  expect(orbitSurvivors(10, 10, 2, 1)).toEqual([7, 0]);
  expect(nextResearchEffect("melee", 1, enabled)).toContain("damage: 2");
  expect(groundSurvivors(10, 10, 2, 1)).toEqual([5, 0]);
  expect(nextResearchEffect("terraforming", 0, enabled)).toContain(
    "Capacity: 9",
  );
  for (const track of [
    "terraforming",
    "investing",
    "recruiting",
    "innovation",
  ] as const)
    expect(nextResearchEffect(track, 0, enabled)).toContain("power 1.01");
  for (const track of technologies)
    expect(nextResearchEffect(track, 10, enabled)).toContain("Maximum level");
  const historical = { scanning: false, travel: false, construction: false };
  expect(nextResearchEffect("scanning", 1, historical)).toContain(
    "no new observation capability",
  );
  for (const track of ["navigation", "formations", "melee"] as const)
    expect(nextResearchEffect(track, 1, historical)).toContain("not unlocked");
  expect(nextResearchEffect("terraforming", 0, historical)).not.toContain(
    "Capacity:",
  );
});

test("Innovation completion retains overflow and changes science only on the following tick", () => {
  let state = fixture();
  for (const target of ["investing", "innovation"] as const)
    state = selectResearch(
      state,
      { kind: "research.select", expectedRevision: state.revision, target },
      "p0",
      target,
      state.economy!.nextTickAt - 1,
    );
  for (let tick = 1; tick <= 16; tick++) {
    state = produce(state, state.economy!).campaign;
    const own = state.economy!.research.p0;
    expect(own.target).toBe("innovation");
    expect(own.lastApplied!.id).toBe("innovation");
    expect(own.orders).toEqual([]);
    expect(own.levels.innovation).toBe(tick < 15 ? 0 : 1);
    expect(own.progressMilli.innovation).toBe(
      tick < 15 ? tick * 1400 : tick === 15 ? 1000 : 2404,
    );
    expect(state.economy!.ledger.p0.scienceMilli).toBe(tick < 16 ? 1400 : 1404);
    const peer = state.economy!.research.p1;
    expect(peer.target).toBe("navigation");
    expect(peer.levels.innovation).toBe(0);
    expect(peer.progressMilli.navigation).toBe(tick * 1400);
  }
});
