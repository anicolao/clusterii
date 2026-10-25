import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const files = ["tests/browser/identity.story.spec.ts", "tests/browser/invitation.story.spec.ts", "tests/browser/profile-recovery.story.spec.ts", "tests/browser/receipt-recovery.story.spec.ts", "tests/browser/session-recovery.story.spec.ts"];
const grep = "Save and recover a commander identity|An invited new commander saves an identity and joins the preserved campaign|Resolve two-device identity conflict without losing either draft|Retry a pending identity command without duplicate effects or draft loss|A mismatched receipt preserves the identity draft until a fresh acknowledged save|Two devices recover a cancelled sign-out without losing saved identity";
const args = ["x", "playwright", "test", "--config", "playwright.stories.config.ts", ...files, "--project=short", "--grep", grep, "--retries=0", "--max-failures=1", "--update-snapshots=none"];
const listed = spawnSync("bun", [...args, "--list"], { encoding: "utf8" });
if (listed.status !== 0 || !listed.stdout.includes("Total: 6 tests in 5 files") || (listed.stdout.match(/\[short\]/g) ?? []).length !== 6) {
  process.stderr.write(listed.stdout ?? ""); process.stderr.write(listed.stderr ?? "");
  throw Error("Exact six-short-story collection required; no fallback");
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
