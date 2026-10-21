import { expect, test } from "bun:test";
import {
  createCampaign,
  joinOrLeave,
  startCampaign,
  campaignView,
} from "../shared/campaign";
import {
  orderFleet,
  fleetIdentity,
  cancelFleet,
  stationedForces,
} from "../shared/fleets";
import { produce } from "../shared/production";
import {
  fleetPosition,
  routePreview,
  orderRoute,
  orbitSurvivors,
  groundSurvivors,
  integerRoot,
} from "../shared/travel";
import {
  acquireObservations,
  observationView,
  assertObservationBudget,
} from "../shared/observations";
function fixture() {
  let c = createCampaign(
    "travel",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Travel rules",
      capacity: 4,
      mode: "mock",
      development: true,
    },
    "a".repeat(64),
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
  c = startCampaign(c, 900000);
  for (const s of Object.values(c.systems)) {
    s.markets = 0;
    s.camps = 0;
    s.bases = 0;
    s.stations = 0;
  }
  const home = c.galaxy.stars.find((s) => s.id === c.seats[0].home)!;
  const destinations = c.galaxy.stars
    .filter((s) => !c.galaxy.homes.includes(s.id))
    .slice(0, 2);
  for (const [i, s] of destinations.entries()) {
    s.x = home.x + 6 * (i + 1);
    s.y = home.y;
    s.z = home.z;
  }
  return { c, home, first: destinations[0], second: destinations[1] };
}
function advance(c: ReturnType<typeof fixture>["c"], count = 1) {
  for (let i = 0; i < count; i++) {
    const next = produce(c, c.economy!, (_star, uid) => Number(uid.slice(1)));
    c = { ...next.campaign, economy: next.economy };
  }
  return c;
}
function formed() {
  let { c, home, first, second } = fixture();
  c = advance(
    orderFleet(
      c,
      {
        kind: "fleet.form",
        expectedRevision: c.revision,
        starId: home.id,
        fighters: 4,
        infantry: 6,
      },
      "p0",
      "formation",
      0,
    ),
  );
  return { c, home, first, second, id: fleetIdentity("p0", "formation") };
}
function route(
  c: ReturnType<typeof fixture>["c"],
  id: string,
  waypoints: string[],
  uid = "p0",
  command = "route",
) {
  return orderRoute(
    c,
    {
      kind: "fleet.route",
      expectedRevision: c.revision,
      fleetId: id,
      waypoints,
    },
    uid,
    command,
    0,
  );
}
test("route geometry uses exact Euclidean range separately from speed and validates each leg", () => {
  const { home, first, second } = fixture();
  first.x = home.x + 10;
  second.x = home.x + 10.001;
  const stars = [home, first, second];
  expect(routePreview(stars, home.id, [first.id], 1)[0]).toMatchObject({
    reachable: true,
    ticks: 5,
    distanceLy: 10,
  });
  expect(routePreview(stars, home.id, [second.id], 1)[0].reachable).toBe(false);
  expect(routePreview(stars, home.id, [second.id], 2)[0]).toMatchObject({
    reachable: true,
    ticks: 6,
  });
  for (const path of [
    [],
    [home.id],
    [first.id, first.id],
    [first.id, home.id],
    ["missing"],
    Array(17).fill(first.id),
  ])
    expect(() => routePreview(stars, home.id, path, 1)).toThrow();
  expect(routePreview(stars, home.id, [first.id, second.id], 1)).toHaveLength(
    2,
  );
});
test("route admission is private, revision-bound, strict, cancellable and does not move forces", () => {
  const { c, home, first, id } = formed();
  const ordered = route(c, id, [first.id]);
  expect(ordered.systems).toEqual(c.systems);
  expect(ordered.military!.fleets).toEqual(c.military!.fleets);
  expect(c.military!.orders).toEqual([]);
  expect(ordered.military!.orders[0].effectiveTick).toBe(2);
  const other = campaignView(ordered, "p1");
  expect(other.military).toEqual({ fleets: [], orders: [], ledger: [] });
  expect(JSON.stringify(other.military)).not.toContain(id);
  const action = {
    kind: "fleet.route",
    expectedRevision: c.revision,
    fleetId: id,
    waypoints: [first.id],
  };
  for (const patch of [
    { extra: 1 },
    { waypoints: "bad" },
    { waypoints: [2] },
    { fleetId: 2 },
    { kind: "fleet.form" },
  ])
    expect(() =>
      orderRoute(c, { ...action, ...patch }, "p0", "bad", 0),
    ).toThrow("invalid");
  expect(() => orderRoute(c, action, "p1", "bad", 0)).toThrow("permission");
  expect(() =>
    orderRoute(c, { ...action, expectedRevision: 0 }, "p0", "bad", 0),
  ).toThrow("conflict");
  expect(() =>
    orderRoute({ ...c, travelVersion: undefined }, action, "p0", "bad", 0),
  ).toThrow("travel-unavailable");
  expect(() =>
    orderRoute({ ...c, pausedAt: 1 }, action, "p0", "bad", 0),
  ).toThrow("paused");
  expect(() => route(ordered, id, [first.id])).toThrow("fleet-order-pending");
  const cancelled = cancelFleet(
    ordered,
    {
      kind: "fleet.cancel",
      expectedRevision: ordered.revision,
      orderId: "route",
    },
    "p0",
    0,
  );
  expect(advance(cancelled, 5).military!.fleets[id]).toEqual(
    c.military!.fleets[id],
  );
  expect(cancelled.systems[home.id]).toEqual(c.systems[home.id]);
});
test("travel conserves complements, resolves neutral layers, stops at waypoints and revalidates onward range", () => {
  const { c, home, first, second, id } = formed();
  let moving = advance(route(c, id, [first.id, second.id]));
  const f = moving.military!.fleets[id];
  expect(f.travel).toMatchObject({
    status: "traveling",
    departureTick: 2,
    arrivalTick: 5,
    from: home.id,
    to: first.id,
  });
  expect(stationedForces(moving, home.id)).toEqual({
    fighters: 16,
    infantry: 14,
  });
  expect(moving.systems[first.id].orbit).toBeNull();
  expect(fleetPosition(f, moving.galaxy.stars, 3).x).toBeCloseTo(home.x + 2);
  expect(() => route(moving, id, [first.id])).toThrow("fleet-traveling");
  for (const kind of ["fleet.disband", "fleet.split", "fleet.load"])
    expect(() =>
      orderFleet(
        moving,
        {
          kind,
          expectedRevision: moving.revision,
          fleetId: id,
          ...(kind === "fleet.split"
            ? { fighters: 1, infantry: 0 }
            : kind === "fleet.load"
              ? { infantry: 1 }
              : {}),
        },
        "p0",
        "blocked",
        0,
      ),
    ).toThrow("fleet-traveling");
  moving = advance(moving, 3);
  expect(moving.economy!.tick).toBe(5);
  expect(moving.military!.fleets[id].travel).toMatchObject({
    status: "waypoint",
    leg: 1,
    arrivalTick: 5,
  });
  expect(moving.systems[first.id]).toMatchObject({
    orbit: "p0",
    surface: "p0",
    infantry: 6,
  });
  expect(moving.military!.fleets[id].infantry).toBe(0);
  expect(moving.military!.arrivals!.p0[0]).toMatchObject({
    fightersBefore: 4,
    fightersAfter: 4,
    infantryBefore: 6,
    infantryAfter: 6,
  });
  const reduced = structuredClone(moving);
  reduced.economy!.research.p0.levels.navigation = 0;
  const halted = advance(reduced);
  expect(halted.military!.fleets[id].travel).toBeUndefined();
  expect(halted.military!.ledger.p0[0].result).toBe("halted");
  moving = advance(moving);
  expect(moving.military!.fleets[id].travel).toMatchObject({
    departureTick: 6,
    arrivalTick: 9,
    to: second.id,
  });
  moving = advance(moving, 3);
  expect(moving.military!.fleets[id].starId).toBe(second.id);
  expect(moving.military!.fleets[id].travel).toBeUndefined();
  expect(moving.systems[second.id]).toMatchObject({
    orbit: "p0",
    surface: null,
    infantry: 0,
  });
  expect(
    moving.systems[home.id].fighters + moving.military!.fleets[id].fighters,
  ).toBe(20);
  expect(
    moving.systems[home.id].infantry + moving.systems[first.id].infantry,
  ).toBe(20);
});
test("integer combat follows square-law coefficients and defender-first linear frontage", () => {
  expect(orbitSurvivors(1000, 500, 1, 1)).toEqual([866, 0]);
  expect(orbitSurvivors(1000, 1000, 1, 1)).toEqual([0, 0]);
  expect(orbitSurvivors(1, 1, 2, 1)).toEqual([0, 0]);
  expect(orbitSurvivors(2, 3, 4, 1)).toEqual([1, 0]);
  expect(integerRoot(999999999999n)).toBe(999999n);
  expect(groundSurvivors(10, 10, 1, 1)).toEqual([0, 1]);
  expect(groundSurvivors(10, 5, 1, 1)).toEqual([5, 0]);
  expect(groundSurvivors(10, 5, 2, 3)).toEqual([1, 0]);
  expect(groundSurvivors(0, 5, 1, 1)).toEqual([0, 5]);
});
test("simultaneous hostile arrival is permutation-stable, capacity-safe and reports only to participants", () => {
  const { c, first, id } = formed();
  let queued = route(c, id, [first.id]);
  queued.military!.fleets.rival = {
    id: "rival",
    uid: "p1",
    starId: c.seats[1].home!,
    fighters: 2,
    infantry: 20,
    formedTick: 1,
    number: 99,
    travel: {
      commandId: "rival-route",
      waypoints: [first.id],
      leg: 0,
      from: c.seats[1].home!,
      to: first.id,
      departureTick: 2,
      arrivalTick: 5,
      status: "traveling",
    },
  };
  const reversed = structuredClone(queued);
  reversed.military!.fleets = Object.fromEntries(
    Object.entries(reversed.military!.fleets).reverse(),
  );
  const result = advance(queued, 4),
    other = advance(reversed, 4);
  expect(result.systems).toEqual(other.systems);
  expect(result.military).toEqual(other.military);
  expect(result.systems[first.id]).toMatchObject({
    orbit: "p0",
    surface: "p0",
    infantry: 6,
  });
  expect(result.military!.fleets[id].fighters).toBe(3);
  expect(result.military!.fleets.rival).toBeUndefined();
  expect(campaignView(result, "p2").military).toEqual({
    fleets: [],
    orders: [],
    ledger: [],
  });
  expect(result.military!.arrivals!.p1[0]).toMatchObject({
    fightersBefore: 2,
    fightersAfter: 0,
    infantryBefore: 20,
    infantryAfter: 0,
    contested: true,
    detail: {
      carriedBefore: 20,
      transportLosses: 20,
      landed: 0,
      groundLosses: 0,
    },
  });
});
test("fleet sensors use confirmed in-flight positions without disclosing the private route", () => {
  const { c, first, id } = formed();
  let before = advance(route(c, id, [first.id]));
  before.systems[c.seats[0].home!].orbit = "p1";
  let after = advance(before);
  acquireObservations(before, after, () => 0);
  expect(observationView(after, "p0")![first.id].sourceStarId).toBeNull();
  expect(JSON.stringify(campaignView(after, "p1").military)).not.toContain(
    "route",
  );
  expect(after.military!.fleets[id].travel?.status).toBe("traveling");
});

test("hostile surface arrival ends the onward route even with friendly orbital control", () => {
  const { c, first, second, id } = formed();
  c.systems[first.id].orbit = "p0";
  c.systems[first.id].surface = "p1";
  c.systems[first.id].infantry = 2;
  const result = advance(route(c, id, [first.id, second.id]), 4);
  expect(result.systems[first.id]).toMatchObject({
    orbit: "p0",
    surface: "p0",
    infantry: 4,
  });
  expect(result.military!.fleets[id].travel).toBeUndefined();
  expect(result.military!.arrivals!.p0[0].contested).toBe(true);
  expect(result.military!.arrivals!.p1[0].infantryAfter).toBe(0);
  expect(advance(result).military!.fleets[id].starId).toBe(first.id);
});

test("route admission reserves multi-fleet departure and arrival growth within both encrypted document limits", async () => {
  const { provider, newKey } = await import("../shared/crypto");
  const { c, home, first, second } = fixture();
  c.military = { fleets: {}, orders: [], ledger: {} };
  const military = c.military;
  // Maximum fleet count per owner, with longest valid waypoint lists. Forces are
  // bounded by the recorded unit ceiling; only test geometry is controlled.
  for (const seat of c.seats) {
    const h = c.galaxy.stars.find((s) => s.id === seat.home)!;
    h.x = home.x;
    h.y = home.y;
    h.z = home.z;
    c.economy!.research[seat.uid].levels.navigation = 2;
    for (let i = 0; i < 128; i++) {
      const id = fleetIdentity(seat.uid, `budget-${i}`);
      military.fleets[id] = {
        id,
        uid: seat.uid,
        number: i + 1,
        starId: seat.home!,
        formedTick: 0,
        fighters: 100,
        infantry: 100,
      };
    }
  }
  let queued = c,
    admitted = 0,
    refused = false;
  for (const fleet of Object.values(military.fleets)) {
    const next = route(
      queued,
      fleet.id,
      Array.from({ length: 16 }, (_, i) => (i % 2 ? second.id : first.id)),
      fleet.uid,
      crypto.randomUUID(),
    );
    try {
      assertObservationBudget(next);
    } catch (error) {
      expect((error as Error).message).toBe("pending-work-capacity");
      refused = true;
      break;
    }
    queued = next;
    admitted++;
  }
  expect(admitted).toBeGreaterThan(0);
  expect(refused || admitted === 512).toBe(true);
  for (const state of [queued, advance(queued), advance(queued, 4)]) {
    const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
    expect(bytes).toBeLessThan(600000);
    for (const mode of ["mock", "real"] as const) {
      const sealed = await provider(mode).seal(state, newKey(), {
        gameId: state.id,
        objectId: "canonical",
        revision: state.revision,
        epoch: 1,
        keyVersion: 1,
      });
      expect(
        new TextEncoder().encode(JSON.stringify(sealed)).length,
      ).toBeLessThan(950000);
    }
  }
  console.info("Route capacity fixture", { admitted, refused });
});

test("split occupation routes each output by layer and releases escrow once with recipient-only loss reports", () => {
  const { c, home, first, id } = formed();
  const ship = c.military!.fleets[id];
  ship.infantry = 0;
  Object.assign(c.systems[first.id], {
    orbit: "p1",
    surface: "p1",
    fighters: 2,
    infantry: 3,
    markets: 1,
    camps: 0,
    bases: 1,
    stations: 1,
  });
  let occupied = advance(route(c, id, [first.id]), 4);
  const initial = occupied.military!.arrivals!.p0[0];
  expect(initial).toMatchObject({
    fightersBefore: 4,
    fightersAfter: 3,
    orbit: 0,
    surface: 1,
    detail: {
      format: 1,
      transportLosses: 0,
      groundLosses: 0,
      landed: 0,
      orbitBefore: 1,
      surfaceBefore: 1,
    },
  });
  expect(initial.detail).not.toHaveProperty("releasedEscrowMilli");
  const invader = campaignView(occupied, "p0"),
    defender = campaignView(occupied, "p1");
  const orbitHolding = invader.holdings.find((h) => h.starId === first.id)!;
  expect(orbitHolding).not.toHaveProperty("infantry");
  expect(orbitHolding).not.toHaveProperty("markets");
  expect(orbitHolding).not.toHaveProperty("escrowMilli");
  expect(
    defender.holdings.find((h) => h.starId === first.id),
  ).not.toHaveProperty("fighters");
  expect(occupied.economy!.ledger.p0.scienceMilli).toBeGreaterThan(0);
  expect(occupied.economy!.ledger.p1.infantry).toBeGreaterThan(0);
  expect(occupied.economy!.ledger.p1.creditsMilli).toBe(0);
  expect(occupied.systems[first.id].escrowMilli).toBeGreaterThan(0);
  const prior = structuredClone(occupied);
  occupied = advance(occupied);
  expect(occupied.systems[first.id].escrowMilli).toBeGreaterThan(
    prior.systems[first.id].escrowMilli,
  );
  expect(occupied.economy!.ledger.p0.releasedEscrowMilli).toBe(0);
  // An ordinary second formation transports the available infantry; high own
  // melee is a declared unit fixture, not an opposing value in the report.
  occupied.economy!.research.p0.levels.melee = 10;
  occupied.systems[home.id].infantry = 20;
  occupied = advance(
    orderFleet(
      occupied,
      {
        kind: "fleet.form",
        expectedRevision: occupied.revision,
        starId: home.id,
        fighters: 2,
        infantry: 20,
      },
      "p0",
      "second-wave",
      0,
    ),
  );
  const secondId = fleetIdentity("p0", "second-wave");
  const beforeArrival = advance(route(occupied, secondId, [first.id]), 3);
  const escrow = beforeArrival.systems[first.id].escrowMilli;
  const conquered = advance(beforeArrival);
  expect(conquered.systems[first.id]).toMatchObject({
    orbit: "p0",
    surface: "p0",
    escrowMilli: 0,
  });
  const report = conquered.military!.arrivals!.p0[0];
  expect(report.detail!.releasedEscrowMilli).toBe(escrow);
  expect(report.detail!.landed).toBe(20);
  expect(report.detail!.groundLosses).toBe(
    report.infantryBefore - report.infantryAfter,
  );
  expect(conquered.economy!.ledger.p0.releasedEscrowMilli).toBe(escrow);
  const opposing = conquered.military!.arrivals!.p1[0];
  expect(opposing.detail).not.toHaveProperty("releasedEscrowMilli");
  expect(opposing.detail!.melee).toBe(1);
  expect(opposing.detail!.groundAfter).toBe(0);
  expect(campaignView(conquered, "p2").military).not.toHaveProperty("arrivals");
  expect(advance(conquered).economy!.ledger.p0.releasedEscrowMilli).toBe(0);
  expect(advance(JSON.parse(JSON.stringify(beforeArrival)))).toEqual(conquered);
});

test("arrival history deduplicates repeated snapshots while retaining older recorded details", async () => {
  const { arrivalRecords } = await import("../src/lib/arrival-reports");
  const { c, first, id } = formed();
  const arrived = advance(route(c, id, [first.id]), 4);
  const view = campaignView(arrived, "p0");
  const legacy = structuredClone(view);
  delete legacy.military!.arrivals![0].detail;
  expect(arrivalRecords([legacy])[0].report.detail).toBeUndefined();
  expect(
    arrivalRecords([view, { ...view, revision: view.revision + 1 }, view]),
  ).toHaveLength(1);
  expect(
    arrivalRecords([campaignView(advance(arrived), "p0"), view])[0].report,
  ).toEqual(view.military!.arrivals![0]);
  expect(arrivalRecords([campaignView(arrived, "p2")])).toEqual([]);
});
