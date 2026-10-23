import type { TestInfo } from "@playwright/test";
import { dirname, resolve } from "node:path";

export function baselinePath(
  info: Pick<TestInfo, "file" | "snapshotPath">,
  name: string[],
) {
  return info.file.includes("/tests/e2e/")
    ? resolve(dirname(info.file), "screenshots", ...name)
    : info.snapshotPath(...name);
}
