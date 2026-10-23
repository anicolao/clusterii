import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Deliberately narrow: contracts, code, assets, tests, snapshots, dependencies,
// scripts, workflows, Nix and unknown paths ALL remain verification inputs.
export const reportOnly = new Set([
  "PROMPTS.md",
  "PROMPT_WORK.md",
  "meta-prompts.md",
  "docs/design/DELIVERY_REVIEW.md",
  "docs/design/STORY_ALIAS_BOOTSTRAP.md",
]);
// Evidence-rich repositories exceed Node's default 1MiB child stdout buffer.
// Read the whole index, or fail closed; never fingerprint a truncated prefix.
export function readVerificationIndex(cwd = process.cwd()) {
  return execFileSync("git", ["ls-files", "--stage", "-z"], {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
}
export function inputDigest(index, key, platform) {
  const entries = index
    .split("\0")
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^([0-7]+) ([a-f0-9]+) ([0-3])\t(.+)$/s);
      if (!match || match[3] !== "0")
        throw new Error("Verification requires a resolved Git index");
      return { entry, path: match[4] };
    })
    .filter(({ path }) => !reportOnly.has(path))
    .map(({ entry }) => entry)
    .sort();
  return createHash("sha256")
    .update(JSON.stringify({ schema: 1, key, platform, entries }))
    .digest("hex");
}
export function matchingPlan(plan, context) {
  return (
    Number.isSafeInteger(context.prNumber) &&
    context.prNumber > 0 &&
    Number.isSafeInteger(context.headRepositoryId) &&
    context.headRepositoryId > 0 &&
    typeof context.branch === "string" &&
    context.branch.length > 0 &&
    plan?.schema === 1 &&
    plan.key === context.key &&
    plan.digest === context.digest &&
    plan.repository === context.repository &&
    plan.prNumber === context.prNumber &&
    plan.branch === context.branch &&
    plan.headRepositoryId === context.headRepositoryId &&
    plan.executor?.workflowId === context.workflowId &&
    plan.executor.jobName === context.jobName &&
    Number.isSafeInteger(plan.executor.runId) &&
    plan.executor.runId > 0 &&
    plan.executor.runId < context.runId &&
    Number.isSafeInteger(plan.executor.attempt) &&
    plan.executor.attempt > 0 &&
    /^[a-f0-9]{40}$/.test(plan.executor.headSha ?? "") &&
    /^[a-f0-9]{40}$/.test(plan.executor.checkoutSha ?? "")
  );
}
export function sourceOutcome(job) {
  if (!job || job.status !== "completed") return "pending";
  return job.conclusion === "success" ? "success" : "failure";
}
async function api(path) {
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!response.ok)
    throw new Error(`GitHub evidence request failed (${response.status})`);
  return response;
}
async function json(path) {
  return (await api(path)).json();
}
export async function readPlanArtifact(
  artifact,
  readBytes = async () =>
    Buffer.from(
      await (await api(`actions/artifacts/${artifact.id}/zip`)).arrayBuffer(),
    ),
) {
  if (artifact.expired || artifact.size_in_bytes > 32768) return undefined;
  const dir = mkdtempSync(join(tmpdir(), "cluster-verification-plan-"));
  try {
    const bytes = await readBytes();
    if (bytes.length > 32768)
      throw new Error("Oversized verification plan archive");
    if (
      bytes.length !== artifact.size_in_bytes ||
      (artifact.digest &&
        artifact.digest !==
          `sha256:${createHash("sha256").update(bytes).digest("hex")}`)
    )
      throw new Error("Verification plan archive provenance differs");
    const file = join(dir, "plan.zip");
    writeFileSync(file, bytes);
    // Python is provided by the locked Nix shell. No extraction or executable data.
    const raw = execFileSync("python3", [
      "-c",
      "import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n i=z.getinfo('plan.json')\n if i.file_size>8192: raise ValueError('oversized plan')\n sys.stdout.buffer.write(z.read(i))",
      file,
    ]);
    return JSON.parse(raw.toString());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function inScope(run, context) {
  return (
    run.workflow_id === context.workflowId &&
    run.event === "pull_request" &&
    run.head_repository?.id === context.headRepositoryId &&
    run.head_branch === context.branch &&
    run.pull_requests?.some((pr) => pr.number === context.prNumber)
  );
}
async function retainedPlan(runId, attempt, context, io) {
  const result = await io.json(`actions/runs/${runId}/artifacts?per_page=100`);
  const artifact = result.artifacts.find(
    (item) =>
      item.name === `verification-input-${context.key}-${attempt}` &&
      !item.expired &&
      item.size_in_bytes <= 32768,
  );
  return artifact ? io.readPlanArtifact(artifact) : undefined;
}
async function executorEvidence(plan, context, io) {
  const source = plan.executor;
  const run = await io.json(`actions/runs/${source.runId}`);
  if (!inScope(run, context) || run.head_sha !== source.headSha) return false;
  const root = await retainedPlan(source.runId, source.attempt, context, io);
  return (
    matchingPlan(root, context) &&
    root.runId === source.runId &&
    root.currentHead === source.headSha &&
    [
      "runId",
      "attempt",
      "workflowId",
      "jobName",
      "headSha",
      "checkoutSha",
    ].every((field) => root.executor[field] === source[field])
  );
}
export async function prepareVerification(context, io) {
  const plan = { ...context, schema: 1, executor: context.ownExecutor };
  delete plan.ownExecutor;
  const normal = (reason) => ({ ...plan, execute: true, reason });
  if (context.runAttempt !== 1 || !context.prNumber)
    return normal(
      "Explicit rerun or non-PR event: execute normal verification",
    );
  if (!context.workflowId || !context.headRepositoryId)
    return normal("Reuse metadata unavailable: execute normal verification");
  try {
    const candidates = await io.json(
      `actions/workflows/${context.workflowId}/runs?event=pull_request&branch=${encodeURIComponent(context.branch)}&per_page=30`,
    );
    for (const candidate of candidates.workflow_runs.filter(
      (item) => item.id < context.runId && inScope(item, context),
    )) {
      const prior = await retainedPlan(
        candidate.id,
        candidate.run_attempt,
        context,
        io,
      );
      if (
        prior?.runId !== candidate.id ||
        prior.currentHead !== candidate.head_sha ||
        !(prior?.executor?.runId <= candidate.id) ||
        !matchingPlan(prior, context)
      )
        continue;
      if (await executorEvidence(prior, context, io))
        return {
          ...plan,
          executor: prior.executor,
          execute: false,
          reason: "Matching retained inputs: await the actual executor outcome",
        };
    }
    return normal(
      "No eligible retained input plan: execute normal verification",
    );
  } catch {
    return normal(
      "Reuse API/artifact lookup unavailable or invalid: execute normal verification",
    );
  }
}
export function reuseSummary(plan) {
  const source = plan.executor;
  return `Verification inputs: ${plan.digest}\nExecutor: https://github.com/${plan.repository}/actions/runs/${source.runId}\nExecutor head: ${source.headSha}; actual executor checkout: ${source.checkoutSha}; attempt ${source.attempt}.\n${plan.execute ? "This run executes normal tests; no prior result is claimed." : "This check awaits the matching executor; it does not create replacement screenshots. Original artifacts stay on that run."}\n`;
}
export async function waitVerification(plan, io, maxPolls = 300) {
  const source = plan.executor;
  io.record(reuseSummary(plan));
  const normal = (reason) => ({ execute: true, reason });
  try {
    if (!(await executorEvidence(plan, plan, io)))
      return normal(
        "Source provenance unavailable: execute normal verification",
      );
    for (let poll = 0; poll < maxPolls; poll++) {
      const jobs = await io.json(
        `actions/runs/${source.runId}/attempts/${source.attempt}/jobs?per_page=100`,
      );
      const job = jobs.jobs.find(
        (item) => item.name === source.jobName && item.run_id === source.runId,
      );
      const outcome = sourceOutcome(job);
      if (poll % 5 === 0 || outcome !== "pending")
        io.record(
          `Source ${source.runId} attempt ${source.attempt}: ${job?.status ?? "not yet listed"}/${job?.conclusion ?? "pending"}\n`,
        );
      if (outcome === "failure")
        return {
          execute: false,
          success: false,
          reason: `Matching executor ${job.conclusion}; retain its failure`,
        };
      if (outcome === "success") {
        const result = await io.json(
          `actions/runs/${source.runId}/artifacts?per_page=100`,
        );
        const name =
          plan.key === "application"
            ? "browser-evidence"
            : "illustrated-stories-verify-linux-arm64";
        const evidence = result.artifacts.find(
          (item) =>
            item.name === name &&
            !item.expired &&
            Date.parse(item.created_at) >= Date.parse(job.started_at) &&
            Date.parse(item.created_at) <= Date.parse(job.completed_at),
        );
        if (!evidence)
          return normal(
            "Executor artifact unavailable for this attempt: execute normal verification",
          );
        io.record(
          `Retained evidence: https://github.com/${plan.repository}/actions/runs/${source.runId}/artifacts/${evidence.id}\n`,
        );
        return {
          execute: false,
          success: true,
          reason: "Matching executor succeeded with retained evidence",
        };
      }
      await io.sleep(60000);
    }
    return {
      execute: false,
      success: false,
      reason:
        "Executor still pending at coordination bound; no success claimed",
    };
  } catch {
    return normal(
      "Reuse API/artifact lookup unavailable or invalid: execute normal verification",
    );
  }
}
async function prepare(key, jobName) {
  if (jobName !== (key === "application" ? "verify" : "stories (verify)"))
    throw new Error("Required check name differs");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const runId = Number(process.env.GITHUB_RUN_ID),
    runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT);
  let run;
  try {
    run = await json(`actions/runs/${runId}`);
  } catch {
    /* Full verification below. */
  }
  const context = {
    key,
    jobName,
    runId,
    runAttempt,
    repository: process.env.GITHUB_REPOSITORY,
    workflowId: run?.workflow_id ?? null,
    prNumber: event.number ?? null,
    branch: process.env.GITHUB_HEAD_REF,
    headRepositoryId: event.pull_request?.head.repo?.id ?? null,
    currentHead: event.pull_request?.head.sha ?? process.env.GITHUB_SHA,
    digest: inputDigest(
      readVerificationIndex(),
      key,
      `${process.env.RUNNER_OS}/${process.env.RUNNER_ARCH}`,
    ),
  };
  context.ownExecutor = {
    runId,
    attempt: runAttempt,
    workflowId: context.workflowId,
    jobName,
    headSha: context.currentHead,
    checkoutSha: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  };
  const plan = await prepareVerification(context, { json, readPlanArtifact });
  const dir = `ci-evidence/verification/${key}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/plan.json`, JSON.stringify(plan, null, 2) + "\n");
  appendFileSync(process.env.GITHUB_OUTPUT, `execute=${plan.execute}\n`);
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `${plan.reason}\n${reuseSummary(plan)}`,
  );
  console.log(`${plan.reason}; executor run ${plan.executor.runId}`);
}
async function wait(key) {
  const dir = `ci-evidence/verification/${key}`,
    plan = JSON.parse(readFileSync(`${dir}/plan.json`, "utf8"));
  const record = (text) => {
    console.log(text.trim());
    appendFileSync(`${dir}/reuse.md`, text);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  };
  const result = await waitVerification(plan, {
    json,
    readPlanArtifact,
    record,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });
  record(result.reason + "\n");
  appendFileSync(process.env.GITHUB_OUTPUT, `execute=${result.execute}\n`);
  if (!result.execute && !result.success) process.exitCode = 1;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, key, jobName] = process.argv.slice(2);
  if (!["stories-verify", "application"].includes(key))
    throw new Error("Unknown verification scope");
  if (mode === "prepare") await prepare(key, jobName);
  else if (mode === "wait") await wait(key);
  else throw new Error("Use prepare or wait");
}
