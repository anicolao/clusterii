// Read-only recovery inventory. Eligibility is stricter than visual approval.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
const target = "0f09db62776368702fc4df7d7a73aeeb39d98be8";
const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = git("ls-tree", "-r", "--name-only", target).trim().split("\n");
const tracked = new Set(paths);
const failures = JSON.parse(
  readFileSync(
    "docs/testing/recovery-reset-20261023/137-first-failures.json",
    "utf8",
  ),
);
const references = failures.rows.map((r) => ({
  viewport: r.viewport,
  story: r.story,
  previousCategory: r.category,
  path: r.reference?.path ?? null,
  pngPresent: r.reference ? tracked.has(r.reference.path) : null,
  rendererPresent: r.reference
    ? tracked.has(join(dirname(r.reference.path), "renderer.json"))
    : null,
  currentExecution: "not-observed",
  laterBehavior: "not-certified",
}));
const roots = [
  "tests",
  "docs/testing",
  ...readdirSync("/tmp", { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        /^cluster/.test(e.name) &&
        /(candidate|linux|qualified|final|corrected)/.test(e.name),
    )
    .map((e) => join("/tmp", e.name)),
];
function* walk(root) {
  for (const e of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name === "story.json") yield p;
  }
}
const changes = new Map();
const relevant = [
  "src",
  "shared",
  "functions/src",
  "static",
  "package.json",
  "bun.lock",
  "functions/package.json",
  "functions/bun.lock",
  "svelte.config.js",
  "vite.config.ts",
  "playwright.stories.config.ts",
  "tests/browser/helpers.ts",
  "tests/browser/story-helpers",
  "tests/e2e/helpers",
];
function changed(commit) {
  if (!changes.has(commit)) {
    try {
      changes.set(
        commit,
        git("diff", "--name-only", commit, target, "--", ...relevant)
          .trim()
          .split("\n")
          .filter(Boolean),
      );
    } catch {
      changes.set(commit, null);
    }
  }
  return changes.get(commit);
}
const candidates = [];
for (const root of roots)
  for (const file of walk(root)) {
    let s;
    try {
      s = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!s.source || !s.id || !s.platform) continue;
    const reasons = [];
    if (s.mode !== "generate") reasons.push("not-generation");
    if (s.status !== "passed") reasons.push("not-passed");
    if (s.source.dirty !== false) reasons.push("dirty-or-unrecorded-source");
    let specMatch = false;
    try {
      specMatch =
        sha(
          execFileSync("git", ["show", `${target}:${s.source.spec}`], {
            maxBuffer: 8 * 1024 * 1024,
            stdio: ["ignore", "pipe", "pipe"],
          }),
        ) === s.source.specSha256;
    } catch {}
    if (!specMatch) reasons.push("spec-differs-or-missing");
    const sourceChanges = changed(s.source.commit);
    if (sourceChanges === null) reasons.push("source-unavailable");
    else if (sourceChanges.length)
      reasons.push("production-or-shared-inputs-changed-needs-review");
    const images = (s.steps ?? []).flatMap((step) =>
      (step.views ?? []).map((v) => v.image),
    );
    if (
      !images.length ||
      images.some((image) => !existsSync(join(dirname(file), image)))
    )
      reasons.push("incomplete-originals");
    if (!existsSync(join(dirname(file), "renderer.json")))
      reasons.push("missing-renderer");
    if (s.platform !== "linux-arm64") reasons.push("not-linux-arm64");
    // Do not infer compatibility from a platform string: compare complete renderer record.
    const rendererFile = join(dirname(file), "renderer.json");
    let rendererMatch = false;
    if (existsSync(rendererFile)) {
      try {
        rendererMatch =
          JSON.stringify(JSON.parse(readFileSync(rendererFile, "utf8"))) ===
          JSON.stringify(s.renderer);
      } catch {}
    }
    if (!rendererMatch) reasons.push("renderer-record-differs");
    candidates.push({
      file: resolve(file),
      family: s.id,
      viewport: s.project,
      platform: s.platform,
      source: s.source,
      specMatch,
      mode: s.mode,
      status: s.status,
      images: images.length,
      changedInputs: sourceChanges,
      renderer: s.renderer,
      eligibleForLinuxReview: reasons.length === 0,
      reasons,
    });
  }
const baselineFamilies = {};
for (const path of paths.filter(
  (p) =>
    p.endsWith("/renderer.json") &&
    (p.includes("/story-baselines/") || p.includes("/screenshots/")),
)) {
  const parts = path.split("/"),
    platform = parts.at(-2),
    viewport = parts.at(-3),
    family = parts.at(-4);
  const entry = (baselineFamilies[family] ??= {});
  (entry[platform] ??= []).push(viewport);
}
const result = {
  target,
  inventorySource: git("rev-parse", "HEAD").trim(),
  scope:
    "Existing classified first failures plus tracked baseline families and retained local story manifests. No execution, image approval, or inferred transitive component equivalence.",
  references,
  baselineFamilies,
  candidates,
  summary: {
    firstFailureReferences: references.length,
    stillAbsent: references.filter((r) => r.path && !r.pngPresent).length,
    retainedManifests: candidates.length,
    eligibleForLinuxReview: candidates.filter((c) => c.eligibleForLinuxReview)
      .length,
  },
};
writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.summary));
