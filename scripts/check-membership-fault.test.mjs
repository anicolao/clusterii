import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  faultSources,
  validateFaultScope,
  faultPlan,
  assertRestorable,
} from "../tests/browser/story-helpers/membership-fault.mjs";
const scope = {
  project: "demo-clusterii",
  host: "127.0.0.1:18080",
  origin: "http://127.0.0.1:4173",
  sources: faultSources,
};
const target = {
  gameId: "real-game",
  uid: "owner",
  head: {
    phase: "active",
    mode: "mock",
    encryptionEpoch: 1,
    revision: 6,
    memberUids: ["owner", "peer", "third", "fourth"],
    envelope: { gameId: "real-game", mode: "mock", ciphertext: "unchanged" },
  },
  membership: { gameId: "real-game", phase: "active", revision: 6 },
  directory: {
    name: "Scheduled story membership fault phone",
    phase: "active",
  },
};
test("membership fault requires demo loopback and reviewed source hashes", () => {
  validateFaultScope(scope);
  for (const mutation of [
    { project: "clusterii-20261020" },
    { host: undefined },
    { host: "example.com:18080" },
    { origin: "https://anicolao.github.io" },
    { sources: {} },
  ])
    assert.throws(
      () => validateFaultScope({ ...scope, ...mutation }),
      /confined/,
    );
  for (const [path, hash] of Object.entries(faultSources))
    assert.equal(
      createHash("sha256").update(readFileSync(path)).digest("hex"),
      hash,
    );
});
test("fault changes only target authorization membership and preserves original metadata", () => {
  const original = structuredClone(target),
    plan = faultPlan(target);
  assert.deepEqual(target, original);
  assert.deepEqual(plan.during, {
    ...target.head,
    memberUids: ["peer", "third", "fourth"],
  });
  assert.deepEqual(plan.membership, target.membership);
  assertRestorable(plan, plan.during, undefined, target.directory);
});
test("fault rejects unrelated, inactive, real-provider, mismatched and nonmember targets", () => {
  for (const mutation of [
    { gameId: "wrong" },
    { uid: "outsider" },
    { uid: "owner/other" },
    { directory: { ...target.directory, name: "Ordinary campaign" } },
    { head: { ...target.head, phase: "waiting" } },
    { head: { ...target.head, mode: "real" } },
    { membership: { ...target.membership, revision: 5 } },
  ])
    assert.throws(() => faultPlan({ ...target, ...mutation }), /Invalid/);
});
test("restoration refuses concurrent head, membership or directory writes", () => {
  const plan = faultPlan(target);
  for (const head of [
    { ...plan.during, revision: 7 },
    { ...plan.during, memberUids: [] },
    {
      ...plan.during,
      envelope: { ...plan.during.envelope, ciphertext: "changed" },
    },
  ])
    assert.throws(
      () => assertRestorable(plan, head, undefined, plan.directory),
      /concurrent/,
    );
  assert.throws(
    () =>
      assertRestorable(plan, plan.during, target.membership, plan.directory),
    /concurrent/,
  );
  assert.throws(
    () =>
      assertRestorable(plan, plan.during, undefined, {
        ...plan.directory,
        phase: "finished",
      }),
    /concurrent/,
  );
});
