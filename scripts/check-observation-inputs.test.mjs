import { test } from "node:test";
import assert from "node:assert/strict";
import {
  observationInputs,
  instrumentObservationSource,
} from "../tests/browser/story-helpers/observation-inputs.mjs";
const campaign = {
  id: "real-game",
  name: "Scheduled story observation phone",
  seed: "0123456789abcdef".repeat(4),
  seats: [{ uid: "actual-player" }, { uid: "other-player" }],
};
test("fixed scan entropy keeps star/tick/seed and distinct seats without mutating real identities", () => {
  const before = structuredClone(campaign);
  assert.deepEqual(
    observationInputs(campaign, campaign.id, "actual-player", "star-7", 2),
    [campaign.seed, "illustrated-observation", "seat-0", "star-7", 2],
  );
  assert.deepEqual(
    observationInputs(campaign, campaign.id, "other-player", "star-7", 2),
    [campaign.seed, "illustrated-observation", "seat-1", "star-7", 2],
  );
  assert.deepEqual(campaign, before);
  for (const bad of [
    { ...campaign, id: "wrong" },
    { ...campaign, seats: [] },
    { ...campaign, seed: "f".repeat(64) },
  ])
    assert.throws(
      () => observationInputs(bad, campaign.id, "actual-player", "star-7", 2),
      /Invalid/,
    );
});
test("unrelated campaigns retain every original entropy input", () => {
  const other = {
    ...campaign,
    name: "Regular development",
    seed: "f".repeat(64),
  };
  assert.deepEqual(
    observationInputs(other, "actual-game", "actual-player", "star-7", 2),
    [other.seed, "actual-game", "actual-player", "star-7", 2],
  );
});
test("instrumentation fails closed outside demo loopback and on changed service signatures", () => {
  const source = "observationDraw(current.seed, id, uid, starId, tick)",
    env = {
      GCLOUD_PROJECT: "demo-clusterii",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
    };
  for (const bad of [
    {},
    { ...env, GCLOUD_PROJECT: "production" },
    { ...env, FIRESTORE_EMULATOR_HOST: "remote:18080" },
  ])
    assert.throws(
      () => instrumentObservationSource(source, bad),
      /isolated demo/,
    );
  for (const bad of ["changed", source + source])
    assert.throws(
      () => instrumentObservationSource(bad, env),
      /signature changed/,
    );
  assert.match(
    instrumentObservationSource(source, env),
    /observationDraw\(\.\.\.__observationInputs/,
  );
});
