import { expect, test } from "bun:test";
import { newKey, provider, wrap, unwrap } from "../shared/crypto";
import { profileContext, reduceProfile } from "../shared/profile";
const codec = provider("mock");
const context = profileContext("alice", 1);
test("JSON, Unicode, escaping, null and newlines round trip through object and grant", async () => {
  const key = newKey(),
    kek = newKey();
  const value = {
    name: '银河\n"A\\B"🌌',
    nested: [null, true, 27, { text: "é" }],
  };
  const envelope = await codec.seal(value, key, context);
  const grant = await wrap(key, kek, "alice", context, "mock");
  expect(
    await codec.open<typeof value>(
      envelope,
      await unwrap(grant, kek, "alice", context, "mock"),
      context,
    ),
  ).toEqual(value);
});
test("wrong keys, modified bodies, game, recipient, epoch and revision fail closed", async () => {
  const key = newKey(),
    kek = newKey();
  const envelope = await codec.seal({ alias: "Alice" }, key, context);
  const grant = await wrap(key, kek, "alice", context, "mock");
  await expect(codec.open(envelope, newKey(), context)).rejects.toThrow(
    "Wrong key",
  );
  await expect(
    codec.open(
      { ...envelope, ciphertext: envelope.ciphertext + "a" },
      key,
      context,
    ),
  ).rejects.toThrow();
  for (const other of [
    { ...context, gameId: "other" },
    { ...context, epoch: 2 },
    { ...context, revision: 2 },
    { ...context, objectId: "other" },
    { ...context, keyVersion: 2 },
  ])
    await expect(codec.open(envelope, key, other)).rejects.toThrow();
  await expect(unwrap(grant, kek, "bob", context, "mock")).rejects.toThrow();
  await expect(
    unwrap(grant, newKey(), "alice", context, "mock"),
  ).rejects.toThrow();
  expect(() => provider("real")).toThrow("No fallback");
});
test("profile reducer validates data and rejects lost updates", () => {
  const action = {
    kind: "profile.set",
    expectedRevision: 0,
    profile: { alias: "  E\u0301toile  ", portrait: "G1" },
  };
  expect(reduceProfile(0, action)).toEqual({ alias: "Étoile", portrait: "G1" });
  expect(() => reduceProfile(1, action)).toThrow("conflict");
  for (const alias of ["a", "x".repeat(25), "hello\nworld", "a\u200bb"])
    expect(() =>
      reduceProfile(0, { ...action, profile: { alias, portrait: "G1" } }),
    ).toThrow("invalid");
  expect(() =>
    reduceProfile(0, {
      ...action,
      profile: { alias: "Alice", portrait: "fake" },
    }),
  ).toThrow();
});

import {requestedCampaign, campaignHref} from '../src/lib/campaign-navigation';
test('campaign sign-in return accepts only canonical IDs and retains the preview base',()=>{
  const id='12345678-1234-4321-9876-123456789abc';
  expect(requestedCampaign(`?campaign=${id}`)).toBe(id);
  expect(campaignHref('/clusterii/pr8',id)).toBe(`/clusterii/pr8/campaigns/?campaign=${id}`);
  for(const unsafe of ['https://example.test','//example.test','../admin','-'.repeat(36),'123',''])expect(requestedCampaign(`?campaign=${encodeURIComponent(unsafe)}`)).toBe(null);
});
