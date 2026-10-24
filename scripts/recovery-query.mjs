import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  realpathSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createConnection } from "node:net";
import {
  runtimeGuard,
  singleCase,
  childExit,
  pinned,
  feature,
} from "./recovery-settlement.mjs";
export const jarHash =
  "9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c";
export function queryArgs(args) {
  if (args.length !== 1 || args[0] !== "feature010-query-phone")
    throw Error("Only one feature010-query-phone observation allowed");
  return singleCase(["feature010-phone"]);
}
export async function prepareQuery(run, env, folder) {
  for (const [bin, args] of [
    ["bun", ["x", "svelte-kit", "sync"]],
    ["bun", ["run", "--cwd", "functions", "build"]],
    [
      "bun",
      [
        "x",
        "firebase",
        "emulators:exec",
        "--project",
        "demo-clusterii",
        "--only",
        "auth,database,firestore,functions",
        `bun x playwright test --config playwright.stories.config.ts ${feature} --project=phone --max-failures=1 --retries=0 --update-snapshots=none --output="${folder}/playwright"`,
      ],
    ],
  ]) {
    const code = await run(bin, args, env);
    if (code !== 0) return code;
  }
  return 0;
}
async function main(args) {
  queryArgs(args);
  runtimeGuard(process.platform, process.env);
  const git = (...a) =>
    execFileSync("git", a, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  if (git("status", "--porcelain")) throw Error("Clean exact source required");
  for (const port of [
    4173, 19099, 19000, 18080, 19150, 15001, 14400, 14500, 14000, 19299, 19499,
  ]) {
    const busy = await new Promise((done) => {
      const s = createConnection({ host: "127.0.0.1", port });
      s.on("connect", () => {
        s.destroy();
        done(true);
      });
      s.on("error", () => done(false));
    });
    if (busy) throw Error(`Occupied port ${port}; nothing stopped`);
  }
  mkdirSync("ci-evidence", { recursive: true });
  const folder = mkdtempSync(resolve("ci-evidence/recovery-query-"));
  const hash = (file) =>
    createHash("sha256").update(readFileSync(file)).digest("hex");
  writeFileSync(
    join(folder, "source.json"),
    JSON.stringify(
      {
        commit: git("rev-parse", "HEAD"),
        feature,
        specSha256: hash(feature),
        observerSha256: hash("scripts/query-observer/QueryObserver.java"),
        renderer: pinned,
        mode: "verify",
        project: "phone",
        budgets: { story: 240000, step: 30000, assertion: 10000 },
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(folder, "source.txt"), git("rev-parse", "HEAD") + "\n");
  // Download through the already installed, pinned Firebase CLI, never substitute a jar.
  let code = await childExit(
    "bun",
    ["x", "firebase", "setup:emulators:firestore"],
    process.env,
  );
  if (code !== 0) return code;
  const jar = join(
    process.env.FIREBASE_EMULATORS_PATH ??
      join(homedir(), ".cache", "firebase", "emulators"),
    "cloud-firestore-emulator-v1.22.0.jar",
  );
  if (!existsSync(jar) || hash(jar) !== jarHash)
    throw Error("Pinned emulator jar unavailable or wrong hash");
  const agent = join(folder, "agent");
  code = await childExit(
    "bash",
    ["scripts/query-observer/build-check.sh", agent],
    { ...process.env, CLUSTER_FIRESTORE_JAR: jar },
  );
  if (code !== 0) return code;
  const env = {
    ...process.env,
    CLUSTER_QUERY_OBSERVER_PROJECT: "demo-clusterii",
    JAVA_TOOL_OPTIONS: `--add-exports=java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED -javaagent:${agent}/observer.jar=${folder}/server.jsonl`,
    NODE_OPTIONS: `--import=${pathToFileURL(resolve("tests/browser/story-helpers/emulator-catalogue-register.mjs")).href}`,
    CLUSTER_STORY_MODE: "verify",
    CLUSTER_STORY_OUTPUT_ROOT: join(folder, "stories"),
    CLUSTER_SETTLEMENT_TIMING: "1",
    CLUSTER_SETTLEMENT_RPC_TIMING: "1",
  };
  delete env.CLUSTER_EMULATOR_POST_MARKER;
  code = await prepareQuery(childExit, env, folder);
  // Firebase shutdown flushes observer rows; summarize after test termination, never extra gameplay time.
  const analysis = await childExit(
    "node",
    [
      "scripts/query-observer/summarize.mjs",
      folder,
      join(folder, "summary.json"),
    ],
    process.env,
  );
  writeFileSync(
    join(folder, "result.json"),
    JSON.stringify(
      {
        testExit: code,
        analysisExit: analysis,
        jarSha256: jarHash,
        observerJarSha256: hash(join(agent, "observer.jar")),
      },
      null,
      2,
    ) + "\n",
  );
  return code !== 0 ? code : analysis;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : "Observation failed");
    process.exitCode = 1;
  }
}
