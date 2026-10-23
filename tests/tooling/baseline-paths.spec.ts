import { test, expect } from "@playwright/test";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { baselinePath } from "../browser/story-helpers/baseline-path";

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
