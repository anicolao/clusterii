import { test, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claimStoryOutput } from "./browser/story-helpers/story-output";

test("fresh story outputs reject retained pass/failure artifacts without deleting history", () => {
  const root = mkdtempSync(join(tmpdir(), "cluster-story-output-"));
  try {
    const old = join(root, "old"),
      fresh = join(root, "fresh");
    claimStoryOutput(old);
    for (const name of ["FAILED.json", "story.json", "001.png"]) {
      writeFileSync(join(old, name), `original ${name}`);
    }
    expect(() => claimStoryOutput(old)).toThrow("not empty");
    expect(readdirSync(old).sort()).toEqual([
      "001.png",
      "FAILED.json",
      "story.json",
    ]);
    expect(readFileSync(join(old, "FAILED.json"), "utf8")).toBe(
      "original FAILED.json",
    );
    expect(readFileSync(join(old, "001.png"), "utf8")).toBe("original 001.png");
    claimStoryOutput(fresh);
    expect(readdirSync(fresh)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
