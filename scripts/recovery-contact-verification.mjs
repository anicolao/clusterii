import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { createConnection } from "node:net";
import { runtimeGuard, pinned, childExit } from "./recovery-settlement.mjs";
export const feature = "tests/e2e/012-fleet-contacts/contacts.spec.ts";
export const specHash =
  "d80d55f3550c4e55a43aae202fbfcb611275c248cd93b61831b116c73419b7f4";
export function verificationCase(args) {
  if (args.length !== 1 || args[0] !== "feature012-contacts-verify")
    throw Error("Only complete feature012 strict verification allowed");
  return [
    "x",
    "playwright",
    "test",
    "--config",
    "playwright.stories.config.ts",
    feature,
    ...["phone", "desktop", "large", "short"].map((p) => "--project=" + p),
    "--max-failures=1",
    "--retries=0",
    "--update-snapshots=none",
  ];
}
export async function executeVerification(run, record) {
  const testExit = await run(verificationCase(["feature012-contacts-verify"]));
  record({
    testExit,
    mode: "verify",
    status: testExit === 0 ? "strict-passed" : "strict-failed",
    remainingAfterFirstFailure: "unexecuted",
  });
  return testExit;
}
export async function prepareVerification(run, env) {
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
      "node scripts/recovery-contact-verification.mjs inside-feature012-contacts-verify",
    ],
    env,
  );
}
const git = (...a) =>
  execFileSync("git", a, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
async function main(args) {
  runtimeGuard(process.platform, process.env);
  const inside =
    args.length === 1 && args[0] === "inside-feature012-contacts-verify";
  if (!inside) verificationCase(args);
  if (
    createHash("sha256").update(readFileSync(feature)).digest("hex") !==
    specHash
  )
    throw Error("Source spec differs");
  if (inside) {
    const folder = process.env.CLUSTER_RECOVERY_OUTPUT;
    if (
      !folder ||
      !resolve(folder).startsWith(
        resolve("ci-evidence") + "/recovery-contact-verify-",
      ) ||
      !existsSync(join(folder, "source.json"))
    )
      throw Error("Owned provenance required");
    const source = JSON.parse(readFileSync(join(folder, "source.json")));
    if (
      source.commit !== git("rev-parse", "HEAD") ||
      process.env.CLUSTER_STORY_MODE !== "verify" ||
      process.env.CLUSTER_STORY_OUTPUT_ROOT !== join(folder, "stories")
    )
      throw Error("Source/mode/output differs");
    return executeVerification(
      (a) =>
        childExit(
          "bun",
          [...a, "--output=" + folder + "/playwright"],
          process.env,
        ),
      (r) =>
        writeFileSync(
          join(folder, "result.json"),
          JSON.stringify(r, null, 2) + "\n",
        ),
    );
  }
  if (git("status", "--porcelain")) throw Error("Clean source required");
  for (const port of [4173, 19099, 19000, 18080, 19150, 15001, 14400, 14500]) {
    const busy = await new Promise((done) => {
      const s = createConnection({ host: "127.0.0.1", port });
      s.once("connect", () => {
        s.destroy();
        done(true);
      });
      s.once("error", () => done(false));
    });
    if (busy) throw Error("Owned port occupied " + port);
  }
  mkdirSync("ci-evidence", { recursive: true });
  const folder = mkdtempSync(resolve("ci-evidence/recovery-contact-verify-"));
  writeFileSync(
    join(folder, "source.json"),
    JSON.stringify(
      {
        commit: git("rev-parse", "HEAD"),
        renderer: pinned,
        feature,
        specHash,
        projects: ["phone", "desktop", "large", "short"],
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
    NODE_OPTIONS:
      "--import=" +
      pathToFileURL(
        resolve("tests/browser/story-helpers/emulator-catalogue-register.mjs"),
      ).href,
  };
  return prepareVerification((a, e) => childExit("bun", a, e), env);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    console.error(
      e instanceof Error ? e.message : "Bounded verification failed",
    );
    process.exitCode = 1;
  }
}
