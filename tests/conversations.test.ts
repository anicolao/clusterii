import { expect, test } from "bun:test";
import {
  createCampaign,
  joinOrLeave,
  startCampaign,
  campaignView,
  type Campaign,
} from "../shared/campaign";
import {
  converse,
  conversationView,
  selectedHistoryReferences,
  type ConversationAction,
} from "../shared/conversations";
import { conversationMessages } from "../src/lib/conversation-history";
function fixture() {
  let c = createCampaign(
    "diplomacy",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Private talks",
      capacity: 4,
      mode: "mock",
      development: true,
    },
    "f".repeat(64),
    0,
  );
  for (const [i, faction] of (
    ["heliac", "pelagic", "vesper", "dracon"] as const
  ).entries())
    c = joinOrLeave(
      c,
      { kind: "campaign.join", expectedRevision: c.revision, faction },
      `u${i}`,
      { alias: `Commander ${i}`, portrait: "G1" },
      0,
    );
  return startCampaign(c, c.startAt!);
}
function apply(
  c: Campaign,
  action: Record<string, unknown>,
  uid = "u0",
  id: string = crypto.randomUUID(),
) {
  return converse(
    c,
    { expectedRevision: c.revision, ...action },
    uid,
    id,
    1000,
  );
}
function created() {
  const c = apply(
    fixture(),
    { kind: "conversation.create", title: "Nacre talks" },
    "u0",
    "create",
  );
  return { c, id: "room:create" };
}
function send(c: Campaign, id: string, body: string, uid = "u0") {
  return apply(
    c,
    {
      kind: "conversation.send",
      roomId: id,
      keyVersion: c.diplomacy!.rooms[id].keyVersion,
      body,
    },
    uid,
  );
}
function invite(c: Campaign, id: string, seat = 1) {
  return apply(c, {
    kind: "conversation.invite",
    roomId: id,
    roomRevision: c.diplomacy!.rooms[id].revision,
    seat,
    scope: "future",
  });
}
function accept(c: Campaign, id: string, uid = "u1") {
  return apply(
    c,
    {
      kind: "conversation.accept",
      roomId: id,
      roomRevision: c.diplomacy!.rooms[id].revision,
    },
    uid,
  );
}

test("future-only admission never grants an invited player earlier message plaintext", () => {
  let { c, id } = created();
  c = send(c, id, "Earlier secret");
  const before = structuredClone(c);
  c = invite(c, id);
  expect(conversationView(c, "u1")[0]).toMatchObject({
    invited: true,
    member: false,
    message: null,
    sequence: 0,
  });
  expect(JSON.stringify(conversationView(c, "u1"))).not.toContain(
    "Earlier secret",
  );
  expect(conversationView(c, "u2")).toEqual([]);
  c = accept(c, id);
  expect(c.diplomacy!.rooms[id].keyVersion).toBe(2);
  expect(conversationView(c, "u1")[0].message).toBeNull();
  c = send(c, id, "Future message");
  expect(conversationView(c, "u1")[0].message).toMatchObject({
    body: "Future message",
    author: 0,
    sequence: 2,
    keyVersion: 2,
  });
  expect(conversationView(c, "u1")[0].unread).toBe(true);
  expect(conversationView(c, "u0")[0].unread).toBe(false);
  expect(Object.keys(conversationView(c, "u1")[0].message!).sort()).toEqual([
    "at",
    "author",
    "body",
    "id",
    "keyVersion",
    "sequence",
    "sourceRevision",
  ]);
  expect(JSON.stringify(conversationView(c, "u1"))).not.toContain('"u0"');
  expect(before.diplomacy!.rooms[id].message!.body).toBe("Earlier secret");
});
test("concurrent senders share one server sequence without rejecting unrelated campaign revisions", () => {
  let { c, id } = created();
  c = accept(invite(c, id), id);
  const base = c.revision,
    keyVersion = c.diplomacy!.rooms[id].keyVersion;
  const records = [];
  for (const [uid, body] of [
    ["u0", "First"],
    ["u1", "Second"],
    ["u0", "Third"],
  ]) {
    c = converse(
      c,
      {
        kind: "conversation.send",
        expectedRevision: base,
        roomId: id,
        keyVersion,
        body,
      },
      uid,
      body,
      1000,
    );
    records.push(campaignView(c, "u1"));
  }
  expect(c.diplomacy!.rooms[id].sequence).toBe(3);
  expect(conversationMessages(records, id).map((m) => m.body)).toEqual([
    "First",
    "Second",
    "Third",
  ]);
  expect(conversationMessages([...records, ...records], id)).toHaveLength(3);
  expect(conversationView(c, "u1")[0].unread).toBe(true);
  const read = apply(
    c,
    { kind: "conversation.read", roomId: id, keyVersion, sequence: 2 },
    "u1",
  );
  expect(conversationView(read, "u1")[0].unread).toBe(true);
  const allRead = apply(
    read,
    { kind: "conversation.read", roomId: id, keyVersion, sequence: 3 },
    "u1",
  );
  expect(conversationView(allRead, "u1")[0].unread).toBe(false);
  expect(conversationView(allRead, "u0")[0].unread).toBe(true);
  expect(() =>
    apply(
      c,
      { kind: "conversation.read", roomId: id, keyVersion, sequence: 4 },
      "u1",
    ),
  ).toThrow("conversation-invalid");
});
test("removal fences stale sends and rejoining grants no messages sent during absence", () => {
  let { c, id } = created();
  c = accept(invite(c, id), id);
  c = send(c, id, "Already received");
  const earlier = campaignView(c, "u1"),
    version = c.diplomacy!.rooms[id].keyVersion;
  c = apply(c, {
    kind: "conversation.remove",
    roomId: id,
    roomRevision: c.diplomacy!.rooms[id].revision,
    seat: 1,
  });
  expect(conversationView(c, "u1")).toEqual([]);
  expect(() =>
    apply(
      c,
      {
        kind: "conversation.send",
        roomId: id,
        keyVersion: version,
        body: "Stale intrusion",
      },
      "u1",
    ),
  ).toThrow("permission");
  c = send(c, id, "During absence");
  c = accept(invite(c, id), id);
  expect(conversationView(c, "u1")[0].message).toBeNull();
  expect(() =>
    apply(
      c,
      {
        kind: "conversation.send",
        roomId: id,
        keyVersion: version,
        body: "Stale generation",
      },
      "u1",
    ),
  ).toThrow("conflict");
  c = send(c, id, "After rejoin");
  const received = conversationMessages([earlier, campaignView(c, "u1")], id);
  expect(received.map((m) => m.body)).toEqual([
    "Already received",
    "After rejoin",
  ]);
  expect(JSON.stringify(received)).not.toContain("During absence");
});
test("only the creator manages membership and closure; members leave without erasing earlier records", () => {
  let { c, id } = created();
  c = accept(invite(c, id), id);
  c = send(c, id, "Keep this record");
  for (const kind of [
    "conversation.invite",
    "conversation.remove",
    "conversation.close",
  ])
    expect(() =>
      apply(
        c,
        {
          kind,
          roomId: id,
          roomRevision: c.diplomacy!.rooms[id].revision,
          seat: 2,
          scope: "future",
        },
        "u1",
      ),
    ).toThrow("permission");
  expect(() =>
    apply(c, {
      kind: "conversation.leave",
      roomId: id,
      roomRevision: c.diplomacy!.rooms[id].revision,
    }),
  ).toThrow("permission");
  const original = campaignView(c, "u1");
  c = apply(
    c,
    {
      kind: "conversation.leave",
      roomId: id,
      roomRevision: c.diplomacy!.rooms[id].revision,
    },
    "u1",
  );
  expect(conversationView(c, "u1")).toEqual([]);
  expect(conversationMessages([original], id)[0].body).toBe("Keep this record");
  c = apply(c, {
    kind: "conversation.close",
    roomId: id,
    roomRevision: c.diplomacy!.rooms[id].revision,
  });
  expect(conversationView(c, "u0")[0].closed).toBe(true);
  expect(() => send(c, id, "Forbidden after closure")).toThrow(
    "conversation-closed",
  );
  expect(() => invite(c, id)).toThrow("conversation-closed");
  expect(() =>
    apply(c, {
      kind: "conversation.read",
      roomId: id,
      keyVersion: c.diplomacy!.rooms[id].keyVersion,
      sequence: 1,
    }),
  ).not.toThrow();
});
test("validation and room conflicts preserve authoritative state and never alter economic or military state", () => {
  let { c, id } = created();
  const initial = structuredClone(c);
  for (const body of [" ", "x".repeat(2001), "bad\u0000text"])
    expect(() => send(c, id, body)).toThrow("conversation-invalid");
  expect(() =>
    apply(c, {
      kind: "conversation.invite",
      roomId: id,
      roomRevision: 1,
      seat: 1,
      scope: "all",
    }),
  ).toThrow("conversation-invalid");
  c = invite(c, id);
  expect(() =>
    apply(c, {
      kind: "conversation.invite",
      roomId: id,
      roomRevision: 1,
      seat: 2,
      scope: "future",
    }),
  ).toThrow("conflict");
  const next = send(c, id, "  Two lines\n🌌星  ");
  expect(next.diplomacy!.rooms[id].message!.body).toBe("Two lines\n🌌星");
  for (const key of ["systems", "military", "empires", "economy"] as const)
    expect(next[key]).toEqual(initial[key]);
  expect(initial.diplomacy!.rooms[id].message).toBeUndefined();
  expect(() => send({ ...c, pausedAt: 1 }, id, "Paused")).toThrow("paused");
  expect(() =>
    send({ ...c, conversationsVersion: undefined }, id, "Legacy"),
  ).toThrow("conversation-unavailable");
  expect(
    conversationMessages(
      [
        {
          ...campaignView(c, "u0"),
          conversations: undefined,
        } as unknown as ReturnType<typeof campaignView>,
      ],
      id,
    ),
  ).toEqual([]);
});

test("selected history requires explicit acceptance and projects only granted bodies", () => {
  let { c, id } = created();
  c = send(c, id, "Chosen earlier message");
  const chosen = {
    ...c.diplomacy!.rooms[id].message!,
    sourceRevision: c.revision,
  };
  c = send(c, id, "Unselected private message");
  const before = structuredClone(c);
  const invitation = {
    kind: "conversation.invite",
    expectedRevision: c.revision,
    roomId: id,
    roomRevision: c.diplomacy!.rooms[id].revision,
    seat: 1,
    scope: "selected",
    history: [{ id: chosen.id, revision: chosen.sourceRevision }],
  };
  c = converse(c, invitation, "u0", "selection-invitation", 2000, [chosen]);
  const invited = conversationView(c, "u1")[0];
  expect(invited.invitation).toMatchObject({
    id: "selection-invitation",
    scope: "selected",
    messages: [{ id: chosen.id, author: 0 }],
  });
  expect(invited.sharedMessages).toEqual([]);
  expect(JSON.stringify(invited)).not.toContain(chosen.body);
  expect(JSON.stringify(invited)).not.toContain("Unselected private message");
  const snapshot = structuredClone(c);
  for (const historyConsent of [undefined, "older-invitation"]) {
    expect(() =>
      apply(
        c,
        {
          kind: "conversation.accept",
          roomId: id,
          roomRevision: c.diplomacy!.rooms[id].revision,
          historyConsent,
        },
        "u1",
      ),
    ).toThrow("conversation-history-consent");
    expect(c).toEqual(snapshot);
  }
  c = apply(
    c,
    {
      kind: "conversation.accept",
      roomId: id,
      roomRevision: c.diplomacy!.rooms[id].revision,
      historyConsent: "selection-invitation",
    },
    "u1",
  );
  const accepted = campaignView(c, "u1");
  expect(conversationMessages([accepted], id).map((m) => m.body)).toEqual([
    chosen.body,
  ]);
  expect(JSON.stringify(accepted.conversations)).not.toContain(
    "Unselected private message",
  );
  expect(JSON.stringify(accepted.conversations)).not.toContain('"u0"');
  expect(conversationView(c, "u2")).toEqual([]);
  expect(conversationView(c, "u0")[0].sharedMessages).toEqual([]);
  expect(accepted.conversations[0].unread).toBe(true);
  c = apply(
    c,
    {
      kind: "conversation.read",
      roomId: id,
      keyVersion: c.diplomacy!.rooms[id].keyVersion,
      sequence: chosen.sequence,
    },
    "u1",
  );
  expect(conversationView(c, "u1")[0].unread).toBe(false);
  for (const key of ["systems", "military", "empires", "economy"] as const)
    expect(c[key]).toEqual(before[key]);
  c = apply(c, {
    kind: "conversation.remove",
    roomId: id,
    roomRevision: c.diplomacy!.rooms[id].revision,
    seat: 1,
  });
  c = send(c, id, "Absence secret");
  c = accept(invite(c, id), id);
  expect(
    conversationMessages([accepted, campaignView(c, "u1")], id).map(
      (m) => m.body,
    ),
  ).toEqual([chosen.body]);
});

test("selected references reject invalid scopes, stale membership and unbounded or duplicate history", () => {
  let { c, id } = created();
  c = send(c, id, "Historical");
  const message = {
    ...c.diplomacy!.rooms[id].message!,
    sourceRevision: c.revision,
  };
  const action = {
    kind: "conversation.invite",
    expectedRevision: c.revision,
    roomId: id,
    roomRevision: c.diplomacy!.rooms[id].revision,
    seat: 1,
    scope: "selected",
    history: [{ id: message.id, revision: c.revision }],
  };
  for (const history of [
    [],
    [...action.history, ...action.history],
    [{ id: "x", revision: c.revision + 1 }],
    Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      revision: c.revision,
    })),
  ])
    expect(() =>
      selectedHistoryReferences(c, { ...action, history }, "u0"),
    ).toThrow("conversation-history");
  expect(() => selectedHistoryReferences(c, action, "u1")).toThrow(
    "permission",
  );
  expect(() =>
    selectedHistoryReferences({ ...c, pausedAt: 1 }, action, "u0"),
  ).toThrow("paused");
  expect(() =>
    selectedHistoryReferences(c, { ...action, roomRevision: 0 }, "u0"),
  ).toThrow("conflict");
  expect(() =>
    selectedHistoryReferences(
      { ...c, conversationSharingVersion: undefined },
      action,
      "u0",
    ),
  ).toThrow("conversation-sharing-unavailable");
  expect(() =>
    converse(c, action, "u0", "bad", 1, [{ ...message, id: "wrong" }]),
  ).toThrow("conversation-history");
  expect(() =>
    converse(c, action, "u0", "bad", 1, [{ ...message, recipients: ["u2"] }]),
  ).toThrow("conversation-history");
  expect(() =>
    converse(c, { ...action, scope: "future" }, "u0", "bad", 1, [message]),
  ).toThrow("conversation-history");
});
