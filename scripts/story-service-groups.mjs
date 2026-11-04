import assert from "node:assert/strict";

// Independent test service lifetimes: never restart during a player journey.
// Firestore 1.22.0 retains disconnected targets; these real leased-tick stories
// must not inherit orphan listeners from unrelated completed stories.
const heavy = [
  "010-zero-science",
  "011-contextual-aftermath",
  "012-fleet-contacts",
];
const boundary = String.raw`[/\\]e2e[/\\](?:${heavy.join("|")})[/\\]`;
export const storyServiceGroups = [
  { id: "ordinary", filter: `^(?!.*${boundary}).*\\.spec\\.ts$` },
  ...heavy.map((id) => ({
    id,
    filter: String.raw`[/\\]e2e[/\\]${id}[/\\].*\.spec\.ts$`,
  })),
];
export function collectedIdentities(report) {
  assert.deepEqual(
    report.errors ?? [],
    [],
    "Playwright collection must succeed",
  );
  const result = [];
  function visit(suite, parents = []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        result.push(
          JSON.stringify([
            spec.file,
            spec.line,
            spec.column,
            ...parents,
            spec.title,
            test.projectName,
          ]),
        );
      }
    }
    for (const child of suite.suites ?? [])
      visit(child, [...parents, child.title]);
  }
  visit(report);
  assert.ok(result.length, "Empty story selection is forbidden");
  assert.equal(
    new Set(result).size,
    result.length,
    "Duplicate collected test identity",
  );
  return result.sort();
}
export function verifyServicePartition(complete, selections) {
  const expected = collectedIdentities(complete);
  assert.deepEqual(
    Object.keys(selections).sort(),
    storyServiceGroups.map((g) => g.id).sort(),
  );
  const actual = Object.values(selections).flatMap(collectedIdentities);
  assert.equal(
    new Set(actual).size,
    actual.length,
    "A story was selected by multiple service groups",
  );
  assert.deepEqual(
    actual.sort(),
    expected,
    "Service groups must retain every original test exactly once",
  );
  return expected.length;
}
