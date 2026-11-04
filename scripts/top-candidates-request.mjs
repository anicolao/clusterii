import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
export const inputPaths = [
  "src",
  "shared",
  "functions",
  "tests",
  "package.json",
  "bun.lock",
  "nix/flake.nix",
  "nix/flake.lock",
  "playwright.stories.config.ts",
  "scripts/story-cohorts.mjs",
  "scripts/story-service-groups.mjs",
  "scripts/run-stories.mjs",
];
export const serviceGroups = ["stellar-observation"];
export const selectedFiles = ["browser/observations.story.spec.ts"];
export const storyTitle = "Live stellar observations retain private current and historical facts after reload";
export const filesFor = () => [...selectedFiles];
export const filterFor = () => "observations\\.story\\.spec\\.ts$";
export const titleFilter = storyTitle + "$";
export function verifyCollection(report, project) {
  const found = [];
  const walk = (suites) => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        assert.equal(spec.tests.length, 1);
        assert.equal(spec.tests[0].projectName, project);
        assert.equal(spec.title, storyTitle);
        found.push(spec.file);
      }
      walk(suite.suites);
    }
  };
  walk(report.suites);
  assert.deepEqual(found.sort(), filesFor(project).sort());
  return found.length;
}
export const projects = ["phone", "desktop", "large", "short"];
export function validateRequest(r, { head, parent, branch, attempt, changed }) {
  assert.deepEqual(r.serviceGroups, serviceGroups);
  assert.equal(r.schema, 1);
  assert.equal(r.mode, "generate");
  assert.equal(r.source, parent);
  assert.match(r.target, /^[a-f0-9]{40}$/);
  assert.equal(branch, "investigate/pr140-observation-heading-20261104");
  assert.equal(String(attempt), "1");
  assert.deepEqual(r.projects, projects);
  assert.deepEqual(r.testsPerProject, { phone: 1, desktop: 1, large: 1, short: 1 });
  assert.equal(r.retries, 0);
  assert.equal(r.updateSnapshots, "none");
  assert.ok(head !== parent);
  assert.ok(changed.includes(".github/recovery/top-candidates.json"));
  assert.ok(
    changed.every((p) =>
      [".github/recovery/top-candidates.json", "PROMPT_WORK.md"].includes(p),
    ),
  );
}
export function verifyRequest() {
  const git = (...args) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  const r = JSON.parse(
    readFileSync(".github/recovery/top-candidates.json", "utf8"),
  );
  const head = git("rev-parse", "HEAD"),
    parent = git("rev-parse", "HEAD^");
  validateRequest(r, {
    head,
    parent,
    branch: process.env.GITHUB_REF_NAME,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    changed: git("diff", "--name-only", parent, head).split("\n"),
  });
  for (const p of inputPaths)
    assert.equal(
      git("rev-parse", `${r.target}:${p}`),
      git("rev-parse", `${r.source}:${p}`),
      `Unchanged target input ${p}`,
    );
  for (const [p, id] of Object.entries(r.inputs))
    assert.equal(git("rev-parse", `${r.target}:${p}`), id, p);
  assert.deepEqual(Object.keys(r.inputs).sort(), inputPaths.sort());
  mkdirSync("ci-evidence/top-candidates", { recursive: true });
  writeFileSync(
    "ci-evidence/top-candidates/request.json",
    JSON.stringify({ head, ...r }, null, 2) + "\n",
  );
  return r;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  verifyRequest();
