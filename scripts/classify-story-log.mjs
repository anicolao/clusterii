import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

// Offline first-failure inventory. Never reads actual images as approved baselines.
const [file, revision] = process.argv.slice(2);
if (!file || !revision)
  throw Error(
    "Usage: node scripts/classify-story-log.mjs log.gz source-revision",
  );
const bytes = readFileSync(file);
const log = (file.endsWith(".gz") ? gunzipSync(bytes) : bytes)
  .toString()
  .replace(/\x1b\[[0-9;]*m/g, "")
  .replace(/^\d{4}-\d\d-\d\dT\S+\s/gm, "");
const headers = [
  ...log.matchAll(/^\s+(\d+)\) \[(phone|desktop|large|short)\] › (.+)$/gm),
];
const tree = new Set(
  execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", revision, "--", "tests"],
    { maxBuffer: 16 * 1024 * 1024 },
  )
    .toString()
    .trim()
    .split("\n"),
);
const rows = headers.map((match, index) => {
  const block = log.slice(match.index, headers[index + 1]?.index ?? log.length);
  const error = block.match(/^\s+(?:TimeoutError|Error): (.+)$/m)?.[1];
  if (!error) throw Error(`Unclassified header: ${match[0]}`);
  let category = "behavior";
  if (error.startsWith("Missing reviewed baseline/renderer:"))
    category = "missing-reference";
  else if (/toMatchSnapshot|Every decoded RGBA byte/.test(error))
    category = "pixel";
  else if (/timeout|Timeout|timed out/i.test(error)) category = "timeout";
  else if (/contain|overlap|corner|viewport|geometry/i.test(error))
    category = "geometry";
  const row = {
    viewport: match[2],
    ordinal: Number(match[1]),
    story: match[3].trim(),
    category,
    error,
  };
  if (category === "missing-reference") {
    const path = error.match(
      /\/clusterii\/clusterii\/(.+)\. Generate candidates/,
    )[1];
    row.reference = {
      path,
      pngTrackedAtSource: tree.has(path),
      rendererTrackedAtSource: tree.has(`${dirname(path)}/renderer.json`),
      literalBraces: /[{}]/.test(path),
    };
  }
  return row;
});
const counts = {};
for (const row of rows) {
  counts[row.viewport] ??= {};
  counts[row.viewport][row.category] =
    (counts[row.viewport][row.category] ?? 0) + 1;
}
const reportedFailures = [...log.matchAll(/^\s+(\d+) failed\s*$/gm)].map((m) =>
  Number(m[1]),
);
if (
  reportedFailures.length !== 4 ||
  reportedFailures.reduce((a, b) => a + b, 0) !== rows.length
)
  throw Error(
    "First-failure inventory does not reconcile with four cohort summaries",
  );
for (const [i, viewport] of ["phone", "desktop", "large", "short"].entries()) {
  const cohort = rows.filter((row) => row.viewport === viewport);
  if (
    cohort.length !== reportedFailures[i] ||
    cohort.some((row, index) => row.ordinal !== index + 1)
  )
    throw Error(
      `Incomplete or duplicate first-failure inventory for ${viewport}`,
    );
}
console.log(
  JSON.stringify(
    { source: revision, firstFailures: rows.length, counts, rows },
    null,
    2,
  ),
);
