import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const files = ["tests/browser/identity-validation.story.spec.ts", "tests/browser/profile-recovery.story.spec.ts"];
const grep = "Correct an invalid identity without losing the draft or submitting an invalid command|Restore entry focus after keyboard learning and identity editing";
const args = ["x", "playwright", "test", "--config", "playwright.stories.config.ts", ...files, "--project=short", "--grep", grep, "--retries=0", "--max-failures=1", "--update-snapshots=none"];
const listed = spawnSync("bun", [...args, "--list"], { encoding: "utf8" });
if (listed.status !== 0 || !listed.stdout.includes("Total: 2 tests in 2 files") || (listed.stdout.match(/\[short\]/g) ?? []).length !== 2) {
  process.stderr.write(listed.stdout ?? ""); process.stderr.write(listed.stderr ?? "");
  throw Error("Exact two-short-story collection required; no fallback");
}
process.stdout.write(listed.stdout);
if (process.argv.includes("--list-only")) process.exit(0);
for (const command of [["x", "svelte-kit", "sync"], ["run", "--cwd", "functions", "build"]]) {
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
