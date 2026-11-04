import { test, expect } from "@playwright/test";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  baselinePath,
  baselineSnapshotName,
} from "../browser/story-helpers/baseline-path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
test("real TestInfo resolves both baseline layouts without changing reviewed artifacts", async ({}, info) => {
  expect(info.config.updateSnapshots).toBe("none");
  const legacyName = [
    "local-presentation-settings",
    info.project.name,
    "darwin-arm64",
    "001-open-and-contain-1-developer-local-settings.png",
  ];
  const legacy = baselinePath(
    {
      file: join(root, "tests/browser/local-settings.story.spec.ts"),
      snapshotPath: info.snapshotPath.bind(info),
    },
    legacyName,
  );
  const expectedLegacy = join(
    root,
    "tests/browser/story-baselines",
    ...legacyName,
  );
  expect(legacy).toBe(expectedLegacy);
  const featureName = [
    "learn-and-return",
    info.project.name,
    "darwin-arm64",
    "001-enter-1-visitor.png",
  ];
  const feature = baselinePath(
    {
      file: join(root, "tests/e2e/001-entry/entry.spec.ts"),
      snapshotPath: info.snapshotPath.bind(info),
    },
    featureName,
  );
  expect(feature).toBe(
    join(root, "tests/e2e/001-entry/screenshots", ...featureName),
  );
  for (const [file, name, expected] of [
    [
      join(root, "tests/browser/local-settings.story.spec.ts"),
      legacyName,
      legacy,
    ],
    [join(root, "tests/e2e/001-entry/entry.spec.ts"), featureName, feature],
  ] as const) {
    const comparisonName = baselineSnapshotName(
      { file, snapshotPath: info.snapshotPath.bind(info) },
      name,
    );
    // Playwright uses this same name for expected/actual/diff attachments.
    // Resolving the expected file alone misses forbidden ../ output traversal.
    expect(comparisonName).not.toContain("..");
    expect(info.outputPath(...comparisonName)).toContain(info.outputDir);
    expect(
      info.snapshotPath(
        ...comparisonName,
      ),
    ).toBe(expected);
    const before = readFileSync(expected);
    const deliberatelyDifferent = readFileSync(
      expected === legacy ? feature : legacy,
    );
    let mismatch: unknown;
    try {
      expect(deliberatelyDifferent).toMatchSnapshot(comparisonName, {
        maxDiffPixels: 0,
        threshold: 0,
      });
    } catch (error) {
      mismatch = error;
    }
    expect(String(mismatch)).toContain("pixels");
    expect(String(mismatch)).not.toContain("outputPath is not allowed");
    for (const suffix of ["actual", "expected", "diff"])
      expect(
        existsSync(
          info.outputPath(...comparisonName).replace(/\.png$/, `-${suffix}.png`),
        ),
      ).toBe(true);
    expect(readFileSync(expected).equals(before)).toBe(true);
  }
  for (const path of [legacy, feature]) {
    expect(path).not.toMatch(/[{}]/);
    expect(readFileSync(path).length).toBeGreaterThan(0);
    // Read-only comparison with the committed approved PNGs and provenance.
    const directory = dirname(path);
    const files = readdirSync(directory).filter((name) =>
      /\.(png|json)$/.test(name),
    );
    expect(files).toContain("renderer.json");
    for (const name of files) {
      const artifact = join(directory, name);
      const bytes = readFileSync(artifact);
      const committed = execFileSync(
        "git",
        ["show", "HEAD:" + relative(root, artifact)],
        { cwd: root, maxBuffer: 16 * 1024 * 1024 },
      );
      expect(bytes.equals(committed), relative(root, artifact)).toBe(true);
    }
  }
});
