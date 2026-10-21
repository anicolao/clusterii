import { spawn } from "node:child_process";
import { createConnection } from "node:net";
const mode = process.argv[2] ?? "verify";
if (!["verify", "generate"].includes(mode))
  throw new Error("Use verify or generate");
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
const run = (args, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn("bun", args, {
      stdio: "inherit",
      env,
      detached: process.platform !== "win32",
    });
    const interrupt = () => {
      try {
        process.kill(
          process.platform === "win32" ? child.pid : -child.pid,
          "SIGINT",
        );
      } catch {}
    };
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    child.once("error", reject);
    child.once("exit", (code) => {
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
      code === 0
        ? resolve()
        : reject(new Error(`Story command exited ${code}`));
    });
  });
await run(["run", "--cwd", "functions", "build"]);
await run(
  [
    "x",
    "firebase",
    "emulators:exec",
    "--project",
    "demo-clusterii",
    "--only",
    "auth,database,firestore,functions",
    "bunx playwright test --config playwright.stories.config.ts",
  ],
  { ...process.env, CLUSTER_STORY_MODE: mode },
);
