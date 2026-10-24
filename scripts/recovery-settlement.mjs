import { spawn, execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createConnection } from "node:net";

export const pinned =
  "mcr.microsoft.com/playwright:v1.61.1-noble@sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321";
export const feature = "tests/e2e/010-zero-science/zero-science.spec.ts";
export function singleCase(args) {
  if (args.length !== 1 || args[0] !== "feature010-phone")
    throw Error("Only feature010-phone is allowed");
  return [
    "x",
    "playwright",
    "test",
    "--config",
    "playwright.stories.config.ts",
    feature,
    "--project=phone",
    "--max-failures=1",
    "--retries=0",
    "--update-snapshots=none",
  ];
}
export function runtimeGuard(platform, env) {
  if (
    platform !== "linux" ||
    env.CLUSTER_PINNED_RENDERER !== pinned ||
    env.CLUSTER_NIX_RENDERER_DIGEST !== pinned.split("@")[1]
  )
    throw Error("Pinned Nix Linux renderer required");
  if (
    env.CLUSTER_STORY_FILTER ||
    env.CLUSTER_STORY_COHORTS ||
    (env.CLUSTER_STORY_MODE && env.CLUSTER_STORY_MODE !== "verify")
  )
    throw Error(
      "Recovery cannot inherit filtering, cohorts or generation mode",
    );
}
export function childExit(bin, args, env) {
  return new Promise((resolveExit) => {
    const child = spawn(bin, args, { stdio: "inherit", env });
    child.once("error", () => resolveExit(127));
    child.once("exit", (code, signal) =>
      resolveExit(code ?? (signal ? 128 : 1)),
    );
  });
}
// Wait only after Playwright exits, while Firebase still owns the emulators.
// This is diagnostic completion, never extra time in the player's test/step.
export async function finishObservation({
  read,
  sleep,
  now,
  budgetMs = 60000,
}) {
  const started = now();
  while (true) {
    const state = read();
    if (state.status !== "recording" && state.status !== "pending")
      return state;
    const remaining = budgetMs - (now() - started);
    if (remaining <= 0)
      return { status: "unavailable", reason: "completion-deadline" };
    await sleep(Math.min(250, remaining));
  }
}
export async function executeSingle({ args, run, observe, record }) {
  const code = await run(singleCase(args));
  let observation;
  try {
    observation = await observe();
  } catch {
    observation = { status: "unavailable", reason: "completion-read" };
  }
  record({ testExit: code, observation });
  // An observer cannot turn a failed test green; missing diagnostics also cannot
  // certify a successful timing observation.
  return code !== 0 ? code : observation.status === "complete" ? 0 : 2;
}
async function portsFree() {
  for (const port of [4173, 19099, 19000, 18080, 19150, 15001, 14400, 14500]) {
    const busy = await new Promise((done) => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        done(true);
      });
      socket.once("error", () => done(false));
    });
    if (busy)
      throw Error(`Recovery port ${port} is occupied; no process was stopped`);
  }
}
function readObservation() {
  const folder = "ci-evidence/settlement-profile";
  if (!existsSync(join(folder, "claimed"))) return { status: "not-requested" };
  if (!existsSync(join(folder, "result.json"))) return { status: "pending" };
  try {
    const value = JSON.parse(readFileSync(join(folder, "result.json"), "utf8"));
    if (["complete", "unavailable", "recording"].includes(value.status))
      return value;
  } catch {
    /* Atomic completion may be between truncate and write. */
  }
  return { status: "pending" };
}
export async function prepareSingle(run, env) {
  for (const a of [
    ["x", "svelte-kit", "sync"],
    ["run", "--cwd", "functions", "build"],
  ]) {
    const code = await run(a, env);
    if (code !== 0) return code;
  }
  return run(
    [
      "x",
      "firebase",
      "emulators:exec",
      "--project",
      "demo-clusterii",
      "--only",
      "auth,database,firestore,functions",
      "node scripts/recovery-settlement.mjs inside-feature010-phone",
    ],
    env,
  );
}
async function main(args) {
  runtimeGuard(process.platform, process.env);
  if (args.length === 1 && args[0] === "inside-feature010-phone") {
    const folder = process.env.CLUSTER_RECOVERY_OUTPUT;
    if (
      !folder ||
      !resolve(folder).startsWith(resolve("ci-evidence") + "/recovery-") ||
      !existsSync(join(folder, "source.json"))
    )
      throw Error("Owned recovery provenance required");
    return executeSingle({
      args: ["feature010-phone"],
      run: (a) =>
        childExit("bun", [...a, `--output=${folder}/playwright`], process.env),
      observe: () =>
        finishObservation({
          read: readObservation,
          sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
          now: () => performance.now(),
        }),
      record: (result) =>
        writeFileSync(
          join(folder, "result.json"),
          JSON.stringify(result, null, 2) + "\n",
        ),
    });
  }
  singleCase(args);
  await portsFree();
  if (existsSync("ci-evidence/settlement-profile"))
    throw Error(
      "Existing profile evidence must be preserved; use a clean owned checkout",
    );
  const git = (...a) =>
    execFileSync("git", a, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  if (git("status", "--porcelain"))
    throw Error("Clean exact-source checkout required");
  mkdirSync("ci-evidence", { recursive: true });
  const folder = mkdtempSync(resolve("ci-evidence/recovery-"));
  writeFileSync(
    join(folder, "source.json"),
    JSON.stringify(
      {
        commit: git("rev-parse", "HEAD"),
        renderer: pinned,
        feature,
        project: "phone",
        mode: "verify",
        testBudgetMs: 240000,
        stepBudgetMs: 30000,
        assertionBudgetMs: 10000,
      },
      null,
      2,
    ) + "\n",
  );
  const env = {
    ...process.env,
    CLUSTER_RECOVERY_OUTPUT: folder,
    CLUSTER_STORY_OUTPUT_ROOT: join(folder, "stories"),
    CLUSTER_STORY_MODE: "verify",
    CLUSTER_SETTLEMENT_TIMING: "1",
    CLUSTER_SETTLEMENT_RPC_TIMING: "1",
    CLUSTER_EMULATOR_POST_MARKER: "1",
    NODE_OPTIONS: `--import=${pathToFileURL(resolve("tests/browser/story-helpers/emulator-catalogue-register.mjs")).href}`,
  };
  return prepareSingle((a, e) => childExit("bun", a, e), env);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Recovery orchestration failed",
    );
    process.exitCode = 1;
  }
}
