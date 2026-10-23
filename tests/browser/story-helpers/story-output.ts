import { existsSync, mkdirSync, readdirSync } from "node:fs";

/** Never mix runs or erase retained failures when Playwright uses another outputDir. */
export function claimStoryOutput(folder: string) {
  if (existsSync(folder) && readdirSync(folder).length)
    throw new Error(
      `Illustrated output is not empty: ${folder}. Preserve this run and choose a fresh CLUSTER_STORY_OUTPUT_ROOT.`,
    );
  mkdirSync(folder, { recursive: true });
}
