import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
const {
  GITHUB_REPOSITORY: repo,
  SOURCE_SHA: sha,
  PR_NUMBER: pr = "",
  GITHUB_RUN_ID: run,
} = process.env;
if (!repo || !/^[a-f0-9]{40}$/.test(sha ?? "") || (pr && !/^\d+$/.test(pr)))
  throw new Error("Invalid publication identity");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const latest = JSON.parse(
  execFileSync(
    "gh",
    ["api", pr ? `repos/${repo}/pulls/${pr}` : `repos/${repo}/commits/main`],
    { encoding: "utf8" },
  ),
);
if ((pr ? latest.head.sha : latest.sha) !== sha) {
  console.log("Superseded build; nothing published.");
  process.exit(0);
}
writeFileSync(
  "build/revision.json",
  JSON.stringify(
    {
      sourceSha: sha,
      buildSourceSha: git("rev-parse", "HEAD"),
      workflow: `https://github.com/${repo}/actions/runs/${run}`,
      publishedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
const root = ".pages-publish";
rmSync(root, { recursive: true, force: true });
if (git("ls-remote", "--heads", "origin", "gh-pages")) {
  git("fetch", "origin", "gh-pages");
  git("worktree", "add", "--detach", root, "origin/gh-pages");
} else {
  git("worktree", "add", "--detach", root, "HEAD");
  git("-C", root, "switch", "--orphan", "gh-pages");
}
const destination = pr ? join(root, `pr${pr}`) : root;
mkdirSync(destination, { recursive: true });
for (const name of readdirSync(destination)) {
  if (name === ".git" || (!pr && /^pr\d+$/.test(name))) continue;
  rmSync(join(destination, name), { recursive: true, force: true });
}
cpSync("build", destination, { recursive: true });
writeFileSync(join(root, ".nojekyll"), "");
git("-C", root, "config", "user.name", "github-actions[bot]");
git(
  "-C",
  root,
  "config",
  "user.email",
  "41898282+github-actions[bot]@users.noreply.github.com",
);
git("-C", root, "add", ".");
if (git("-C", root, "status", "--porcelain")) {
  git(
    "-C",
    root,
    "commit",
    "-m",
    `Publish ${pr ? `pr${pr}` : "main"} at ${sha}`,
  );
  git("-C", root, "push", "origin", "HEAD:gh-pages");
}
