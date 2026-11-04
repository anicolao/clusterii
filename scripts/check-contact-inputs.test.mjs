import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactInputs,
  instrumentContactSource,
} from "../tests/browser/story-helpers/contact-inputs.mjs";
const current = {
  id: "actual-game",
  name: "Scheduled story fleet contacts phone",
  seed: "0123456789abcdef".repeat(4),
  seats: [{ uid: "owner" }, { uid: "observer" }, { uid: "other" }],
};
const next = {
  ...current,
  economy: { tick: 1 },
  military: {
    fleets: {
      "actual-fleet": { uid: "owner", number: 1 },
      "other-fleet": { uid: "other", number: 1 },
    },
  },
};
test("contact entropy preserves real facts and distinguishes observers and same-number owners including a newly formed fleet", () => {
  const before = structuredClone([current, next]);
  assert.deepEqual(
    contactInputs(
      current,
      next,
      current.id,
      "observer",
      "fleet:actual-fleet",
      1,
    ),
    [
      current.seed,
      "illustrated-fleet-contacts",
      "seat-1",
      "fleet-seat-0-number-1",
      1,
    ],
  );
  assert.deepEqual(
    contactInputs(
      current,
      next,
      current.id,
      "observer",
      "fleet:other-fleet",
      1,
    ),
    [
      current.seed,
      "illustrated-fleet-contacts",
      "seat-1",
      "fleet-seat-2-number-1",
      1,
    ],
  );
  assert.equal(
    contactInputs(
      current,
      next,
      current.id,
      "other",
      "fleet:actual-fleet",
      1,
    )[2],
    "seat-2",
  );
  assert.deepEqual([current, next], before);
  for (const [id, uid, target, tick] of [
    ["wrong", "observer", "fleet:actual-fleet", 1],
    [current.id, "outsider", "fleet:actual-fleet", 1],
    [current.id, "observer", "missing", 1],
    [current.id, "observer", "fleet:actual-fleet", 2],
  ])
    assert.throws(
      () => contactInputs(current, next, id, uid, target, tick),
      /Invalid/,
    );
  for (const bad of [
    { ...next, id: "wrong" },
    { ...next, seed: "f".repeat(64) },
    {
      ...next,
      military: { fleets: { "actual-fleet": { uid: "missing", number: 1 } } },
    },
    {
      ...next,
      military: { fleets: { "actual-fleet": { uid: "owner", number: 0 } } },
    },
  ])
    assert.throws(
      () =>
        contactInputs(
          current,
          bad,
          current.id,
          "observer",
          "fleet:actual-fleet",
          1,
        ),
      /Invalid/,
    );
});
test("unrelated campaigns retain every production entropy input", () => {
  const other = {
    ...current,
    name: "Ordinary development",
    seed: "f".repeat(64),
  };
  assert.deepEqual(
    contactInputs(
      other,
      {},
      "real-game",
      "real-observer",
      "fleet:real-target",
      4,
    ),
    [other.seed, "real-game", "real-observer", "fleet:real-target", 4],
  );
});
test("contact instrumentation refuses non-demo, non-loopback and changed or duplicate signatures", () => {
  const env = {
      GCLOUD_PROJECT: "demo-clusterii",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
    },
    source = "observationDraw(current.seed, id, uid, target, tick)";
  for (const bad of [
    {},
    { ...env, GCLOUD_PROJECT: "live" },
    { ...env, FIRESTORE_EMULATOR_HOST: "remote:18080" },
  ])
    assert.throws(() => instrumentContactSource(source, bad), /isolated demo/);
  for (const bad of ["changed", source + source])
    assert.throws(() => instrumentContactSource(bad, env), /signature changed/);
  assert.match(
    instrumentContactSource(source, env),
    /observationDraw\(\.\.\.__contactInputs\(current, next/,
  );
});

test("route story contact draws are stable across generated IDs and viewport names", () => {
  let expected;
  for (const viewport of ["phone", "desktop", "large", "short"]) {
    const game = `random-game-${viewport}`;
    const observer = `random-observer-${viewport}`;
    const owner = `random-owner-${viewport}`;
    const fleet = `random-fleet-${viewport}`;
    const c = {
      ...current,
      id: game,
      name: `Scheduled story fleet route ${viewport}`,
    };
    const n = {
      ...c,
      seats: [{ uid: owner }, { uid: observer }],
      economy: { tick: 1 },
      military: { fleets: { [fleet]: { uid: owner, number: 1 } } },
    };
    const before = structuredClone([c, n]);
    const inputs = contactInputs(c, n, game, observer, `fleet:${fleet}`, 1);
    expected ??= inputs;
    assert.deepEqual(inputs, expected);
    assert.equal(inputs[1], "illustrated-fleet-route");
    assert.deepEqual([c, n], before);
    assert.throws(
      () => contactInputs(c, n, game, observer, `fleet:${fleet}`, 2),
      /Invalid/,
    );
  }
  for (const name of [
    "Scheduled story fleet route phone extra",
    "Scheduled story fleet route mobile",
    "Ordinary campaign",
  ]) {
    assert.deepEqual(
      contactInputs({ ...current, name }, {}, "game", "uid", "target", 9),
      [current.seed, "game", "uid", "target", 9],
    );
  }
});
