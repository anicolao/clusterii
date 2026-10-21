import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialize,
  load,
} from "../tests/browser/story-helpers/emulator-admission-clock-loader.mjs";
import {
  admissionAt,
  scheduledAt,
  admissionTime,
} from "../tests/browser/story-helpers/admission-clock.mjs";
const target = "file:///isolated/shared/campaign.js";
initialize({ target });
const source = `
export function createCampaign(id, input, seed, now) { return { input, seed, now }; }
export function joinOrLeave(current, input, uid, profile, now) { return { current, input, uid, profile, now }; }
export function startCampaign(current, now) { return { current, now }; }
`;
test("admission fixture changes only designated domain time inputs", () => {
  for (const value of [null, {}, { name: "Ordinary campaign" }])
    assert.equal(admissionTime(value, 123), 123);
  const campaign = { name: "Scheduled story dawn" };
  assert.equal(admissionTime(campaign, 123), admissionAt);
  assert.equal(admissionTime(campaign, scheduledAt - 1, true), scheduledAt - 1);
  assert.equal(admissionTime(campaign, scheduledAt + 999, true), scheduledAt);
});
test("admission loader leaves unrelated modules untouched and fails closed outside emulator", async () => {
  const result = { format: "module", source };
  assert.equal(await load("file:///auth.js", {}, async () => result), result);
  const before = [process.env.FUNCTIONS_EMULATOR, process.env.GCLOUD_PROJECT];
  try {
    for (const [emulator, project] of [
      ["false", "demo-clusterii"],
      ["true", "clusterii-20261020"],
    ]) {
      process.env.FUNCTIONS_EMULATOR = emulator;
      process.env.GCLOUD_PROJECT = project;
      await assert.rejects(
        load(target, {}, async () => result),
        /confined/,
      );
    }
  } finally {
    for (const [key, value] of [
      ["FUNCTIONS_EMULATOR", before[0]],
      ["GCLOUD_PROJECT", before[1]],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test("admission loader preserves identities and actions and rejects changed signatures", async () => {
  const before = [process.env.FUNCTIONS_EMULATOR, process.env.GCLOUD_PROJECT];
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
    const current = { name: "Scheduled story dawn" },
      action = { kind: "campaign.join" },
      profile = { alias: "A" };
    assert.deepEqual(
      fixture.joinOrLeave(current, action, "user", profile, 123),
      { current, input: action, uid: "user", profile, now: admissionAt },
    );
    assert.deepEqual(
      fixture.createCampaign("id", current, "actual-seed", 123),
      { input: current, seed: "actual-seed", now: admissionAt },
    );
    assert.equal(
      fixture.startCampaign(current, scheduledAt + 1).now,
      scheduledAt,
    );
    assert.equal(fixture.startCampaign({ name: "Ordinary" }, 987).now, 987);
    await assert.rejects(
      load(target, {}, async () => ({
        format: "module",
        source: source.replace("startCampaign", "changed"),
      })),
      /signature changed/,
    );
  } finally {
    for (const [key, value] of [
      ["FUNCTIONS_EMULATOR", before[0]],
      ["GCLOUD_PROJECT", before[1]],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
