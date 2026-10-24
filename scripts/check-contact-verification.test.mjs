import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "yaml";
import {
  verificationCase,
  executeVerification,
  prepareVerification,
  feature,
  specHash,
} from "./recovery-contact-verification.mjs";
import {
  validateRequest,
  requestFile,
  branch,
} from "./recovery-contact-verification-request.mjs";
const parent = "a".repeat(40),
  head = "b".repeat(40);
const fixture = () => ({
  request: {
    version: 1,
    id: "contacts-label-20261024-01",
    case: "feature012-contacts-verify",
    mode: "verify",
    target: "d0804122e614b0b8c26351dee4593ec20cb6f731",
    sourceCommit: parent,
  },
  env: {
    GITHUB_EVENT_NAME: "push",
    GITHUB_REF: branch,
    GITHUB_REPOSITORY: "anicolao/clusterii",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: head,
  },
  head,
  parent,
  changed: [requestFile, "PROMPT_WORK.md"],
  requestWasPresent: false,
});
test("request cannot replay, change source, repository, branch, case, mode, or combine code changes", () => {
  assert.equal(validateRequest(fixture()).sourceCommit, parent);
  for (const delta of [
    { requestWasPresent: true },
    { changed: [requestFile, "src/routes/+page.svelte"] },
    { changed: ["PROMPT_WORK.md"] },
    { parent: head },
  ])
    assert.throws(() => validateRequest({ ...fixture(), ...delta }));
  for (const [key, value] of [
    ["mode", "generate"],
    ["case", "all"],
    ["sourceCommit", head],
    ["id", "retry"],
  ]) {
    const f = fixture();
    f.request[key] = value;
    assert.throws(() => validateRequest(f));
  }
  for (const [key, value] of [
    ["GITHUB_REF", "refs/heads/main"],
    ["GITHUB_REPOSITORY", "foreign/repo"],
    ["GITHUB_RUN_ATTEMPT", "2"],
    ["GITHUB_SHA", parent],
    ["GITHUB_EVENT_NAME", "workflow_dispatch"],
  ]) {
    const f = fixture();
    f.env[key] = value;
    assert.throws(() => validateRequest(f));
  }
});
test("exact four-size feature, source hash, no generation, retries or whole-suite fallback", () => {
  assert.equal(
    createHash("sha256").update(readFileSync(feature)).digest("hex"),
    specHash,
  );
  assert.deepEqual(verificationCase(["feature012-contacts-verify"]), [
    "x",
    "playwright",
    "test",
    "--config",
    "playwright.stories.config.ts",
    feature,
    "--project=phone",
    "--project=desktop",
    "--project=large",
    "--project=short",
    "--max-failures=1",
    "--retries=0",
    "--update-snapshots=none",
  ]);
  for (const args of [
    [],
    ["all"],
    ["feature012-contacts-verify", "--grep=partial"],
  ])
    assert.throws(() => verificationCase(args));
});
test("original failing exit survives exactly one invocation", async () => {
  for (const code of [0, 1, 7]) {
    let calls = 0,
      result;
    const exit = await executeVerification(
      async (a) => {
        calls++;
        assert.deepEqual(a, verificationCase(["feature012-contacts-verify"]));
        return code;
      },
      (r) => (result = r),
    );
    assert.equal(calls, 1);
    assert.equal(exit, code);
    assert.equal(result.testExit, code);
  }
});
test("serial build and service setup failure prevents later commands", async () => {
  for (const failing of [-1, 0, 1, 2]) {
    const calls = [];
    const code = await prepareVerification(async (a) => {
      calls.push(a);
      return calls.length - 1 === failing ? 7 : 0;
    }, {});
    assert.equal(code, failing < 0 ? 0 : 7);
    assert.equal(calls.length, failing < 0 ? 3 : failing + 1);
    assert.deepEqual(calls[0], ["x", "svelte-kit", "sync"]);
    if (calls.length === 3)
      assert.equal(
        calls[2].at(-1),
        "node scripts/recovery-contact-verification.mjs inside-feature012-contacts-verify",
      );
  }
});
test("workflow remains branch/request-only with pinned Nix and failed-artifact retention", () => {
  const w = parse(
    readFileSync(".github/workflows/recovery-contact-verification.yml", "utf8"),
  );
  assert.deepEqual(w.on, {
    push: { branches: ["investigate/jfr-export-load"], paths: [requestFile] },
  });
  assert.deepEqual(w.permissions, { contents: "read" });
  assert.equal(w.concurrency["cancel-in-progress"], false);
  const j = w.jobs["feature012-contacts-verify"];
  assert.equal(j["runs-on"], "ubuntu-24.04-arm");
  assert.equal(j["timeout-minutes"], 20);
  assert.deepEqual(
    j.steps.filter((s) => s.run).map((s) => s.run),
    [
      "node scripts/recovery-contact-verification-request.mjs",
      "nix run path:./nix#ci-renderer -- recovery feature012-contacts-verify",
    ],
  );
  assert.equal(j.steps.at(-1).if, "always()");
  assert.equal(j.steps.at(-1).with["retention-days"], 30);
  assert.doesNotMatch(
    JSON.stringify(w),
    /secrets\.|deploy|update-snapshots|continue-on-error/,
  );
});
