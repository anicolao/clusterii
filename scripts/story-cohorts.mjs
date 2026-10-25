import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export const storyViewports = ["phone", "desktop", "large", "short"];

// Move, never overwrite or discard, every cohort's evidence into the normal
// artifact tree. The same story owns different viewport subdirectories.
function mergeEvidence(source, destination) {
  if (!existsSync(destination)) {
    renameSync(source, destination);
    return;
  }
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name),
      to = join(destination, entry.name);
    if (!existsSync(to)) renameSync(from, to);
    else if (entry.isDirectory()) mergeEvidence(from, to);
    else
      throw new Error(
        `Cohort artifact collision; preserving both copies: ${to}`,
      );
  }
  rmdirSync(source);
}

export async function runViewportCohorts({
  output,
  firestoreLog,
  run,
  beforeEach,
  shouldStop = () => false,
}) {
  // Check ownership before moving any existing evidence or starting a process.
  await beforeEach();
  mkdirSync(dirname(output), { recursive: true });
  const staging = mkdtempSync(join(dirname(output), ".story-cohorts-"));
  if (existsSync(output)) {
    renameSync(output, join(staging, "previous"));
    console.log(
      `Previous story evidence preserved at ${join(staging, "previous")}`,
    );
  }
  if (existsSync(firestoreLog)) {
    const previous = join(staging, "previous-root-logs");
    mkdirSync(previous);
    renameSync(firestoreLog, join(previous, "firestore-debug.log"));
    console.log(`Previous Firestore evidence preserved at ${previous}`);
  }
  const results = [];
  try {
    for (const viewport of storyViewports) {
      if (shouldStop()) throw new Error("Story cohorts interrupted");
      if (results.length) await beforeEach();
      const startedAt = new Date().toISOString();
      let error;
      try {
        await run(viewport);
      } catch (failure) {
        error = failure instanceof Error ? failure.message : String(failure);
      }
      const evidence = join(staging, viewport);
      if (existsSync(output)) renameSync(output, evidence);
      else mkdirSync(evidence);
      const metadata = join(evidence, "_cohorts", viewport);
      mkdirSync(metadata, { recursive: true });
      if (existsSync(join(evidence, ".last-run.json")))
        renameSync(
          join(evidence, ".last-run.json"),
          join(metadata, "playwright.json"),
        );
      if (existsSync(firestoreLog))
        renameSync(firestoreLog, join(metadata, "firestore-debug.log"));
      const result = {
        viewport,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: error ? "failed" : "passed",
        ...(error ? { error } : {}),
      };
      results.push(result);
      writeFileSync(
        join(metadata, "result.json"),
        JSON.stringify(result, null, 2) + "\n",
      );
      // Preserve a failed cohort and continue independent viewports; final status
      // still fails. An explicit interruption must never launch another cohort.
      if (shouldStop()) throw new Error("Story cohorts interrupted");
    }
  } finally {
    mkdirSync(output, { recursive: true });
    for (const { viewport } of results)
      mergeEvidence(join(staging, viewport), output);
  }
  if (results.some((result) => result.status === "failed"))
    throw new Error(
      `Story cohorts failed: ${results
        .filter((r) => r.status === "failed")
        .map((r) => r.viewport)
        .join(", ")}`,
    );
  return results;
}
