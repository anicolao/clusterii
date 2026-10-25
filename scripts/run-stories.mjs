import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { runViewportCohorts } from "./story-cohorts.mjs";
const cohorts = process.env.CLUSTER_STORY_COHORTS;
if (cohorts && cohorts !== "viewport")
  throw new Error("Use CLUSTER_STORY_COHORTS=viewport or omit it");
let interrupted = false;
let activeChild;
// Keep the stop request across the gap between child processes as well.
const interrupt = () => {
  interrupted = true;
  if (!activeChild?.pid) return;
  try {
    process.kill(
      process.platform === "win32" ? activeChild.pid : -activeChild.pid,
      "SIGINT",
    );
  } catch {}
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
const mode = process.argv[2] ?? "verify";
if (!["verify", "generate"].includes(mode))
  throw new Error("Use verify or generate");
async function assertPortsFree() {
  for (const port of [4173, 19099, 19000, 18080, 15001, 14400]) {
    const occupied = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (occupied)
      throw new Error(
        `Story port ${port} is occupied. Stop the cohort you own before running; this runner never kills another worktree's processes.`,
      );
  }
}
await assertPortsFree();
const run = (args, env = process.env) =>
  new Promise((resolve, reject) => {
    if (interrupted) return reject(new Error("Story cohorts interrupted"));
    const child = spawn("bun", args, {
      stdio: "inherit",
      env,
      detached: process.platform !== "win32",
    });
    activeChild = child;
    child.once("error", (error) => {
      activeChild = undefined;
      reject(error);
    });
    child.once("exit", (code) => {
      activeChild = undefined;
      code === 0
        ? resolve()
        : reject(new Error(`Story command exited ${code}`));
    });
  });
await run(["run", "--cwd", "functions", "build"]);
const runStory = (viewport) =>
  run(
    [
      "x",
      "firebase",
      "emulators:exec",
      "--project",
      "demo-clusterii",
      "--only",
      "auth,database,firestore,functions",
      `bunx playwright test --config playwright.stories.config.ts${viewport ? ` --project=${viewport}` : ""}`,
    ],
    {
      ...process.env,
      CLUSTER_STORY_MODE: mode,
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS ?? "",
        `--import=${pathToFileURL(resolve("tests/browser/story-helpers/emulator-catalogue-register.mjs")).href}`,
      ].join(" "),
    },
  );

if (interrupted) throw new Error("Story cohorts interrupted");
if (cohorts === "viewport") {
  await runViewportCohorts({
    output: resolve("test-results/stories"),
    firestoreLog: resolve("firestore-debug.log"),
    run: runStory,
    beforeEach: assertPortsFree,
    shouldStop: () => interrupted,
  });
} else await runStory();
