import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  featureRoot,
  featureSpec,
  storySnapshotName,
  baselineDirectory,
  outputDirectory,
  archiveDirectory,
} from "../tests/e2e/helpers/story-paths.mjs";
import { featureNarrative, featureNarratives } from "../tests/e2e/helpers/feature-narrative.mjs";
import { storyViolations } from "./check-story-policy.mjs";
import { renderTelemetryPlugin } from "../tests/e2e/helpers/render-telemetry-plugin.mjs";
test("migrated and legacy paths remain separate and share one fixture implementation", () => {
  assert.equal(
    baselineDirectory("live-fleet-travel", "short", "linux-arm64"),
    "tests/e2e/008-fleet-travel/screenshots/live-fleet-travel/short/linux-arm64",
  );
  assert.equal(
    outputDirectory("live-fleet-travel", "short", "linux-arm64"),
    "test-results/stories/008-fleet-travel/stories/live-fleet-travel/short/linux-arm64",
  );
  assert.equal(
    archiveDirectory("live-fleet-travel", "short", "linux-arm64"),
    "tests/e2e/008-fleet-travel/stories/live-fleet-travel/short/linux-arm64",
  );
  assert.equal(featureRoot("commander-identity"), undefined);
  assert.equal(
    baselineDirectory("commander-identity", "phone", "linux-arm64"),
    "tests/browser/story-baselines/commander-identity/phone/linux-arm64",
  );
  assert.equal(
    outputDirectory("commander-identity", "phone", "linux-arm64"),
    "test-results/stories/commander-identity/phone/linux-arm64",
  );
  assert.match(
    readFileSync("tests/browser/story-helpers/fixtures.ts", "utf8"),
    /export \* from "..\/..\/e2e\/helpers\/fixtures"/,
  );
  const source = readFileSync(
    "tests/e2e/008-fleet-travel/fleet-travel.spec.ts",
    "utf8",
  );
  assert.deepEqual(storyViolations(source, "../helpers/fixtures"), []);
  assert.ok(
    storyViolations(
      source.replace("../helpers/fixtures", "@playwright/test"),
      "../helpers/fixtures",
    ).length,
  );
});
const four = () =>
  ["phone", "desktop", "large", "short"].map((project) => ({
    id: "live-fleet-travel",
    title: "Actual arrival",
    description: "Actual actors and results",
    status: "passed",
    mode: "verify",
    platform: "linux-arm64",
    project,
    source: {
      commit: "a".repeat(40),
      specSha256: "b".repeat(64),
      spec: "tests/e2e/008-fleet-travel/fleet-travel.spec.ts",
      dirty: true,
    },
    steps: [
      {
        id: "arrived",
        description: "Arrival acknowledged",
        actor: "Owner",
        kind: "player",
        acknowledgement: "Receipt",
        verifications: ["Private result"],
        views: [
          {
            player: "Owner",
            image: "027-arrived-1-owner.png",
            verifications: ["Conserved forces"],
          },
        ],
      },
    ],
  }));
test("generated feature narrative requires all four complete matching verified sequences", () => {
  const stories = four();
  const text = featureNarrative(stories);
  for (const p of ["phone", "desktop", "large", "short"])
    assert.ok(text.includes("/" + p + "/linux-arm64/027-arrived-1-owner.png"));
  for (const mutate of [
    (s) => s.pop(),
    (s) => (s[0].status = "failed"),
    (s) => (s[0].mode = "generate"),
    (s) => (s[0].project = "desktop"),
    (s) => (s[0].steps[0].id = "missing"),
    (s) => (s[0].platform = "darwin-arm64"),
  ]) {
    const s = four();
    mutate(s);
    assert.throws(() => featureNarrative(s));
  }
});
test("historical telemetry remains opt-in and emulator-only, with exact source anchor", () => {
  const old = process.env.PUBLIC_EMULATORS;
  try {
    delete process.env.PUBLIC_EMULATORS;
    assert.equal(renderTelemetryPlugin(false), null);
    assert.throws(() => renderTelemetryPlugin(true), /emulators/);
    process.env.PUBLIC_EMULATORS = "true";
    const plugin = renderTelemetryPlugin(true);
    assert.equal(plugin.transform("anything", "/unrelated.ts"), undefined);
    assert.throws(
      () =>
        plugin.transform("wrong", "/src/lib/components/galaxy/Scene.svelte"),
      /anchor/,
    );
    const actual = readFileSync(
      "src/lib/components/galaxy/Scene.svelte",
      "utf8",
    );
    assert.match(
      plugin.transform(actual, "/src/lib/components/galaxy/Scene.svelte"),
      /__clusterRenderSample/,
    );
  } finally {
    if (old === undefined) delete process.env.PUBLIC_EMULATORS;
    else process.env.PUBLIC_EMULATORS = old;
  }
});

test("same step IDs cannot disguise mixed spec or changed acknowledgement/view claims", () => {
  for (const mutate of [
    (s) => (s[1].source.specSha256 = "c".repeat(64)),
    (s) => (s[1].source.commit = "d".repeat(40)),
    (s) => delete s[1].source.dirty,
    (s) => (s[1].steps[0].acknowledgement = "Unacknowledged optimistic state"),
    (s) => (s[1].steps[0].actor = "Other player"),
    (s) => (s[1].steps[0].kind = "harness"),
    (s) => (s[1].steps[0].description = "Different choice"),
    (s) => (s[1].steps[0].verifications = ["Different fact"]),
    (s) => (s[1].steps[0].views[0].player = "Foreign observer"),
    (s) => (s[1].steps[0].views[0].verifications = ["Different privacy claim"]),
  ]) {
    const s = four();
    mutate(s);
    assert.throws(() => featureNarrative(s));
  }
  const allowed = four();
  allowed[1].steps[0].views[0].image = "028-other-viewport-name.png";
  assert.doesNotThrow(() => featureNarrative(allowed));
});

test("Playwright comparison and manual renderer preflight resolve the same exact baseline path", () => {
  for (const id of ["live-fleet-travel", "selected-history-consent", "commander-identity"])
    for (const viewport of ["phone", "desktop", "large", "short"]) {
      const name = storySnapshotName(
        id,
        viewport,
        "linux-arm64",
        "010-view.png",
      );
      assert.equal(
        ["tests", ...name].join("/"),
        baselineDirectory(id, viewport, "linux-arm64") + "/010-view.png",
      );
    }
  const helper = readFileSync("tests/e2e/helpers/test-step-helper.ts", "utf8");
  assert.match(helper, /const baseline = this.info.snapshotPath\(\.\.\.name\)/);
  assert.match(helper, /toMatchSnapshot\(name,/);
  assert.ok(
    readFileSync("playwright.stories.config.ts", "utf8").includes(
      "{testDir}/{arg}{ext}",
    ),
  );
});

const historyFour = () => four().map(s => ({...s, id: "selected-history-consent", source: {...s.source, spec: featureSpec("selected-history-consent")}}));
test("separate feature stories require complete matching four-size source and claims", () => {
  const history = historyFour();
  assert.match(featureNarrative(history), /selected-history-consent/);
  assert.equal(featureNarratives([...four(), ...history]).length, 2);
  for (const mutate of [
    s => s.pop(),
    s => s[1].id = "live-fleet-travel",
    s => s[1].source.spec = featureSpec("live-fleet-travel"),
    s => s[1].source.specSha256 = "c".repeat(64),
    s => s[1].steps[0].views[0].verifications = ["Unproved foreign-read denial"],
  ]) { const h=historyFour(); mutate(h); assert.throws(() => featureNarrative(h)); assert.throws(() => featureNarratives([...four(), ...h])); }
  assert.equal(outputDirectory("selected-history-consent", "phone", "linux-arm64"), "test-results/stories/009-selected-history/stories/selected-history-consent/phone/linux-arm64");
  assert.equal(archiveDirectory("selected-history-consent", "phone", "linux-arm64"), "tests/e2e/009-selected-history/stories/selected-history-consent/phone/linux-arm64");
  assert.deepEqual(storyViolations(readFileSync("tests/e2e/009-selected-history/selected-history.spec.ts", "utf8"), "../helpers/fixtures"), []);
});
