import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
  const helper = readFileSync("tests/e2e/helpers/test-step-helper.ts", "utf8");
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

test("reviewed credit maintenance changes only one exact pending accessible name", () => {
  const entry = JSON.parse(
    readFileSync("docs/testing/legacy-browser-tests.json", "utf8"),
  )["credit-offers.spec.ts"];
  let source = readFileSync("tests/browser/credit-offers.spec.ts", "utf8");
  const readiness = entry.readinessMaintenance;
  assert.equal(readiness.kind, "exact-real-initialization-readiness");
  assert.equal(readiness.previousSha256, "1ffa08b5d1de7bfd44ce61f901d87b4889df3b44ffded1245d6398dc86575abd");
  assert.equal(source.split(readiness.to).length - 1, 1);
  source = source.replace(readiness.to, readiness.from);
  assert.equal(createHash("sha256").update(source).digest("hex"), readiness.previousSha256);
  const change = entry.maintenance;
  assert.equal(change.kind, "exact-accessible-name-only");
  assert.equal(
    change.previousSha256,
    "d12ba6e3fe35993e2fef97d0859b6da718ca05551314ac23d755141b5db223fc",
  );
  assert.equal(change.from, 'name: "Awaiting acknowledgement…"');
  assert.equal(change.to, 'name: "Awaiting receipt"');
  assert.equal(source.split(change.to).length - 1, 1);
  assert.equal(source.includes(change.from), false);
  assert.equal(
    createHash("sha256")
      .update(source.replace(change.to, change.from))
      .digest("hex"),
    change.previousSha256,
  );
  assert.match(
    readFileSync(change.review, "utf8"),
    /Managed-key coverage remains/,
  );
});
