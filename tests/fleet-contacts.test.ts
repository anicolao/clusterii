import { expect, test } from "bun:test";
import {
  createCampaign,
  joinOrLeave,
  startCampaign,
  campaignView,
} from "../shared/campaign";
import { orderFleet } from "../shared/fleets";
import { orderRoute } from "../shared/travel";
import { produce } from "../shared/production";
import {
  acquireFleetScans,
  fleetContactView,
  lastFleetContacts,
} from "../shared/fleet-contacts";
import { drawRange, assertObservationBudget } from "../shared/observations";
function fixture() {
  let c = createCampaign(
    "contacts",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Contact evidence",
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
  for (const [i, s] of c.seats.entries()) {
    const h = c.galaxy.stars.find((x) => x.id === s.home)!;
    h.x = i * 1000;
    h.y = 0;
    h.z = 0;
  }
  for (const seat of c.seats)
    c = orderFleet(
      c,
      {
        kind: "fleet.form",
        expectedRevision: c.revision,
        starId: seat.home!,
        fighters: 4,
        infantry: 6,
      },
      seat.uid,
      `private-command-${seat.uid}`,
      0,
    );
  const next = produce(c, c.economy!);
  return { before: c, next: { ...next.campaign, economy: next.economy } };
}
test("fleet scans persist one target draw and project exact acquired facts without private identifiers or routes", () => {
  const { before, next } = fixture();
  let calls = 0;
  acquireFleetScans(before, next, () => {
    calls++;
    return 0;
  });
  expect(calls).toBe(12);
  for (const { uid } of next.seats) {
    const contacts = fleetContactView(next, uid)!;
    expect(contacts).toHaveLength(3);
    expect(next.fleetScans!.draws[uid].filter((x) => x === null)).toHaveLength(
      1,
    );
    for (const contact of contacts) {
      expect(contact).toMatchObject({
        observedTick: 1,
        fighters: 4,
        infantry: 6,
      });
      expect(Object.keys(contact).sort()).toEqual([
        "fighters",
        "id",
        "infantry",
        "number",
        "observedTick",
        "owner",
        "x",
        "y",
        "z",
      ]);
    }
    const serialized = JSON.stringify(contacts);
    for (const secret of [
      "private-command",
      '"uid"',
      '"travel"',
      '"waypoints"',
      `Envoy ${uid.slice(1)}`,
    ])
      expect(serialized).not.toContain(secret);
    expect(campaignView(next, uid).fleetContacts).toEqual(contacts);
  }
});
test("failed scans publish no contact; stale history retains only acquired positions", () => {
  const { before, next } = fixture();
  acquireFleetScans(before, next, () => 0);
  const old = campaignView(next, "p0"),
    result = produce(next, next.economy!),
    after = { ...result.campaign, economy: result.economy };
  acquireFleetScans(next, after, () => drawRange - 1);
  const now = campaignView(after, "p0");
  expect(now.fleetContacts).toEqual([]);
  expect(lastFleetContacts([now, old])).toEqual(old.fleetContacts!);
  const encoded = JSON.stringify(lastFleetContacts([now, old]));
  expect(encoded).not.toContain('"observedTick":2');
  const later = structuredClone(old);
  later.fleetContacts![0].observedTick = 3;
  later.fleetContacts![0].x += 25;
  expect(
    lastFleetContacts([old, later, old]).find(
      (c) => c.id === later.fleetContacts![0].id,
    ),
  ).toEqual(later.fleetContacts![0]);
});
test("scan outcomes survive JSON reload and future navigation orders without exposing hidden destinations", () => {
  const { before, next } = fixture();
  acquireFleetScans(before, next, () => 0);
  const recovered = JSON.parse(JSON.stringify(next));
  expect(fleetContactView(recovered, "p0")).toEqual(
    fleetContactView(next, "p0"),
  );
  const target = Object.values(next.military!.fleets).find(
    (f) => f.uid === "p1",
  )!;
  next.military!.orders.push({
    id: "secret-next-route",
    uid: "p1",
    sequence: 50,
    effectiveTick: 2,
    fleetId: target.id,
    starId: target.starId,
    fighters: 4,
    infantry: 6,
    waypoints: [next.galaxy.stars[0].id],
  });
  expect(fleetContactView(next, "p0")).toEqual(
    fleetContactView(recovered, "p0"),
  );
  expect(JSON.stringify(campaignView(next, "p0"))).not.toContain(
    "secret-next-route",
  );
});
test("frozen scanning level, missing sensors, invalid draws and legacy capability are explicit", () => {
  const { before, next } = fixture();
  before.economy!.research.p0.levels.scanning = 0;
  next.economy!.research.p0.levels.scanning = 100;
  acquireFleetScans(before, next, () => 0);
  expect(fleetContactView(next, "p0")).toEqual([]);
  for (const bad of [-1, drawRange, 0.5])
    expect(() => acquireFleetScans(before, next, () => bad)).toThrow(
      "Invalid fleet scan draw",
    );
  delete before.fleetContactsVersion;
  delete next.fleetContactsVersion;
  delete next.fleetScans;
  acquireFleetScans(before, next, () => {
    throw new Error("Legacy must not scan");
  });
  expect(fleetContactView(next, "p0")).toBeNull();
});
test("incomplete persisted scan matrices fail closed instead of exposing an unverified contact", () => {
  const { before, next } = fixture();
  acquireFleetScans(before, next, () => 0);
  expect(() => assertObservationBudget(next)).not.toThrow();
  const correct = [...next.fleetScans!.draws.p0];
  const enemy = correct.findIndex(d => d !== null);
  next.fleetScans!.draws.p0[enemy] = drawRange;
  expect(() => fleetContactView(next, "p0")).toThrow("Invalid persisted fleet scan draw");
  next.fleetScans!.draws.p0 = correct;
  next.fleetScans!.draws.p0.pop();
  expect(() => fleetContactView(next, "p0")).toThrow("Incomplete fleet scans");
});

test("moving contacts use the confirmed position and never publish the planned destination", () => {
  const { before, next } = fixture();
  acquireFleetScans(before, next, () => 0);
  const fleet = Object.values(next.military!.fleets).find(
      (f) => f.uid === "p1",
    )!,
    home = next.galaxy.stars.find((s) => s.id === fleet.starId)!,
    destination = next.galaxy.stars.find(
      (s) => !next.galaxy.homes.includes(s.id),
    )!;
  destination.x = home.x + 6;
  destination.y = home.y;
  destination.z = home.z;
  const queued = orderRoute(
    next,
    {
      kind: "fleet.route",
      expectedRevision: next.revision,
      fleetId: fleet.id,
      waypoints: [destination.id],
    },
    "p1",
    "hidden-route",
    0,
  );
  const dep = produce(queued, queued.economy!),
    departed = { ...dep.campaign, economy: dep.economy };
  acquireFleetScans(queued, departed, () => 0);
  const mid = produce(departed, departed.economy!),
    moving = { ...mid.campaign, economy: mid.economy };
  acquireFleetScans(departed, moving, () => 0);
  const contact = fleetContactView(moving, "p0")!.find(
    (c) => c.owner === "Envoy 1",
  )!;
  expect(contact.x).toBe(home.x + 2);
  expect(contact.observedTick).toBe(3);
  const serialized = JSON.stringify(contact);
  expect(serialized).not.toContain(destination.id);
  expect(serialized).not.toContain("hidden-route");
  expect(serialized).not.toContain(fleet.id);
});
test("an empire without an orbital or fleet sensor acquires no contacts and consumes no target draw", () => {
  const { before, next } = fixture();
  for (const system of Object.values(next.systems))
    if (system.orbit === "p0") system.orbit = null;
  for (const fleet of Object.values(next.military!.fleets))
    if (fleet.uid === "p0") delete next.military!.fleets[fleet.id];
  acquireFleetScans(before, next, (uid) => {
    expect(uid).not.toBe("p0");
    return 0;
  });
  expect(next.fleetScans!.draws.p0.every((d) => d === null)).toBe(true);
  expect(fleetContactView(next, "p0")).toEqual([]);
});
