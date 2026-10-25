import { createConnection } from "node:net";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const files = ["tests/browser/maintenance.story.spec.ts"];
const args = ["x", "playwright", "test", "--config", "playwright.stories.config.ts", ...files, "--project=short", "--retries=0", "--max-failures=1", "--update-snapshots=none"];
const sync = spawnSync("bun", ["x", "svelte-kit", "sync"], { stdio: "inherit" });
if (sync.status !== 0) process.exit(sync.status ?? 1);
const listed = spawnSync("bun", [...args, "--list"], { encoding: "utf8" });
if (listed.status !== 0 || !listed.stdout.includes("Total: 1 test in 1 file") || ["short"].some(viewport => listed.stdout.split("[" + viewport + "]").length - 1 !== 1)) {
  process.stderr.write(listed.stdout ?? ""); process.stderr.write(listed.stderr ?? "");
  throw Error("Exact one short maintenance case required; no fallback");
}
process.stdout.write(listed.stdout);
if (process.argv.includes("--list-only")) process.exit(0);
const disk = spawnSync("df", ["-Pk", "."], {encoding:"utf8"});
const freeKiB = Number(disk.stdout.trim().split("\n").at(-1)?.trim().split(/\s+/)[3]);
if (disk.status !== 0 || !Number.isFinite(freeKiB) || freeKiB < 2559296) throw Error("Insufficient capture floor plus reserve");
console.log("Preflight available KiB:",freeKiB);
for (const port of [4173,19099,19000,18080,15001,14400,19150]) {
 const busy = await new Promise(resolve => {const socket=createConnection({host:"127.0.0.1",port});socket.once("connect",()=>{socket.destroy();resolve(true)});socket.once("error",()=>resolve(false));});
 if(busy) throw Error("Owned emulator port already in use: "+port);
}
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
