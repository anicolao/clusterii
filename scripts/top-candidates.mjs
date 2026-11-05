import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, statfsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createConnection } from "node:net";
import {
  verifyRequest,
  projects,
  filesFor, filterFor, titleFilter,
  verifyCollection,
} from "./top-candidates-request.mjs";
import { runViewportCohorts } from "./story-cohorts.mjs";
const storyServiceGroups = [{ id: "route-labels" }];

const project = process.argv[2]?.replace(/^top-candidates-/, "");
assert.equal(process.argv.length, 3);
assert.ok(projects.includes(project));
const request = verifyRequest();
assert.deepEqual(
  storyServiceGroups.map(({ id }) => id),
  request.serviceGroups,
);
assert.equal(process.platform, "linux");
assert.equal(process.arch, "arm64");
assert.equal(
  process.env.CLUSTER_PINNED_RENDERER,
  "mcr.microsoft.com/playwright:v1.61.1-noble@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321",
);
assert.ok(
  !process.env.CLUSTER_STORY_FILTER && !process.env.CLUSTER_RENDER_TELEMETRY,
);
assert.ok(!existsSync("test-results/stories"), "Fresh output required");
async function preflight() {
  const disk = statfsSync(".");
  assert.ok(
    Number(disk.bavail) * Number(disk.bsize) > 3 * 1024 ** 3,
    "Disk reserve",
  );
  for (const port of [4173, 19099, 19000, 18080, 19150, 15001, 14400, 14500])
    await new Promise((res, rej) => {
      const s = createConnection({ host: "127.0.0.1", port });
      s.once("connect", () => {
        s.destroy();
        rej(new Error(`Port ${port} occupied`));
      });
      s.once("error", res);
    });
}
await preflight();
const env = {
  ...process.env,
  CLUSTER_STORY_MODE: "generate",
  NODE_OPTIONS: [
    process.env.NODE_OPTIONS ?? "",
    `--import=${pathToFileURL(resolve("tests/browser/story-helpers/emulator-catalogue-register.mjs")).href}`,
  ].join(" "),
};
const run = (args) => {
  const result = spawnSync("bun", args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
};
assert.equal(run(["x", "svelte-kit", "sync"]), 0);
const collect = (filter) =>
  JSON.parse(
    execFileSync(
      "bun",
      [
        "x",
        "playwright",
        "test",
        "--config",
        "playwright.stories.config.ts",
        `--project=${project}`,
        "--list",
        "--reporter=json",
        ...(filter ? [filter] : []), "--grep", titleFilter,
      ],
      { env, encoding: "utf8", maxBuffer: 16 * 1024 ** 2 },
    ),
  );
const complete = collect(filterFor(project));
assert.equal(verifyCollection(complete, project), request.testsPerProject[project]);
const selections = { files: filesFor(project), titleFilter };
mkdirSync("ci-evidence/top-candidates", { recursive: true });
writeFileSync(
  `ci-evidence/top-candidates/collection-${project}.json`,
  JSON.stringify({ complete, selections }, null, 2),
);
assert.equal(run(["run", "--cwd", "functions", "build"]), 0);
const startedAt = new Date().toISOString();
let status = 0,
  error;
try {
  await runViewportCohorts({
    output: resolve("test-results/stories"),
    firestoreLog: resolve("firestore-debug.log"),
    viewports: [project],
    groups: storyServiceGroups.map(({ id }) => id),
    beforeEach: preflight,
    run: async (viewport, group) => {
      assert.equal(group, "route-labels");
      const filter = filterFor(viewport);
      const code = run([
        "x",
        "firebase",
        "emulators:exec",
        "--project",
        "demo-clusterii",
        "--only",
        "auth,database,firestore,functions",
        `bunx playwright test --config playwright.stories.config.ts --project=${viewport} '${filter}' --grep '${titleFilter}' --retries=0 --update-snapshots=none`,
      ]);
      if (code) throw new Error(`${viewport}/${group} exited ${code}`);
    },
  });
} catch (failure) {
  status = 1;
  error = String(failure);
  console.error(error);
}
const unchanged = spawnSync(
  "git",
  ["diff", "--exit-code", request.source, "--", ...Object.keys(request.inputs)],
  { stdio: "inherit" },
).status;
writeFileSync(
  `ci-evidence/top-candidates/outcome-${project}.json`,
  JSON.stringify(
    {
      project,
      mode: "generate",
      source: request.source,
      target: request.target,
      tests: request.testsPerProject[project],
      groups: storyServiceGroups,
      startedAt,
      finishedAt: new Date().toISOString(),
      exit: status,
      referenceDiffExit: unchanged,
      error,
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = status || unchanged || 0;
