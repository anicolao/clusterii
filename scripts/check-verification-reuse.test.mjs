import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  openSync,
  closeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  inputDigest,
  matchingPlan,
  sourceOutcome,
  reportOnly,
  prepareVerification,
  waitVerification,
  reuseSummary,
  readPlanArtifact,
  readVerificationIndex,
} from "./verification-reuse.mjs";
const sha = "a".repeat(40),
  other = "b".repeat(40);
const entry = (path, hash = sha, mode = "100644") =>
  `${mode} ${hash} 0\t${path}\0`;
const hash = (index, key = "stories-verify", platform = "Linux/ARM64") =>
  inputDigest(index, key, platform);
test("index acquisition preserves every mode/path beyond the default child buffer and matches the complete repository", () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-index-acquisition-"));
  try {
    execFileSync("git", ["init", "-q", dir]);
    const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
      cwd: dir,
      input: "fixture\n",
    })
      .toString()
      .trim();
    const paths = Array.from(
      { length: 16000 },
      (_, i) =>
        `evidence/${String(i).padStart(5, "0")}-${"retained-source".repeat(5)}.json`,
    );
    const records = paths
      .map((path, i) =>
        entry(path, blob, i === paths.length - 1 ? "120000" : "100644"),
      )
      .join("");
    execFileSync("git", ["update-index", "-z", "--index-info"], {
      cwd: dir,
      input: records,
    });
    assert.ok(Buffer.byteLength(records) > 1024 * 1024);
    assert.throws(
      () => execFileSync("git", ["ls-files", "--stage", "-z"], { cwd: dir }),
      (error) => error.code === "ENOBUFS",
    );
    const actual = readVerificationIndex(dir);
    assert.equal(
      actual,
      records,
      "full synthetic Git child output, including final symlink mode",
    );
    assert.equal(hash(actual), hash(records));
    assert.notEqual(
      hash(actual),
      hash(records.replace(paths.at(-1), "different-final-path")),
    );

    // Independent stdout-to-file acquisition has no in-memory child buffer.
    const file = join(dir, "repository-index"),
      fd = openSync(file, "w");
    try {
      execFileSync("git", ["ls-files", "--stage", "-z"], {
        stdio: ["ignore", fd, "pipe"],
      });
    } finally {
      closeSync(fd);
    }
    const repository = readVerificationIndex();
    assert.ok(
      Buffer.byteLength(repository) > 1024 * 1024,
      "exercise the current evidence-rich repository",
    );
    assert.equal(
      repository,
      readFileSync(file, "utf8"),
      "no omitted paths/modes or truncated tail",
    );
    assert.equal(hash(repository), hash(readFileSync(file, "utf8")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("only the explicit report allowlist can change without changing verification inputs", () => {
  const code = entry("src/routes/+page.svelte");
  for (const path of reportOnly)
    assert.equal(hash(code + entry(path)), hash(code + entry(path, other)));
  for (const path of [
    "README.md",
    "VISION.md",
    "CLUSTER_II_MVP.md",
    "UX_DESIGN.md",
    "IMPLEMENTATION_PLAN.md",
    "src/game.ts",
    "shared/campaign.ts",
    "functions/src/index.ts",
    "static/art/world.webp",
    "tests/e2e/003-science/science.spec.ts",
    "tests/browser/story-baselines/frame.png",
    "package.json",
    "bun.lock",
    "functions/bun.lock",
    "nix/flake.lock",
    "nix/renderer.nix",
    ".github/workflows/stories.yml",
    "scripts/verification-reuse.mjs",
    "docs/testing/new-evidence.log",
    "unknown-file",
  ]) {
    assert.notEqual(
      hash(code + entry(path)),
      hash(code + entry(path, other)),
      path,
    );
    assert.notEqual(hash(code), hash(code + entry(path)), `addition ${path}`);
  }
  assert.notEqual(
    hash(code),
    hash(entry("src/routes/+page.svelte", sha, "120000")),
    "mode/symlink changes",
  );
  assert.notEqual(hash(code), hash(code, "application"));
  assert.notEqual(hash(code), hash(code, "stories-verify", "Linux/X64"));
  assert.equal(hash(code + entry("z")), hash(entry("z") + code));
  assert.throws(() => hash(`100644 ${sha} 2\tx\0`), /resolved Git index/);
});
test("reuse requires exact scope, provenance and an earlier source; outcomes never turn failure or pending into success", () => {
  const context = {
    key: "application",
    digest: hash(entry("x")),
    repository: "owner/repo",
    runId: 12,
    workflowId: 34,
    jobName: "verify",
    prNumber: 7,
    branch: "feature",
    headRepositoryId: 99,
  };
  const plan = {
    schema: 1,
    ...context,
    executor: {
      runId: 11,
      attempt: 1,
      workflowId: 34,
      jobName: "verify",
      headSha: sha,
      checkoutSha: other,
    },
  };
  assert.equal(matchingPlan(plan, context), true);
  for (const patch of [
    { digest: "different" },
    { key: "stories-verify" },
    { repository: "foreign/repo" },
    { schema: 2 },
  ])
    assert.equal(matchingPlan({ ...plan, ...patch }, context), false);
  for (const patch of [
    { runId: 12 },
    { runId: 0 },
    { attempt: 0 },
    { workflowId: 35 },
    { jobName: "documentation" },
    { headSha: "bad" },
    { checkoutSha: "bad" },
  ])
    assert.equal(
      matchingPlan(
        { ...plan, executor: { ...plan.executor, ...patch } },
        context,
      ),
      false,
    );
  assert.equal(sourceOutcome(undefined), "pending");
  assert.equal(sourceOutcome({ status: "in_progress" }), "pending");
  assert.equal(
    sourceOutcome({ status: "completed", conclusion: "success" }),
    "success",
  );
  for (const conclusion of [
    "failure",
    "cancelled",
    "timed_out",
    "skipped",
    "neutral",
    null,
  ])
    assert.equal(sourceOutcome({ status: "completed", conclusion }), "failure");
});
test("workflow check names, full execution branches and evidence retention remain present", () => {
  for (const [file, key] of [
    ["stories.yml", "stories-verify"],
    ["verify.yml", "application"],
  ]) {
    const text = readFileSync(
      new URL(`../.github/workflows/${file}`, import.meta.url),
      "utf8",
    );
    assert.ok(text.includes(`verification-reuse.mjs prepare ${key}`));
    assert.ok(text.includes(`verification-reuse.mjs wait ${key}`));
    assert.ok(text.includes("steps.reuse.outputs.execute == 'true'"));
    assert.ok(text.includes("steps.reuse.outputs.execute == 'false'"));
    assert.ok(
      text.includes("steps.reused.outputs.execute == 'true'"),
      "unavailable reuse evidence executes normal tests",
    );
    assert.ok(text.includes("ci-evidence/verification/"));
    assert.ok(text.includes("test-results/"));
    assert.ok(
      !text.includes("paths-ignore:") && !text.includes("cancel-in-progress:"),
    );
  }
});

function fixture() {
  const executor = {
    runId: 10,
    attempt: 1,
    workflowId: 34,
    jobName: "verify",
    headSha: sha,
    checkoutSha: "c".repeat(40),
  };
  const context = {
    key: "application",
    digest: hash(entry("x")),
    repository: "owner/repo",
    runId: 20,
    runAttempt: 1,
    workflowId: 34,
    jobName: "verify",
    prNumber: 7,
    branch: "feature",
    headRepositoryId: 99,
    currentHead: other,
    ownExecutor: {
      ...executor,
      runId: 20,
      headSha: other,
      checkoutSha: "d".repeat(40),
    },
  };
  const source = {
    id: 10,
    run_attempt: 1,
    workflow_id: 34,
    event: "pull_request",
    head_sha: sha,
    head_repository: { id: 99 },
    head_branch: "feature",
    pull_requests: [{ number: 7 }],
  };
  const root = { ...context, schema: 1, runId: 10, currentHead: sha, executor };
  delete root.ownExecutor;
  const input = {
    id: 100,
    name: "verification-input-application-1",
    expired: false,
    size_in_bytes: 100,
  };
  const evidence = {
    id: 200,
    name: "browser-evidence",
    expired: false,
    created_at: "2026-01-01T00:01:00Z",
  };
  const job = {
    name: "verify",
    run_id: 10,
    status: "completed",
    conclusion: "success",
    started_at: "2026-01-01T00:00:00Z",
    completed_at: "2026-01-01T00:02:00Z",
  };
  const state = {
    candidates: [source],
    runs: { 10: source },
    artifacts: { 10: [input, evidence] },
    plans: { 100: root },
    jobs: [job],
    calls: [],
    sleeps: [],
    summary: [],
    unavailable: false,
  };
  const io = {
    async json(path) {
      state.calls.push(path);
      if (state.unavailable) throw new Error("controlled API unavailable");
      if (path.startsWith("actions/workflows/34/runs?"))
        return { workflow_runs: state.candidates };
      let match = path.match(/^actions\/runs\/(\d+)\/artifacts\?/);
      if (match) return { artifacts: state.artifacts[match[1]] ?? [] };
      match = path.match(/^actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs\?/);
      if (match) {
        assert.equal(Number(match[1]), 10);
        assert.equal(Number(match[2]), 1);
        return {
          jobs: [state.jobs.length > 1 ? state.jobs.shift() : state.jobs[0]],
        };
      }
      match = path.match(/^actions\/runs\/(\d+)$/);
      if (match) return state.runs[match[1]];
      throw new Error(`Unexpected fixture request ${path}`);
    },
    async readPlanArtifact(artifact) {
      const plan = state.plans[artifact.id];
      if (plan === "invalid") throw new Error("invalid archive");
      return plan;
    },
    async sleep(ms) {
      state.sleeps.push(ms);
    },
    record(text) {
      state.summary.push(text);
    },
  };
  return { context, state, io, root, source, job, input, evidence };
}

test("prepare executes normal checks for absent, invalid, expired, unavailable or unrelated evidence", async () => {
  const mutations = [
    (f) => {
      f.state.candidates = [];
    },
    (f) => {
      f.state.plans[100] = "invalid";
    },
    (f) => {
      f.input.expired = true;
    },
    (f) => {
      f.state.unavailable = true;
    },
    (f) => {
      f.source.head_repository.id = 100;
    },
    (f) => {
      f.source.pull_requests = [{ number: 8 }];
    },
    (f) => {
      f.source.workflow_id = 35;
    },
    (f) => {
      f.root.digest = "different inputs";
    },
    (f) => {
      f.root.executor.checkoutSha = "invalid";
    },
  ];
  for (const mutate of mutations) {
    const f = fixture();
    mutate(f);
    const plan = await prepareVerification(f.context, f.io);
    assert.equal(plan.execute, true);
    assert.equal(plan.executor.runId, 20);
    assert.match(plan.reason, /execute normal verification/i);
  }
  const f = fixture();
  f.context.runAttempt = 2;
  f.context.ownExecutor.attempt = 2;
  const plan = await prepareVerification(f.context, f.io);
  assert.equal(plan.execute, true);
  assert.equal(plan.executor.attempt, 2);
  assert.equal(f.state.calls.length, 0);
  assert.match(plan.reason, /Explicit rerun/);
});

test("prepare and wait pin a real executor; pending becomes its failure or retained success, never a manufactured pass", async () => {
  for (const conclusion of ["failure", "success"]) {
    const f = fixture();
    f.state.jobs = [
      { ...f.job, status: "in_progress", conclusion: null },
      { ...f.job, conclusion },
    ];
    const plan = await prepareVerification(f.context, f.io);
    assert.equal(plan.execute, false);
    assert.equal(plan.executor.runId, 10);
    const result = await waitVerification(
      JSON.parse(JSON.stringify(plan)),
      f.io,
      3,
    );
    assert.equal(result.execute, false);
    assert.equal(result.success, conclusion === "success");
    assert.deepEqual(f.state.sleeps, [60000]);
    const summary = f.state.summary.join("");
    assert.ok(summary.includes(f.root.executor.checkoutSha));
    assert.ok(summary.includes("attempt 1"));
    assert.ok(summary.includes("actions/runs/10"));
    assert.equal(summary.includes("artifacts/200"), conclusion === "success");
  }
});

test("chained plans resolve the original checkout and reject a substituted unrelated executor", async () => {
  const f = fixture();
  const chain = { ...f.source, id: 11, head_sha: other };
  f.state.candidates = [chain];
  f.state.runs[11] = chain;
  f.state.artifacts[11] = [{ ...f.input, id: 101 }];
  f.state.plans[101] = { ...f.root, runId: 11, currentHead: other };
  const plan = await prepareVerification(f.context, f.io);
  assert.equal(plan.execute, false);
  assert.equal(plan.executor.runId, 10);
  assert.ok(
    reuseSummary(plan).includes(
      `actual executor checkout: ${f.root.executor.checkoutSha}`,
    ),
  );
  assert.equal((await waitVerification(plan, f.io, 1)).success, true);
  f.source.pull_requests = [{ number: 99 }];
  assert.equal((await prepareVerification(f.context, f.io)).execute, true);
  assert.equal((await waitVerification(plan, f.io, 1)).execute, true);
});

test("wait falls back to real tests on missing evidence/API, but preserves a pending or failed source gate", async () => {
  for (const mutate of [
    (f) => {
      f.state.unavailable = true;
    },
    (f) => {
      f.input.expired = true;
    },
    (f) => {
      f.evidence.expired = true;
    },
    (f) => {
      f.evidence.created_at = "2025-01-01T00:00:00Z";
    },
  ]) {
    const f = fixture(),
      plan = await prepareVerification(f.context, f.io);
    mutate(f);
    const result = await waitVerification(plan, f.io, 1);
    assert.equal(result.execute, true);
    assert.equal(result.success, undefined);
    assert.match(result.reason, /execute normal verification/i);
  }
  const f = fixture(),
    plan = await prepareVerification(f.context, f.io);
  f.state.jobs = [{ ...f.job, status: "in_progress", conclusion: null }];
  const result = await waitVerification(plan, f.io, 1);
  assert.equal(result.execute, false);
  assert.equal(result.success, false);
  assert.match(result.reason, /pending/);
});

test("plan archive reader checks size/hash, expiry and bounded JSON with actual ZIP fixtures", async () => {
  const zip = (body) =>
    execFileSync(
      "python3",
      [
        "-c",
        "import sys,io,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w') as z: z.writestr('plan.json',sys.stdin.buffer.read())\nsys.stdout.buffer.write(b.getvalue())",
      ],
      { input: body },
    );
  const bytes = zip(JSON.stringify(fixture().root));
  const artifact = {
    id: 1,
    size_in_bytes: bytes.length,
    expired: false,
    digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
  assert.deepEqual(
    await readPlanArtifact(artifact, async () => bytes),
    fixture().root,
  );
  assert.equal(
    await readPlanArtifact({ ...artifact, expired: true }, async () => {
      throw Error("must not download");
    }),
    undefined,
  );
  await assert.rejects(
    readPlanArtifact(
      { ...artifact, digest: "sha256:wrong" },
      async () => bytes,
    ),
    /provenance/,
  );
  const bad = zip("invalid json");
  await assert.rejects(
    readPlanArtifact(
      { ...artifact, digest: undefined, size_in_bytes: bad.length },
      async () => bad,
    ),
  );
});
