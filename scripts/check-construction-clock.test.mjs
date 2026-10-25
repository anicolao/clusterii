import { test } from "node:test";
import assert from "node:assert/strict";
import {
  constructionTime,
  constructionStoryPrefix,
} from "../tests/browser/story-helpers/construction-clock.mjs";
import {
  initialize,
  load,
} from "../tests/browser/story-helpers/emulator-construction-clock-loader.mjs";
const target = "file:///isolated/shared/campaign.js";
initialize({ target });
const source =
  "export function orderConstruction(current, input, uid, commandId, now) { return {current, input, uid, commandId, now}; }";
test("construction story clock preserves unrelated campaigns and advances only with confirmed boundaries", () => {
  for (const c of [
    null,
    {},
    { name: "Scheduled story dawn" },
    { name: constructionStoryPrefix },
  ])
    assert.equal(constructionTime(c, 123), 123);
  for (const tick of [0, 1, 8])
    assert.equal(
      constructionTime(
        {
          name: constructionStoryPrefix + "normal",
          economy: { nextTickAt: 1800000 + tick * 900000 },
        },
        123,
      ),
      900001 + tick * 900000,
    );
});
test("construction loader fails closed outside demo runtime and preserves all command inputs", async () => {
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
        name: constructionStoryPrefix + "normal",
        economy: { nextTickAt: 1800000 },
      },
      input = {
        kind: "construction.build",
        starId: "real-system",
        type: "camp",
      };
    assert.deepEqual(
      fixture.orderConstruction(
        current,
        input,
        "real-user",
        "original-id",
        555,
      ),
      {
        current,
        input,
        uid: "real-user",
        commandId: "original-id",
        now: 900001,
      },
    );
    assert.equal(
      fixture.orderConstruction({ name: "ordinary" }, input, "user", "id", 555)
        .now,
      555,
    );
    await assert.rejects(
      load(target, {}, async () => ({
        ...result,
        source: source.replace("orderConstruction(", "changed("),
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
