import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const request = JSON.parse(readFileSync(".github/recovery/pr78-route-strict-01.json", "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
git("merge-base", "--is-ancestor", request.sourceCommit, "HEAD");
const allowed = new Set([".github/recovery/pr78-route-strict-01.json", ".github/workflows/route-strict.yml", "scripts/route-strict-request.mjs", "nix/ci-renderer.sh", "PROMPT_WORK.md"]);
for (const path of git("diff", "--name-only", request.sourceCommit, "HEAD").trim().split("\n")) {
  if (!allowed.has(path)) throw new Error(`Unexpected source change: ${path}`);
}
if (process.env.CLUSTER_STORY_FILTER !== request.filter) throw new Error("Story filter differs");
const before = git("show", `${request.sourceCommit}:nix/ci-renderer.sh`);
const after = readFileSync("nix/ci-renderer.sh", "utf8");
if (after !== before.replace("--env CLUSTER_PINNED_RENDERER --env CLUSTER_STORY_COHORTS", "--env CLUSTER_PINNED_RENDERER --env CLUSTER_STORY_COHORTS --env CLUSTER_STORY_FILTER")) throw new Error("Renderer changed beyond filter forwarding");
mkdirSync("ci-evidence/route-strict", { recursive: true });
writeFileSync("ci-evidence/route-strict/request.json", JSON.stringify({ ...request, head: git("rev-parse", "HEAD").trim(), verified: true }, null, 2));
