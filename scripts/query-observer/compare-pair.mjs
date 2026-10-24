import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [folder, isolatedFile, output] = process.argv.slice(2);
if (!folder || !isolatedFile || !output)
  throw Error("Usage: compare-pair.mjs pair-folder isolated-summary output");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const paired = read(join(folder, "summary.json")),
  isolated = read(isolatedFile),
  exits = read(join(folder, "pair-exits.json"));
if (
  exits.length !== 2 ||
  exits[0].name !== "route-forces" ||
  exits[1].name !== "feature010" ||
  exits[1].startedAt < exits[0].finishedAt
)
  throw Error("Invalid ordered pair");
const distribution = (values) => {
  const a = [...values].sort((a, b) => a - b);
  return {
    count: a.length,
    min: a[0],
    median: a[Math.floor(a.length / 2)],
    p95: a[Math.floor(a.length * 0.95)],
    max: a.at(-1),
  };
};
const phases = exits.map((phase) => {
  const commits = paired.perCommit.filter(
    (x) =>
      x.startEpochMs >= phase.startedAt && x.startEpochMs <= phase.finishedAt,
  );
  const populations = {};
  for (const x of commits.filter((x) => x.queryTargets !== null))
    (populations[`${x.queryTargets}/${x.streams}`] ??= []).push(x);
  return {
    ...phase,
    commitCount: commits.length,
    firstNotification: commits.find((x) => x.queryTargets !== null),
    lastNotification: commits.findLast((x) => x.queryTargets !== null),
    populations: Object.fromEntries(
      Object.entries(populations).map(([key, rows]) => [
        key,
        Object.fromEntries(
          ["commitMs", "notifyMs", "queryCalls", "queryMs", "rulesMs"].map(
            (field) => [field, distribution(rows.map((x) => x[field]))],
          ),
        ),
      ]),
    ),
  };
});
const ticks = (x) =>
  x.client.completed
    .filter((x) => x.label === "batch")
    .reduce((a, x) => a + x.elapsedMs, 0);
const result = {
  isolatedSource: isolated.source,
  pairedSource: paired.source,
  storyExits: exits.map((x) => x.exit),
  isolatedTicksMs: ticks(isolated),
  pairedTicksMs: ticks(paired),
  firstSuccessorNotificationAfterPredecessorExitMs:
    phases[1].firstNotification.startEpochMs - phases[0].finishedAt,
  isolatedPopulation: isolated.populations["14 query targets / 14 streams"],
  phases,
  limits: [
    "Counts are actual registrations, not proof that every stream is a live client.",
    "Retention is observed over this pair, not proven permanent.",
    "Nested rules/query spans overlap; do not add as separate wall time.",
    "No exact query expression or client command identity exported.",
    "A fast pair is not a historical timeout fix; no extrapolated full-cohort count is treated as measured.",
  ],
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      storyExits: result.storyExits,
      isolatedTicksMs: result.isolatedTicksMs,
      pairedTicksMs: result.pairedTicksMs,
      retentionIntervalMs:
        result.firstSuccessorNotificationAfterPredecessorExitMs,
      populations: phases.map((x) => ({
        name: x.name,
        counts: Object.keys(x.populations),
      })),
    },
    null,
    2,
  ),
);
