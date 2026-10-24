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
import { StringDecoder } from "node:string_decoder";
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
/** Strict JFR JSON envelope, with JSON.parse validating each complete event. */
export class ProfileDecoder {
  prefix = "";
  trailer = "";
  pieces = [];
  bytes = 0;
  depth = 0;
  quoted = false;
  escaped = false;
  opened = false;
  ended = false;
  expectEvent = true;
  afterComma = false;
  summary = { buckets: [], ignoredEvents: 0 };
  fail(category) {
    const error = Error(category);
    error.category = category;
    throw error;
  }
  add(piece) {
    this.bytes += Buffer.byteLength(piece);
    if (this.bytes > 4 * 1024 * 1024) this.fail("buffer");
    this.pieces.push(piece);
  }
  event() {
    let value;
    try {
      value = JSON.parse(this.pieces.join(""));
    } catch {
      this.fail("json");
    }
    if (
      !value ||
      typeof value.type !== "string" ||
      !value.values ||
      typeof value.values !== "object" ||
      Array.isArray(value.values) ||
      (value.values.stackTrace?.frames != null &&
        !Array.isArray(value.values.stackTrace.frames))
    )
      this.fail("schema");
    let next;
    try {
      next = aggregateProfile({ recording: { events: [value] } });
    } catch {
      this.fail("schema");
    }
    this.summary.ignoredEvents += next.ignoredEvents;
    for (const bucket of next.buckets) {
      const prior = this.summary.buckets.find(
        (b) => b.event === bucket.event && b.phase === bucket.phase,
      );
      if (prior) {
        prior.count += bucket.count;
        prior.durationMs += bucket.durationMs;
      } else this.summary.buckets.push(bucket);
    }
    this.pieces = [];
    this.bytes = 0;
    this.expectEvent = false;
    this.afterComma = false;
  }
  write(text) {
    let segment = this.depth ? 0 : -1;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (!this.opened) {
        this.prefix += c;
        if (this.prefix.length > 4096) this.fail("schema");
        if (c === "[") {
          if (
            !/^\s*\{\s*"recording"\s*:\s*\{\s*"events"\s*:\s*\[$/.test(
              this.prefix,
            )
          )
            this.fail("schema");
          this.opened = true;
        }
        continue;
      }
      if (this.ended) {
        this.trailer += c;
        if (this.trailer.length > 4096) this.fail("schema");
        continue;
      }
      if (!this.depth) {
        if (/\s/.test(c)) continue;
        if (c === "]" && !this.afterComma) {
          this.ended = true;
          continue;
        }
        if (c === "," && !this.expectEvent) {
          this.expectEvent = true;
          this.afterComma = true;
          continue;
        }
        if (c !== "{" || !this.expectEvent) this.fail("json");
        this.depth = 1;
        segment = i;
        continue;
      }
      if (this.quoted) {
        if (this.escaped) this.escaped = false;
        else if (c === "\\") this.escaped = true;
        else if (c === '"') this.quoted = false;
      } else if (c === '"') this.quoted = true;
      else if (c === "{" || c === "[") this.depth++;
      else if (c === "}" || c === "]") {
        this.depth--;
        if (!this.depth) {
          this.add(text.slice(segment, i + 1));
          this.event();
          segment = -1;
        }
      }
    }
    if (segment >= 0) this.add(text.slice(segment));
  }
  finish() {
    if (!this.opened) this.fail("schema");
    if (!this.ended || this.depth || !/^\s*\}\s*\}\s*$/.test(this.trailer))
      this.fail("json");
    return this.summary;
  }
}
/** Fixed safe metadata only; never retain subprocess output or exception text. */
export async function readProfileProcess(bin, args, timeoutMs = 10000) {
  const decoder = new ProfileDecoder(),
    utf8 = new StringDecoder("utf8");
  let stdoutBytes = 0,
    stderrBytes = 0,
    category,
    exitCode = null,
    signal = null;
  const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
  const started = performance.now();
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      category ??= "timeout";
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (category) return;
      try {
        decoder.write(utf8.write(chunk));
      } catch (error) {
        category = error.category ?? "json";
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
    });
    child.on("error", () => {
      category = "spawn";
    });
    child.on("close", (code, sig) => {
      clearTimeout(timer);
      exitCode = code;
      signal = sig;
      if (!category && sig) category = "signal";
      if (!category && code !== 0) category = "exit";
      let summary;
      if (!category) {
        try {
          decoder.write(utf8.end());
          summary = decoder.finish();
        } catch (error) {
          category = error.category ?? "schema";
        }
      }
      const diagnostic = {
        category: category ?? "complete",
        exitCode,
        signal,
        stdoutBytes,
        stderrBytes,
        elapsedMs: performance.now() - started,
      };
      if (category) {
        const error = Error("profile-export");
        error.diagnostic = diagnostic;
        reject(error);
      } else resolve({ ...summary, export: diagnostic });
    });
  });
}
/** @param {string} file */
export async function readRecording(file) {
  return await readProfileProcess("jfr", [
    "print",
    "--json",
    "--stack-depth",
    "32",
    "--events",
    events.join(","),
    file,
  ]);
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
    const summary = await readRecording(file);
    record({
      status: "complete",
      durationSeconds: 35,
      attachMs,
      sourceJarSHA256: jarHash,
      ...summary,
    });
  } catch (error) {
    record({
      status: "unavailable",
      reason: phase,
      ...(phase === "parse" && error.diagnostic
        ? { export: error.diagnostic }
        : {}),
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
