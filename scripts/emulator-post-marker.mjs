import {
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const output = "ci-evidence/settlement-profile";
const jarHash =
  "9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c";
const events = [
  "jdk.ExecutionSample",
  "jdk.JavaMonitorEnter",
  "jdk.ThreadPark",
];
/** @param {string} bin @param {string[]} args */
const command = (bin, args) =>
  execFileSync(bin, args, { timeout: 10000, maxBuffer: 64 * 1024 * 1024 });
/** @param {string | number} pid @param {string} file @param {number} durationSeconds */
export function startRecording(pid, file, durationSeconds = 35) {
  if (
    !/^\d+$/.test(String(pid)) ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > 35
  )
    throw Error("attach");
  const response = command("jcmd", [
    String(pid),
    "JFR.start",
    "name=ClusterPostMarker",
    `settings=${resolve("scripts/emulator-post-marker.jfc")}`,
    `duration=${durationSeconds}s`,
    "maxsize=4m",
    `filename=${file}`,
  ]).toString();
  if (!/Started recording/.test(response)) throw Error("attach");
}
/** @param {string} file */
export function readRecording(file) {
  return aggregateProfile(
    JSON.parse(
      command("jfr", [
        "print",
        "--json",
        "--stack-depth",
        "32",
        "--events",
        events.join(","),
        file,
      ]).toString(),
    ),
  );
}
/** @param {string[]} args */
export function emulatorArguments(args) {
  /** @param {string} key */
  const value = (key) => args[args.indexOf(key) + 1];
  return (
    args.includes("-jar") &&
    /cloud-firestore-emulator-v1\.22\.0\.jar$/.test(value("-jar") ?? "") &&
    args.includes("--project_id") &&
    value("--project_id") === "demo-clusterii" &&
    args.includes("--port") &&
    value("--port") === "18080" &&
    args.includes("--host") &&
    ["127.0.0.1", "localhost"].includes(value("--host"))
  );
}
/** @typedef {{method?: {type?: {name?: string}, name?: string}}} ProfileFrame */
/** @param {ProfileFrame[]} frames */
export function phaseOf(frames) {
  const names = frames
    .map((f) => `${f.method?.type?.name ?? ""}.${f.method?.name ?? ""}`)
    .join("\n");
  if (/FunctionsEmulatorEventPublisher.*lambda/.test(names))
    return "async-event-delivery";
  if (/EventManager|EventRuleEvaluator/.test(names))
    return "event-evaluation-and-payload";
  if (/EmulatorRulesAuthorizer|rules[/.]runtime/.test(names))
    return "security-rules-evaluation";
  if (/notifyQueryListeners|snapshotQuery|snapshotPipeline/.test(names))
    return "listener-query";
  if (/ListenStreamManager|CloudFirestoreV1ListenStream/.test(names))
    return "listener-notification";
  if (/FlatLocalEntityStore|StoredEntity/.test(names)) return "row-application";
  if (/FirestoreV1GrpcAdapter|WrappedStreamObserver/.test(names))
    return "grpc-response";
  if (/cloud[/.]datastore[/.]emulator/.test(names)) return "other-emulator";
  return "other";
}
/** @param {{recording?: {events?: {type:string, values?:{stackTrace?:{frames?:ProfileFrame[]},duration?:unknown}}[]}}} document */
export function aggregateProfile(document) {
  /** @type {Record<string,{event:string,phase:string,count:number,durationMs:number}>} */
  const buckets = {};
  let ignored = 0;
  for (const event of document.recording?.events ?? []) {
    if (!events.includes(event.type)) {
      ignored++;
      continue;
    }
    const phase = phaseOf(event.values?.stackTrace?.frames ?? []);
    const key = `${event.type}:${phase}`;
    const bucket = (buckets[key] ??= {
      event: event.type,
      phase,
      count: 0,
      durationMs: 0,
    });
    bucket.count++;
    const duration = event.values?.duration;
    if (typeof duration === "string" && /^PT\d+(\.\d+)?S$/.test(duration))
      bucket.durationMs += Number(duration.slice(2, -1)) * 1000;
  }
  return { buckets: Object.values(buckets), ignoredEvents: ignored };
}

// The first Linux batch starts one detached observer. No command is awaited or
// modified. A run-wide claim survives worker replacement and viewport cohorts.
export function requestEmulatorProfile() {
  if (
    process.env.CLUSTER_EMULATOR_POST_MARKER !== "1" ||
    process.platform !== "linux"
  )
    return;
  try {
    mkdirSync(output, { recursive: true });
    mkdirSync(join(output, "claimed"));
    const child = spawn(
      process.execPath,
      [resolve("scripts/emulator-post-marker.mjs"), "observe"],
      {
        detached: true,
        stdio: "ignore",
        env: process.env,
      },
    );
    child.on("error", () => {
      try {
        writeFileSync(
          join(output, "result.json"),
          JSON.stringify({ status: "unavailable", reason: "attach" }),
        );
      } catch {
        /* Diagnostics cannot throw into the player test. */
      }
    });
    child.unref();
  } catch {
    /* Existing claim or diagnostic I/O failure never changes gameplay. */
  }
}
async function observe() {
  mkdirSync(output, { recursive: true });
  /** @param {Record<string, unknown>} value */
  const record = (value) =>
    writeFileSync(
      join(output, "result.json"),
      JSON.stringify(value, null, 2) + "\n",
    );
  let scratch,
    phase = "guard";
  const started = performance.now();
  try {
    if (
      process.platform !== "linux" ||
      process.env.CLUSTER_EMULATOR_POST_MARKER !== "1" ||
      process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080"
    )
      throw Error("guard");
    phase = "target";
    const targets = readdirSync("/proc")
      .filter((p) => /^\d+$/.test(p))
      .flatMap((pid) => {
        try {
          const args = readFileSync(`/proc/${pid}/cmdline`)
            .toString()
            .split("\0");
          return emulatorArguments(args)
            ? [{ pid, jar: args[args.indexOf("-jar") + 1] }]
            : [];
        } catch {
          return [];
        }
      });
    if (targets.length !== 1) throw Error("target");
    const target = targets[0];
    phase = "jar";
    if (
      createHash("sha256").update(readFileSync(target.jar)).digest("hex") !==
      jarHash
    )
      throw Error("jar");
    scratch = mkdtempSync(join(tmpdir(), "cluster-post-marker-"));
    const file = join(scratch, "bounded.jfr");
    phase = "attach";
    startRecording(target.pid, file);
    const attachMs = performance.now() - started;
    record({
      status: "recording",
      durationSeconds: 35,
      attachMs,
      sourceJarSHA256: jarHash,
    });
    phase = "recording";
    await new Promise((resolve) => setTimeout(resolve, 37000));
    if (statSync(file).size > 8 * 1024 * 1024) throw Error("size");
    phase = "parse";
    const summary = readRecording(file);
    record({
      status: "complete",
      durationSeconds: 35,
      attachMs,
      sourceJarSHA256: jarHash,
      ...summary,
    });
  } catch {
    record({
      status: "unavailable",
      reason: phase,
      elapsedMs: performance.now() - started,
    });
  } finally {
    // Raw JFR can contain JVM/thread metadata. Export only fixed categories;
    // this explicitly disposable scratch is never uploaded as player evidence.
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href &&
  process.argv[2] === "observe"
)
  await observe();
