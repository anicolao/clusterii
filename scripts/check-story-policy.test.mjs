import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  storyViolations,
  helperViolations,
  checkPolicy,
} from "./check-story-policy.mjs";
const good =
  'import { test } from "./story-helpers/fixtures"; import {TestStepHelper} from "./story-helpers/test-step-helper";';
test("story convention rejects screenshot, sleep, mask and ambiguous selector bypasses", () => {
  assert.deepEqual(storyViolations(good), []);
  for (const bad of [
    "page.screenshot({})",
    "expect(page).toHaveScreenshot()",
    "expect(png).toMatchSnapshot()",
    "page.waitForTimeout(100)",
    'page.waitForLoadState("networkidle")',
    "buttons.first()",
    "buttons.last()",
    "const options={mask:[]}",
    'const options={updateSnapshots:"all"}',
  ])
    assert(storyViolations(good + bad).length, bad);
  assert(storyViolations('test("one huge procedural test")').length);
});
test("capture policy protects each exact comparison, readiness and review guard", () => {
  const helper = readFileSync(
    "tests/browser/story-helpers/test-step-helper.ts",
    "utf8",
  );
  assert.deepEqual(helperViolations(helper), []);
  for (const marker of [
    "maxDiffPixels: 0",
    "threshold: 0",
    "a.data.equals(b.data)",
    "captureReady",
    "assertScreenFit",
    "Missing reviewed baseline/renderer",
    "Pinned renderer must match",
    "CAPTURE_BUDGET = 10000",
    'info.config.updateSnapshots !== "none"',
  ])
    assert(
      helperViolations(helper.replaceAll(marker, "REMOVED_GUARD")).length,
      marker,
    );
});
test("current migration inventory and story configuration satisfy the explicit policy", () =>
  assert.deepEqual(checkPolicy(), []));
