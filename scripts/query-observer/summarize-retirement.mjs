import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
const [folder, output] = process.argv.slice(2);
if (!folder || !output)
  throw Error("Usage: summarize-retirement.mjs folder output");
const parse = (p) => readFileSync(p, "utf8").trim().split("\n").map(JSON.parse);
assert.equal(Number(readFileSync(join(folder, "test-exit.txt"), "utf8")), 0);
const raw = parse(join(folder, "server.jsonl")),
  phases = parse(join(folder, "phases.jsonl"));
assert.ok(raw.length < 50000);
assert.ok(!raw.some((x) => x.status === "unavailable"));
assert.equal(raw.filter((x) => x.status === "instrumented").length, 5);
const intervals = phases.map((p, i) => ({
  ...p,
  notifications: raw
    .filter(
      (x) =>
        x.phase === "notify" &&
        x.startEpochMs >= p.at &&
        x.startEpochMs < (phases[i + 1]?.at ?? Infinity),
    )
    .map((x) => ({
      sequence: x.sequence,
      queryTargets: x.queries,
      streams: x.streams,
      elapsedNs: x.elapsedNs,
    })),
}));
for (const [phase, count] of [
  ["terminated-listener-live", 1],
  ["sdk-termination-complete", 1],
  ["explicit-listener-live", 2],
  ["explicit-unsubscribe-and-read-complete", 1],
  ["explicit-termination-complete", 1],
]) {
  const rows = intervals.find((x) => x.phase === phase)?.notifications;
  assert.ok(rows?.length);
  assert.ok(rows.every((x) => x.queryTargets === count));
}
assert.ok(phases.some((x) => x.phase === "foreign-read-denied"));
writeFileSync(
  output,
  JSON.stringify(
    {
      source: readFileSync(join(folder, "source.txt"), "utf8").trim(),
      testExit: Number(readFileSync(join(folder, "test-exit.txt"), "utf8")),
      recordCount: raw.length,
      intervals,
      limits: [
        "Node SDK service probe, not browser-mounted or pinned-Linux correction acceptance.",
        "Targets measured at acknowledged profile writes, not a claim of permanent retention.",
        "No per-target identity or request/document contents exported.",
        "No production fix or full-cohort timeout resolution established.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Retirement control validated: 1 -> terminate -> 1; +1 -> unsubscribe -> 1; termination -> 1; foreign read denied",
);
