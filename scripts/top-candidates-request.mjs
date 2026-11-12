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
export const cases = [
  {
    "id": "campaign",
    "file": "browser/campaign-start.story.spec.ts",
    "title": "Five commanders start two campaigns and recover their named active campaign",
    "story": "campaign-scheduled-start",
    "captures": 54,
    "mode": "verify",
    "projects": [
      "phone",
      "desktop",
      "large",
      "short"
    ]
  },
  {
    "id": "membership",
    "file": "browser/market-membership-revocation.story.spec.ts",
    "title": "Live membership revocation rejects a delayed private view and clears market intent",
    "story": "market-draft-membership-revocation",
    "captures": 14,
    "mode": "verify",
    "projects": [
      "large"
    ]
  },
  {
    "id": "history-lab",
    "file": "browser/sharing-lab.story.spec.ts",
    "title": "Sharing lab preserves selected-history consent and disclosure across motion modes",
    "story": "selected-history-lab",
    "captures": 10,
    "mode": "generate",
    "projects": [
      "short"
    ]
  }
];
export const casesFor = (project) => cases.filter(c => c.projects.includes(project));
export const serviceGroups = cases.map(c => c.id);
export const capturesByStory = Object.fromEntries(cases.map(c => [c.story, c.captures]));
export const stories = Object.fromEntries(cases.map(c => [c.file, [c.title]]));
export const filesFor = (project) => casesFor(project).map(c => c.file);
export const filterFor = (project, group) => "(" + casesFor(project).filter(c => !group || c.id === group).map(c => c.file.replaceAll(".", "[.]")).join("|") + ")$";
export const titleFilter = "(" + cases.map(c => c.title).join("|") + ")$";
export function verifyCollection(report, project) {
  const found = [];
  const walk = (suites) => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        assert.equal(spec.tests.length, 1);
        assert.equal(spec.tests[0].projectName, project);
        assert.ok(Object.hasOwn(stories, spec.file));
        assert.ok(stories[spec.file].includes(spec.title));
        found.push(`${spec.file}:${spec.title}`);
      }
      walk(suite.suites);
    }
  };
  walk(report.suites);
  assert.deepEqual(found.sort(), casesFor(project).map(c => `${c.file}:${c.title}`).sort());
  return found.length;
}
export const projects = ["phone", "desktop", "large", "short"];
export function validateRequest(r, { head, parent, branch, attempt, changed }) {
  assert.deepEqual(r.serviceGroups, serviceGroups);
  assert.deepEqual(r.capturesByStory, capturesByStory);
  assert.equal(r.schema, 1);
  assert.equal(r.mode, "scoped-verify-and-history-candidates");
  assert.equal(r.source, parent);
  assert.match(r.target, /^[a-f0-9]{40}$/);
  assert.equal(branch, "investigate/pr140-isolated-44dc-20261112");
  assert.equal(String(attempt), "1");
  assert.deepEqual(r.projects, projects);
  assert.deepEqual(r.testsPerProject, Object.fromEntries(projects.map(p => [p, casesFor(p).length])));
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
