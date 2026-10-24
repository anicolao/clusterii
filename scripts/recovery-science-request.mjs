import {
  readFileSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export const requestFile = ".github/recovery/science-resolved-heading-candidates.json";
export const branch = "refs/heads/investigate/jfr-export-load";
export function validateRequest({
  request,
  env,
  head,
  parent,
  changed,
  requestWasPresent,
}) {
  if (
    env.GITHUB_EVENT_NAME !== "push" ||
    env.GITHUB_REF !== branch ||
    env.GITHUB_REPOSITORY !== "anicolao/clusterii" ||
    env.GITHUB_RUN_ATTEMPT !== "1" ||
    env.GITHUB_SHA !== head
  )
    throw Error("Wrong event, repository, branch, attempt or checkout");
  if (
    request.version !== 1 ||
    request.id !== "science-resolved-heading-20261023-01" ||
    request.case !== "science-components-candidates" ||
    request.mode !== "generate" ||
    request.target !== "d8241411431450821074267a1cad2adbaf45c766" ||
    request.sourceCommit !== parent ||
    !/^[a-f0-9]{40}$/.test(parent)
  )
    throw Error("Request does not bind the approved case and source parent");
  if (requestWasPresent !== false)
    throw Error("Request must be newly created, not replayed or edited");
  if (
    !changed.includes(requestFile) ||
    changed.some((p) => ![requestFile, "PROMPT_WORK.md"].includes(p))
  )
    throw Error("Execution request must be isolated from code changes");
  return {
    requestId: request.id,
    sourceCommit: parent,
    executorCommit: head,
    case: request.case,
    mode: request.mode,
    target: request.target,
    runId: env.GITHUB_RUN_ID,
    attempt: 1,
  };
}
function main() {
  const git = (...a) =>
    execFileSync("git", a, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  const bytes = readFileSync(requestFile),
    request = JSON.parse(bytes),
    head = git("rev-parse", "HEAD"),
    parent = git("rev-parse", "HEAD^");
  let requestWasPresent = true;
  try {
    git("cat-file", "-e", `${parent}:${requestFile}`);
  } catch {
    requestWasPresent = false;
  }
  const result = validateRequest({
    requestWasPresent,
    request,
    env: process.env,
    head,
    parent,
    changed: git("diff", "--name-only", parent, head).split("\n"),
  });
  if (git("status", "--porcelain"))
    throw Error("Request checkout must be clean");
  result.requestSha256 = createHash("sha256").update(bytes).digest("hex");
  mkdirSync("ci-evidence/recovery-request", { recursive: true });
  writeFileSync("ci-evidence/recovery-request/request.json", bytes);
  writeFileSync(
    "ci-evidence/recovery-request/executor.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Bounded request ${result.requestId}\n\nSource ${parent}; executor ${head}; request SHA256 ${result.requestSha256}. One complete science component family across four sizes; this is not integrated acceptance.\n`,
    );
  console.log(JSON.stringify(result));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
)
  main();
