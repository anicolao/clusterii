import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const files = ["tests/browser/fleet-travel-catchup.story.spec.ts"];
const args = ["x", "playwright", "test", "--config", "playwright.stories.config.ts", ...files, "--project=phone", "--project=desktop", "--project=large", "--project=short", "--retries=0", "--max-failures=1", "--update-snapshots=none"];
const sync = spawnSync("bun", ["x", "svelte-kit", "sync"], { stdio: "inherit" });
if (sync.status !== 0) process.exit(sync.status ?? 1);
const listed = spawnSync("bun", [...args, "--list"], { encoding: "utf8" });
if (listed.status !== 0 || !listed.stdout.includes("Total: 4 tests in 1 file") || ["phone", "desktop", "large", "short"].some(viewport => listed.stdout.split("[" + viewport + "]").length - 1 !== 1)) {
  process.stderr.write(listed.stdout ?? ""); process.stderr.write(listed.stderr ?? "");
  throw Error("Exact four paused-travel story cases required; no fallback");
}
process.stdout.write(listed.stdout);
if (process.argv.includes("--list-only")) process.exit(0);
for (const command of [["run", "--cwd", "functions", "build"]]) {
  const result = spawnSync("bun", command, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const quote = (s) => "'" + s.replaceAll("'", "'\''") + "'";
const command = ["bun", ...args].map(quote).join(" ");
const result = spawnSync("bun", ["x", "firebase", "emulators:exec", "--project", "demo-clusterii", "--only", "auth,database,firestore,functions", command], {
  stdio: "inherit",
  env: { ...process.env, CLUSTER_STORY_MODE: "generate", NODE_OPTIONS: [process.env.NODE_OPTIONS ?? "", "--import=" + pathToFileURL(resolve("tests/browser/story-helpers/emulator-catalogue-register.mjs")).href].join(" ") },
});
process.exit(result.status ?? 1);
