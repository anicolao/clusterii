// Explicit bounded local load check, not part of the hour-long player suite.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { startRecording, readRecording } from "./emulator-post-marker.mjs";

const scratch = mkdtempSync(join(tmpdir(), "cluster-export-load-"));
const recording = join(scratch, "bounded.jfr");
const destination = process.argv[2];
assert.ok(destination, "A fresh evidence directory is required");
mkdirSync(destination);
const result = {
  fixture: { workers: 16, parkMs: 20, stackDepth: 16, durationSeconds: 35 },
  sourceHashes: Object.fromEntries(
    [
      "scripts/emulator-post-marker.mjs",
      "scripts/emulator-post-marker.jfc",
      "scripts/check-emulator-export-load.mjs",
      "tests/fixtures/ProfileExportLoad.java",
    ].map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  ),
};
let child;
try {
  child = spawn("java", [resolve("tests/fixtures/ProfileExportLoad.java")], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  const [ready] = await Promise.race([
    once(child.stdout, "data"),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error("fixture startup")), 10000).unref(),
    ),
  ]);
  assert.match(ready.toString(), /^ready/);
  startRecording(child.pid, recording, 35);
  await new Promise((resolve) => setTimeout(resolve, 37000));
  result.recordingBytes = statSync(recording).size;
  assert.ok(result.recordingBytes <= 8 * 1024 * 1024);
  // Sensitivity control: the former whole-output acquisition with its exact limit.
  const args = [
    "print",
    "--json",
    "--stack-depth",
    "32",
    "--events",
    "jdk.ExecutionSample,jdk.JavaMonitorEnter,jdk.ThreadPark",
    recording,
  ];
  try {
    execFileSync("jfr", args, { timeout: 10000, maxBuffer: 64 * 1024 * 1024 });
    result.control = { category: "complete" };
  } catch (error) {
    result.control = {
      category:
        error.code === "ENOBUFS"
          ? "buffer"
          : error.code === "ETIMEDOUT"
            ? "timeout"
            : "other",
      exitCode: typeof error.status === "number" ? error.status : null,
      signal: error.signal ?? null,
      stdoutBytes: error.stdout?.length ?? 0,
      stderrBytes: error.stderr?.length ?? 0,
    };
  }
  assert.equal(result.control.category, "buffer");
  result.streamed = await readRecording(recording);
  assert.ok(result.streamed.export.stdoutBytes > 64 * 1024 * 1024);
  const summary = execFileSync("jfr", ["summary", recording], {
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  }).toString();
  result.counts = {};
  for (const line of summary.split("\n")) {
    const match = line.match(
      /^\s*(jdk\.(?:ThreadPark|JavaMonitorEnter|ExecutionSample))\s+(\d+)\s+/,
    );
    if (match) result.counts[match[1]] = Number(match[2]);
  }
  for (const [type, count] of Object.entries(result.counts))
    assert.equal(
      result.streamed.buckets
        .filter((b) => b.event === type)
        .reduce((sum, b) => sum + b.count, 0),
      count,
    );
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  if (error.diagnostic) result.exportFailure = error.diagnostic;
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
  // Only fixed classifications/counts/durations/hashes leave this fixture.
  writeFileSync(
    join(destination, "result.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  rmSync(scratch, { recursive: true, force: true });
}
