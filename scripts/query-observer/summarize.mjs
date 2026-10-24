import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const [folder, output] = process.argv.slice(2);
if (!folder || !output)
  throw Error("Usage: summarize.mjs retained-output summary.json");
const parse = (path) =>
  readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);
const raw = parse(join(folder, "server.jsonl"));
if (raw.length >= 50000 || raw.some((x) => x.status === "unavailable"))
  throw Error("Incomplete observer evidence");
if (raw.filter((x) => x.status === "instrumented").length !== 5)
  throw Error("Missing instrumented method");
const rows = raw.filter((x) => Number.isFinite(x.elapsedNs));
const distribution = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    max: sorted.at(-1),
  };
};
const totals = {};
for (const phase of ["commit", "notify", "query", "rules"]) {
  const selected = rows.filter((x) => x.phase === phase);
  totals[phase] = {
    elapsedMs: distribution(selected.map((x) => x.elapsedNs / 1e6)),
    outsideCommit: selected.filter((x) => x.sequence === 0).length,
    failures: selected.filter((x) => x.failed).length,
  };
}
const perCommit = rows
  .filter((x) => x.phase === "commit")
  .map((commit) => {
    const nested = rows.filter(
      (x) => x.sequence === commit.sequence && x.phase !== "commit",
    );
    return {
      sequence: commit.sequence,
      startEpochMs: commit.startEpochMs,
      commitMs: commit.elapsedNs / 1e6,
      ...Object.fromEntries(
        ["notify", "query", "rules"].flatMap((phase) => {
          const selected = nested.filter((x) => x.phase === phase);
          return [
            [phase + "Calls", selected.length],
            [phase + "Ms", selected.reduce((a, x) => a + x.elapsedNs / 1e6, 0)],
          ];
        }),
      ),
      queryTargets: nested.find((x) => x.phase === "notify")?.queries ?? null,
      streams: nested.find((x) => x.phase === "notify")?.streams ?? null,
    };
  });
const populations = {};
for (const row of perCommit.filter((x) => x.queryTargets !== null)) {
  const key = `${row.queryTargets} query targets / ${row.streams} streams`;
  (populations[key] ??= []).push(row);
}
const populationSummary = Object.fromEntries(
  Object.entries(populations).map(([key, value]) => [
    key,
    {
      count: value.length,
      commitMs: distribution(value.map((x) => x.commitMs)),
      notifyMs: distribution(value.map((x) => x.notifyMs)),
      queryCalls: distribution(value.map((x) => x.queryCalls)),
      queryMs: distribution(value.map((x) => x.queryMs)),
      rulesMs: distribution(value.map((x) => x.rulesMs)),
    },
  ]),
);
const testdir = readdirSync(join(folder, "playwright")).find((x) =>
  x.startsWith("e2e-"),
);
const client = parse(
  join(folder, "playwright", testdir, "settlement-timing.jsonl"),
);
const tx = client.filter((x) => x.event === "transaction");
const result = {
  source: readFileSync(join(folder, "source.txt"), "utf8").trim(),
  rowCount: raw.length,
  totals,
  populations: populationSummary,
  perCommit,
  client: {
    completed: client.filter((x) => x.event === "complete"),
    transactions: tx.length,
    rpcFailures: tx.reduce((a, x) => a + x.rpcFailures, 0),
    totalMs: distribution(tx.map((x) => x.totalMs)),
    postMarkerMs: distribution(
      tx
        .filter((x) => x.serverMarkerSamples)
        .map((x) => x.serverMarkerToCallbackMs),
    ),
  },
  limits: [
    "Server sequences are exact nested-call correlation, not command IDs.",
    "Client timeline uses process-relative time; no exact client/server transaction identity mapping is asserted.",
    "Rules are nested within query/notify durations: do not add overlapping spans.",
    "Darwin isolated run does not establish failing Linux cohort counts/cost.",
  ],
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify(
    { populations: result.populations, client: result.client },
    null,
    2,
  ),
);
