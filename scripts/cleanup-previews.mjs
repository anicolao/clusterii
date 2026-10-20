import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error("Repository required");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
git("fetch", "origin", "gh-pages");
git("worktree", "add", "--detach", ".pages-publish", "origin/gh-pages");
for (const name of readdirSync(".pages-publish")) {
  if (!/^pr\d+$/.test(name)) continue;
  const pr = JSON.parse(
    execFileSync("gh", ["api", `repos/${repo}/pulls/${name.slice(2)}`], {
      encoding: "utf8",
    }),
  );
  if (
    pr.state === "closed" &&
    pr.closed_at &&
    Date.now() - Date.parse(pr.closed_at) > 30 * 86400000
  )
    rmSync(`.pages-publish/${name}`, { recursive: true });
}
git("-C", ".pages-publish", "config", "user.name", "github-actions[bot]");
git(
  "-C",
  ".pages-publish",
  "config",
  "user.email",
  "41898282+github-actions[bot]@users.noreply.github.com",
);
git("-C", ".pages-publish", "add", ".");
if (git("-C", ".pages-publish", "status", "--porcelain")) {
  git(
    "-C",
    ".pages-publish",
    "commit",
    "-m",
    "Remove previews closed more than thirty days ago",
  );
  git("-C", ".pages-publish", "push", "origin", "HEAD:gh-pages");
}
