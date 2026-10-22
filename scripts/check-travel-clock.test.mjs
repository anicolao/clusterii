import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fleetTime,
  fleetStoryPrefix,
} from "../tests/browser/story-helpers/fleet-clock.mjs";
import {
  initialize,
  load,
} from "../tests/browser/story-helpers/emulator-travel-clock-loader.mjs";
const target = "file:///isolated/shared/travel.js";
initialize({ target });
const source =
  "export function orderRoute(current, raw, uid, id, now) { return {current, raw, uid, id, now}; }";
test("travel story clock preserves unrelated campaigns and advances only with confirmed boundaries", () => {
  for (const c of [
    null,
    {},
    { name: "Scheduled story dawn" },
    { name: fleetStoryPrefix },
  ])
    assert.equal(fleetTime(c, 123), 123);
  for (const tick of [0, 1, 8])
    assert.equal(
      fleetTime(
        {
          name: fleetStoryPrefix + "normal",
          economy: { nextTickAt: 1800000 + tick * 900000 },
        },
        123,
      ),
      900001 + tick * 900000,
    );
});
test("travel loader fails closed outside demo runtime and preserves all command inputs", async () => {
  const original = {
    FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
    GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
  };
  try {
    const result = { format: "module", source };
    assert.equal(await load("file:///auth.js", {}, async () => result), result);
    for (const [emulator, project] of [
      ["false", "demo-clusterii"],
      ["true", "production"],
    ]) {
      process.env.FUNCTIONS_EMULATOR = emulator;
      process.env.GCLOUD_PROJECT = project;
      await assert.rejects(
        load(target, {}, async () => result),
        /confined/,
      );
    }
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.GCLOUD_PROJECT = "demo-clusterii";
    const transformed = await load(target, {}, async () => result);
    const fixture = await import(
      `data:text/javascript,${encodeURIComponent(transformed.source)}`
    );
    const current = {
        name: fleetStoryPrefix + "normal",
        economy: { nextTickAt: 1800000 },
      },
      raw = {
        kind: "fleet.route",
        expectedRevision: 9,
        fleetId: "real-fleet",
        waypoints: ["real-star"],
      };
    assert.deepEqual(
      fixture.orderRoute(current, raw, "real-user", "original-id", 555),
      { current, raw, uid: "real-user", id: "original-id", now: 900001 },
    );
    assert.equal(
      fixture.orderRoute({ name: "ordinary" }, raw, "user", "id", 555).now,
      555,
    );
    await assert.rejects(
      load(target, {}, async () => ({
        ...result,
        source: source.replace("orderRoute(", "changed("),
      })),
      /signature changed/,
    );
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
