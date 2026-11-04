import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateRequest,
  projects,
  serviceGroups,
} from "./top-candidates-request.mjs";
const request = () => ({
  serviceGroups,
  schema: 1,
  mode: "generate",
  source: "a".repeat(40),
  target: "b".repeat(40),
  projects,
  testsPerProject: { phone: 1, desktop: 1, large: 1, short: 1 },
  retries: 0,
  updateSnapshots: "none",
});
const context = () => ({
  head: "c".repeat(40),
  parent: "a".repeat(40),
  branch: "investigate/pr140-acknowledgement-candidates-20261104",
  attempt: 1,
  changed: [".github/recovery/top-candidates.json", "PROMPT_WORK.md"],
});
test("exact first-attempt source-bound complete candidate request", () =>
  validateRequest(request(), context()));
test("reject changed mode, source, scope, retries and snapshot updates", () => {
  for (const mutate of [
    (r) => (r.serviceGroups = []),
    (r) => (r.mode = "verify"),
    (r) => (r.source = "d".repeat(40)),
    (r) => (r.projects = []),
    (r) => (r.testsPerProject = 1),
    (r) => (r.retries = 1),
    (r) => (r.updateSnapshots = "all"),
  ]) {
    const r = request();
    mutate(r);
    assert.throws(() => validateRequest(r, context()));
  }
});
test("reject replay, unrelated branch and source mutations in request commit", () => {
  for (const mutate of [
    (c) => (c.attempt = 2),
    (c) => (c.branch = "main"),
    (c) => c.changed.push("src/app.ts"),
    (c) => (c.changed = []),
  ]) {
    const c = context();
    mutate(c);
    assert.throws(() => validateRequest(request(), c));
  }
});

import { spawnSync } from "node:child_process";
test("outer launcher rejects empty, wrong and extra recovery arguments before creating engine", () => {
  const env = {
    ...process.env,
    containerd: "unused",
    rootShell: "unused",
    engine: "unused",
    imageArchive: "unused",
    imageTag: "unused",
    imageConfig: "unused",
    imageDigest: "unused",
    nixCommand: "unused",
  };
  for (const args of [
    [],
    ["recovery", "top-candidates-all"],
    ["recovery", "top-candidates-phone", "extra"],
  ])
    assert.equal(
      spawnSync("bash", ["nix/ci-renderer.sh", ...args], { env }).status,
      2,
    );
});

import { verifyCollection, filesFor, storyTitle } from "./top-candidates-request.mjs";
test("selection must contain precisely the corrected complete journeys", () => {
  const report = {
    suites: [
      {
        specs: filesFor("phone").map((file) => ({
          file, title: storyTitle,
          tests: [{ projectName: "phone" }],
        })),
      },
    ],
  };
  assert.equal(verifyCollection(report, "phone"), 1);
  for (const change of [
    (r) => r.suites[0].specs.pop(),
    (r) => (r.suites[0].specs[0].title = "Unrelated campaign journey"),
    (r) => r.suites[0].specs.push(r.suites[0].specs[0]),
    (r) => (r.suites[0].specs[0].file = "browser/unrelated.story.spec.ts"),
    (r) => (r.suites[0].specs[0].tests[0].projectName = "large"),
  ]) {
    const r = structuredClone(report);
    change(r);
    assert.throws(() => verifyCollection(r, "phone"));
  }
});
