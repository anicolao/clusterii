import type { TestInfo } from "@playwright/test";
import { dirname, resolve, relative, sep } from "node:path";

export function baselinePath(
  info: Pick<TestInfo, "file" | "snapshotPath">,
  name: string[],
) {
  return info.file.includes("/tests/e2e/")
    ? resolve(dirname(info.file), "screenshots", ...name)
    : info.snapshotPath("browser", "story-baselines", ...name);
}

/** The comparator and renderer preflight must name the identical file. */
export function baselineSnapshotName(
  info: Pick<TestInfo, "file" | "snapshotPath">,
  name: string[],
) {
  return relative(
    dirname(info.snapshotPath("__baseline_root__")),
    baselinePath(info, name),
  ).split(sep);
}
