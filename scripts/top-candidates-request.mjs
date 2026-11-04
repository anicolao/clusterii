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
export const serviceGroups = ["route-forces", "010-zero-science", "011-contextual-aftermath", "012-fleet-contacts"];
export const stories = {
  "e2e/009-route-forces/forces.spec.ts": ["Review confirmed forces before acknowledged dispatch and recovery"],
  "e2e/010-zero-science/zero-science.spec.ts": ["Live zero science after orbital loss preserves private research"],
  "e2e/011-contextual-aftermath/aftermath.spec.ts": ["Open a contextual arrival report and recover its recorded surface"],
  "e2e/012-fleet-contacts/contacts.spec.ts": ["Live fleet contacts preserve acquired and last-seen private facts across reload"],
};
export const filesFor = () => Object.keys(stories);
export function groupFile(group) {
  assert.ok(serviceGroups.includes(group), "Exact service group required");
  return filesFor()[serviceGroups.indexOf(group)];
}
export const filterFor = () => "(009-route-forces/forces|010-zero-science/zero-science|011-contextual-aftermath/aftermath|012-fleet-contacts/contacts)[.]spec[.]ts$";
export const titleFilter = "(" + Object.values(stories).flat().join("|") + ")$";
export function verifyCollection(report, project, group) {
  assert.deepEqual(report.errors ?? [], []);
  const expectedFiles = group === undefined ? filesFor() : [groupFile(group)];
  const found = [];
  const walk = (suites) => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        assert.equal(spec.tests.length, 1);
        assert.equal(spec.tests[0].projectName, project);
        assert.ok(expectedFiles.includes(spec.file));
        assert.ok(stories[spec.file].includes(spec.title));
        found.push(`${spec.file}:${spec.title}`);
      }
      walk(suite.suites);
    }
  };
  walk(report.suites);
  assert.deepEqual(found.sort(), expectedFiles.flatMap(file => stories[file].map(title => `${file}:${title}`)).sort());
  return found.length;
}
export const projects = ["phone", "desktop", "large", "short"];
export function validateRequest(r, { head, parent, branch, attempt, changed }) {
  assert.deepEqual(r.serviceGroups, serviceGroups);
  assert.equal(r.schema, 1);
  assert.equal(r.mode, "generate");
  assert.equal(r.source, parent);
  assert.match(r.target, /^[a-f0-9]{40}$/);
  assert.equal(branch, "investigate/pr140-missing-live-20261104");
  assert.equal(String(attempt), "1");
  assert.deepEqual(r.projects, projects);
  assert.deepEqual(r.testsPerProject, { phone: 4, desktop: 4, large: 4, short: 4 });
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
