import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialize,
  load,
} from "../tests/browser/story-helpers/emulator-catalogue-loader.mjs";
const target = "file:///isolated/functions/lib/shared/campaign.js";
initialize({ target });
const source =
  "export function createCampaign(id, input, seed, now) { return { id, input, seed, now }; }";
test("catalogue instrumentation leaves every unrelated module untouched", async () => {
  const result = {
    format: "module",
    source: "key = crypto.getRandomValues(bytes)",
  };
  assert.equal(
    await load("file:///isolated/shared/crypto.js", {}, async () => result),
    result,
  );
});
test("catalogue instrumentation refuses non-emulator and non-demo services", async () => {
  const before = {
    functions: process.env.FUNCTIONS_EMULATOR,
    project: process.env.GCLOUD_PROJECT,
  };
  try {
    for (const [functions, project] of [
      ["false", "demo-clusterii"],
      ["true", "clusterii-20261020"],
    ]) {
      process.env.FUNCTIONS_EMULATOR = functions;
      process.env.GCLOUD_PROJECT = project;
      await assert.rejects(
        load(target, {}, async () => ({ format: "module", source })),
        /confined/,
      );
    }
  } finally {
    for (const [key, value] of [
      ["FUNCTIONS_EMULATOR", before.functions],
      ["GCLOUD_PROJECT", before.project],
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
test("demo fixture changes only catalogue input and rejects a changed reducer signature", async () => {
  const before = {
    functions: process.env.FUNCTIONS_EMULATOR,
    project: process.env.GCLOUD_PROJECT,
  };
  try {
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.GCLOUD_PROJECT = "demo-clusterii";
    const result = await load(target, {}, async () => ({
      format: "module",
      source,
    }));
    const fixture = await import(
      `data:text/javascript,${encodeURIComponent(result.source)}`
    );
    const input = { name: "Ordinary UI command" };
    assert.deepEqual(
      fixture.createCampaign("campaign", input, "unpredictable-seed", 123),
      { id: "campaign", input, seed: "0123456789abcdef".repeat(4), now: 123 },
    );
    await assert.rejects(
      load(target, {}, async () => ({
        format: "module",
        source: "export function changed() {}",
      })),
      /signature changed/,
    );
  } finally {
    for (const [key, value] of [
      ["FUNCTIONS_EMULATOR", before.functions],
      ["GCLOUD_PROJECT", before.project],
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
