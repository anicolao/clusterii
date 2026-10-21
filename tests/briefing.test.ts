import { expect, test } from "bun:test";
import {
  createCampaign,
  orderConstruction,
  joinOrLeave,
  startCampaign,
  campaignView,
  type Campaign,
} from "../shared/campaign";
import { acknowledgeVisit, visitReference } from "../shared/briefing";
import { converse } from "../shared/conversations";
import { rules } from "../shared/rules";
import { produce } from "../shared/production";
import { returnBriefing } from "../src/lib/return-briefing";
function fixture() {
  let c = createCampaign(
    "briefing",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Return journey",
      capacity: 4,
      mode: "mock",
      development: true,
    },
    "b".repeat(64),
    0,
  );
  for (const [i, faction] of (
    ["heliac", "pelagic", "vesper", "dracon"] as const
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
const advance = (c: Campaign) => {
  const result = produce(c, c.economy!);
  return { ...result.campaign, economy: result.economy };
};
test("visit checkpoints are private, monotonic and change no gameplay or message-read state", () => {
  const initial = fixture(),
    older = advance(initial),
    latest = advance(older);
  const action = {
    kind: "campaign.visit",
    expectedRevision: latest.revision,
    throughRevision: older.revision,
  };
  const saved = acknowledgeVisit(latest, action, "u0", 12345, older);
  expect(saved.visits!.u0).toEqual({
    revision: older.revision,
    tick: 1,
    at: 12345,
  });
  expect(campaignView(saved, "u0").lastVisit).toEqual(saved.visits!.u0);
  expect(campaignView(saved, "u1").lastVisit).toEqual(initial.visits!.u1);
  expect(JSON.stringify(campaignView(saved, "u1"))).not.toContain("12345");
  for (const key of [
    "systems",
    "empires",
    "economy",
    "military",
    "diplomacy",
  ] as const)
    expect(saved[key]).toEqual(latest[key]);
  const backwards = {
    ...action,
    expectedRevision: saved.revision,
    throughRevision: initial.revision,
  };
  expect(acknowledgeVisit(saved, backwards, "u0", 99999, initial)).toBe(saved);
  expect(acknowledgeVisit(saved, action, "u0", 99999, older)).toBe(saved);
  expect(
    acknowledgeVisit({ ...latest, pausedAt: 1 }, action, "u0", 12345, older)
      .pausedAt,
  ).toBe(1);
});
test("visit validation rejects forged periods and nonmembers without mutation", () => {
  const c = advance(fixture()),
    original = structuredClone(c),
    action = {
      kind: "campaign.visit",
      expectedRevision: c.revision,
      throughRevision: c.revision,
    };
  for (const throughRevision of [-1, 0, 0.5, c.revision + 1])
    expect(() =>
      visitReference(c, { ...action, throughRevision }, "u0"),
    ).toThrow("visit-invalid");
  expect(() => visitReference(c, { ...action, uid: "u1" }, "u0")).toThrow(
    "visit-invalid",
  );
  expect(() => visitReference(c, action, "outsider")).toThrow("permission");
  expect(() =>
    visitReference({ ...c, briefingVersion: undefined }, action, "u0"),
  ).toThrow("briefing-unavailable");
  expect(() =>
    acknowledgeVisit(c, action, "u0", 1, { ...c, id: "another-game" }),
  ).toThrow("visit-invalid");
  expect(() =>
    acknowledgeVisit(c, action, "u0", 1, {
      ...c,
      seats: c.seats.filter((s) => s.uid !== "u0"),
    }),
  ).toThrow("visit-invalid");
  expect(c).toEqual(original);
});
test("briefing requires an exact baseline, deduplicates production and reports layer losses explicitly", () => {
  const initial = fixture(),
    one = advance(initial),
    two = advance(one);
  const start = campaignView(initial, "u0"),
    first = campaignView(one, "u0"),
    last = campaignView(two, "u0");
  expect(returnBriefing(last, [first, last]).complete).toBe(false);
  expect(returnBriefing(last, [first, last]).events).toEqual([]);
  expect(returnBriefing(last, [start, last]).complete).toBe(false);
  expect(returnBriefing(last, [start, last]).events).toEqual([]);
  const full = returnBriefing(last, [start, first, last, last]);
  expect(full.complete).toBe(true);
  expect(
    full.events.filter((e) => e.category === "Economy").map((e) => e.tick),
  ).toEqual([1, 2]);
  const split = structuredClone(two);
  split.revision++;
  split.systems[split.seats[0].home!].orbit = "u1";
  const result = returnBriefing(campaignView(split, "u0"), [
    start,
    first,
    last,
  ]);
  expect(result.events.filter((e) => e.category === "Control")).toHaveLength(1);
  expect(result.events.find((e) => e.category === "Control")!.title).toContain(
    "orbit lost",
  );
  expect(JSON.stringify(result.events)).not.toContain('"u1"');
});
test("briefing includes only received message metadata and does not mark messages read", () => {
  let c = fixture();
  const start = campaignView(c, "u1"),
    records = [start];
  const apply = (
    action: Record<string, unknown>,
    uid = "u0",
    id: string = crypto.randomUUID(),
  ) => {
    c = converse(c, { expectedRevision: c.revision, ...action }, uid, id, 1000);
    records.push(campaignView(c, "u1"));
  };
  apply(
    { kind: "conversation.create", title: "Authorized room" },
    "u0",
    "room",
  );
  const roomId = "room:room";
  apply({
    kind: "conversation.send",
    roomId,
    keyVersion: 1,
    body: "Never shared",
  });
  apply({
    kind: "conversation.invite",
    roomId,
    roomRevision: c.diplomacy!.rooms[roomId].revision,
    seat: 1,
    scope: "future",
  });
  apply(
    {
      kind: "conversation.accept",
      roomId,
      roomRevision: c.diplomacy!.rooms[roomId].revision,
    },
    "u1",
  );
  apply({
    kind: "conversation.send",
    roomId,
    keyVersion: 2,
    body: "Received private body",
  });
  const before = structuredClone(c),
    view = campaignView(c, "u1"),
    summary = returnBriefing(view, [...records, ...records]);
  expect(summary.events.filter((e) => e.category === "Messages")).toHaveLength(
    1,
  );
  expect(JSON.stringify(summary.events)).not.toContain("Never shared");
  expect(JSON.stringify(summary.events)).not.toContain("Received private body");
  expect(view.conversations[0].unread).toBe(true);
  const visited = acknowledgeVisit(
    c,
    {
      kind: "campaign.visit",
      expectedRevision: c.revision,
      throughRevision: c.revision,
    },
    "u1",
    2000,
    c,
  );
  expect(campaignView(visited, "u1").conversations[0].unread).toBe(true);
  expect(visited.diplomacy).toEqual(before.diplomacy);
});

test("briefing retains construction completion once and excludes outcomes before the saved visit", () => {
  let c = fixture();
  const records = [campaignView(c, "u0")];
  c = orderConstruction(
    c,
    {
      kind: "construction.build",
      expectedRevision: c.revision,
      starId: c.seats[0].home!,
      type: "market",
    },
    "u0",
    "new-market",
    c.economy!.nextTickAt - 1,
  );
  records.push(campaignView(c, "u0"));
  for (let i = 0; i <= rules.developments.market.buildTicks; i++) {
    c = advance(c);
    records.push(campaignView(c, "u0"));
  }
  const summary = returnBriefing(campaignView(c, "u0"), records);
  expect(summary.complete).toBe(true);
  expect(
    summary.events.filter((event) => event.id === "construction:new-market"),
  ).toHaveLength(1);
  expect(
    summary.events.find((event) => event.id === "construction:new-market")!
      .title,
  ).toContain("market completed");
  c = acknowledgeVisit(
    c,
    {
      kind: "campaign.visit",
      expectedRevision: c.revision,
      throughRevision: c.revision,
    },
    "u0",
    123,
    c,
  );
  records.push(campaignView(c, "u0"));
  expect(returnBriefing(campaignView(c, "u0"), records).events).toEqual([]);
});
