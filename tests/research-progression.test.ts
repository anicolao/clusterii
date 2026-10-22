import { expect, test } from "bun:test";
import {
  createCampaign,
  joinOrLeave,
  startCampaign,
  selectResearch,
  campaignView,
  type Campaign,
} from "../shared/campaign";
import { produce } from "../shared/production";
import { researchEstimate } from "../shared/research";
import { fleetIdentity, orderFleet } from "../shared/fleets";
import { orderRoute, routePreview } from "../shared/travel";
import { distance } from "../shared/galaxy";
import { arrivalRank } from "../functions/src/observation-random";

// Only real reducers create/change state. No levels, ledger, forces, ownership,
// catalogue coordinates or capabilities are assigned by this progression fixture.
function begin() {
  let c = createCampaign(
    "research-progression",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Recorded research boundaries",
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
      `p${i}`,
      { alias: `Envoy ${i}`, portrait: "G1" },
      0,
    );
  return startCampaign(c, 900000);
}
const advance = (c: Campaign) =>
  produce(c, c.economy!, (starId, uid, tick) =>
    arrivalRank(c.seed, c.id, uid, starId, tick),
  ).campaign;
let completed: Campaign | undefined;
function capped() {
  if (!completed) {
    let c = begin(),
      earned = 0;
    for (let tick = 0; tick < 14600; tick++) {
      c = advance(c);
      earned += c.economy!.ledger.p0.scienceMilli;
      if (tick === 14598)
        expect(c.economy!.research.p0.levels.navigation).toBe(9);
    }
    expect(earned).toBe(20440000);
    expect(c.economy!.research.p0.levels.navigation).toBe(10);
    expect(c.economy!.research.p0.progressMilli.navigation).toBe(0);
    completed = c;
  }
  return structuredClone(completed);
}
const choose = (c: Campaign, target: "investing" | "navigation", id: string) =>
  selectResearch(
    c,
    { kind: "research.select", expectedRevision: c.revision, target },
    "p0",
    id,
    c.economy!.nextTickAt - 1,
  );

test("earned cap banks science and transfers it once through an authorized research order", () => {
  let c = capped();
  for (let n = 0; n < 3; n++) c = advance(c);
  const own = campaignView(c, "p0"),
    peer = campaignView(c, "p1");
  expect(own.economy!.research.progressMilli.navigation).toBe(4200);
  expect(
    researchEstimate(
      own.economy!.research,
      "navigation",
      own.economy!.ledger!.scienceMilli,
    ),
  ).toMatchObject({ reason: "capped", costMilli: null, fundedTicks: null });
  expect(
    researchEstimate(own.economy!.research, "investing", 1400).reason,
  ).toBe("bank-transfer");
  const action = {
    kind: "research.select",
    expectedRevision: c.revision,
    target: "investing",
  };
  expect(() =>
    selectResearch(c, action, "outsider", "denied", c.economy!.nextTickAt - 1),
  ).toThrow("permission");
  const queued = choose(c, "investing", "earned-bank-switch");
  expect(() =>
    selectResearch(queued, action, "p0", "stale", c.economy!.nextTickAt - 1),
  ).toThrow("conflict");
  expect(campaignView(queued, "p1").economy).toEqual(peer.economy);
  expect(JSON.stringify(campaignView(queued, "p1"))).not.toContain(
    "earned-bank-switch",
  );
  const projected = campaignView(queued, "p0").economy!;
  expect(
    researchEstimate(
      projected.research,
      "investing",
      projected.ledger!.scienceMilli,
    ).reason,
  ).toBe("pending");
  c = advance(queued);
  expect(c.economy!.research.p0).toMatchObject({
    target: "investing",
    orders: [],
    progressMilli: { navigation: 0, investing: 5600 },
    lastApplied: { id: "earned-bank-switch", effectiveTick: 14604 },
  });
  expect(c.economy!.research.p1.progressMilli.navigation).toBe(5600);
  // Deterministic replay of the same prior tick yields the same result; the next
  // tick adds only new science, never re-transfers the capped bank.
  expect(advance(queued)).toEqual(c);
  c = advance(c);
  expect(c.economy!.research.p0.progressMilli.investing).toBe(7000);
  const view = campaignView(c, "p0").economy!;
  expect(
    researchEstimate(view.research, "investing", view.ledger!.scienceMilli),
  ).toMatchObject({ reason: null, remainingMilli: 13000, fundedTicks: 10 });
}, 60000);

function path(c: Campaign, from: string, to: string) {
  const pending = [[from]],
    seen = new Set([from]);
  while (pending.length) {
    const route = pending.shift()!;
    const last = c.galaxy.stars.find((s) => s.id === route.at(-1))!;
    for (const star of c.galaxy.stars) {
      if (seen.has(star.id) || distance(last, star) > 100) continue;
      if (star.id !== to && c.galaxy.homes.includes(star.id)) continue;
      const next = [...route, star.id];
      if (star.id === to) return next.slice(1);
      seen.add(star.id);
      pending.push(next);
    }
  }
  throw new Error("No real catalogue route");
}
test("loss of the science-producing orbit yields an authorized zero-rate forecast without fabricated ledger state", () => {
  let c = advance(choose(capped(), "investing", "zero-rate-target"));
  const home = c.seats[0].home!,
    rival = c.seats[1].home!;
  const neutral = c.galaxy.stars
    .filter((s) => !c.galaxy.homes.includes(s.id))
    .sort(
      (a, b) =>
        distance(
          a,
          c.galaxy.stars.find((s) => s.id === home)!,
        ) -
        distance(
          b,
          c.galaxy.stars.find((s) => s.id === home)!,
        ),
    )[0].id;
  for (const [uid, starId] of [
    ["p0", home],
    ["p1", rival],
  ])
    c = orderFleet(
      c,
      {
        kind: "fleet.form",
        expectedRevision: c.revision,
        starId,
        fighters: c.systems[starId].fighters,
        infantry: 0,
      },
      uid,
      `depart-${uid}`,
      c.economy!.nextTickAt - 1,
    );
  c = advance(c);
  for (const [uid, origin, target] of [
    ["p0", home, neutral],
    ["p1", rival, home],
  ]) {
    const waypoints = path(c, origin, target);
    expect(
      routePreview(
        c.galaxy.stars,
        origin,
        waypoints,
        c.economy!.research[uid].levels.navigation,
      ).every((leg) => leg.reachable),
    ).toBe(true);
    c = orderRoute(
      c,
      {
        kind: "fleet.route",
        expectedRevision: c.revision,
        fleetId: fleetIdentity(uid, `depart-${uid}`),
        waypoints,
      },
      uid,
      `travel-${uid}`,
      c.economy!.nextTickAt - 1,
    );
  }
  for (let n = 0; n < 200 && c.systems[home].orbit !== "p1"; n++)
    c = advance(c);
  expect(c.systems[home].orbit).toBe("p1");
  expect(c.systems[home].surface).toBe("p0");
  expect(
    campaignView(c, "p0").military!.arrivals!.some(
      (arrival) => arrival.starId === home && arrival.contested,
    ),
  ).toBe(true);
  c = advance(c);
  const own = campaignView(c, "p0"),
    other = campaignView(c, "p1");
  const holding = own.holdings.find((system) => system.starId === home)!;
  expect(holding).toMatchObject({ orbit: "Unknown", surface: "You" });
  for (const field of ["fighters", "camps", "stations", "escrowMilli"])
    expect(holding).not.toHaveProperty(field);
  expect(c.systems[home].stations).toBeGreaterThan(0);
  expect(own.economy!.ledger!.scienceMilli).toBe(0);
  expect(other.economy!.ledger!.scienceMilli).toBeGreaterThan(1400);
  expect(
    researchEstimate(
      own.economy!.research,
      "investing",
      own.economy!.ledger!.scienceMilli,
    ),
  ).toMatchObject({ reason: "zero-rate", fundedTicks: null });
  const before = own.economy!.research.progressMilli.investing;
  c = advance(c);
  expect(campaignView(c, "p0").economy!.research.progressMilli.investing).toBe(
    before,
  );
  expect(JSON.stringify(other.economy!.research)).not.toContain(
    "zero-rate-target",
  );
  expect(() => campaignView(c, "outsider")).toThrow("not-member");
}, 60000);
