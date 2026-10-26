import {cases} from './overdue-route-strict-case.mjs';
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
export const requestFile = ".github/recovery/pr68-overdue-route-strict-01.json";
export const branch = "refs/heads/investigate/pr68-overdue-route-strict";
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
    request.id !== "overdue-route-strict-20261025-01" ||
    request.case !== "overdue-route-strict" ||
    request.mode !== "verify" ||
    request.referenceTree !== "9541bf24b2b770cc8fd3459c515f30f8276bc262" ||
    request.target !== "122245b2db1a3718cb4b55eff0cdbe2a56dd72b7" ||
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
export function referencePreflight() {
 const rows=JSON.parse(readFileSync('docs/testing/pr68-overdue-acknowledgement/approved/verified160.json','utf8'));
 if(rows.length!==160||new Set(rows.map(r=>r.path)).size!==160)throw Error('Exactly160 reviewed references required');
 for(const v of ['phone','desktop','large','short']) {
  const folder='tests/browser/story-baselines/interrupted-fleet-route/'+v+'/linux-arm64/';
  const group=rows.filter(r=>r.viewport===v);if(group.length!==40)throw Error('Forty references per viewport required');
  const renderer=JSON.parse(readFileSync(folder+'renderer.json','utf8'));
  const review=JSON.parse(readFileSync(folder+'review.json','utf8'));
  if(JSON.stringify(renderer)!==JSON.stringify(review.renderer))throw Error('Renderer differs from approved generation');
  for(const r of group){if(!r.path.startsWith(folder)||r.path.split('/').includes('..'))throw Error('Unexpected reference');if(createHash('sha256').update(readFileSync(r.path)).digest('hex')!==r.sha256)throw Error('Reviewed image differs');}
 }
 return {pngs:160};
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
  for (const c of Object.values(cases)) if(createHash('sha256').update(readFileSync(c.file)).digest('hex')!==c.sha)throw Error('Spec differs from approved selection');
  if(git('rev-parse','HEAD:tests/browser/story-baselines')!==request.referenceTree)throw Error('Reference tree differs');
  const delta=git('diff','--name-only',request.target,'HEAD','--','src','shared','functions','tests','package.json','bun.lock','playwright.stories.config.ts');if(delta)throw Error('Target source/spec/runtime differs');
  const allowed=new Set(['scripts/overdue-route-strict-case.mjs','scripts/overdue-route-strict-run.mjs','scripts/overdue-route-strict-request.mjs','scripts/overdue-route-strict.test.mjs','scripts/ci-in-renderer.sh','nix/ci-renderer.sh','.github/workflows/recovery-overdue-route-strict.yml',requestFile]);
  for(const p of git('diff','--name-only',request.target,'HEAD','--','scripts','nix','.github').split('\n').filter(Boolean))if(!allowed.has(p))throw Error('Unapproved runner/workflow delta');
  referencePreflight();
  result.referenceTree=request.referenceTree;result.specs=cases;
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
      `Bounded request ${result.requestId}\n\nSource ${parent}; executor ${head}; request SHA256 ${result.requestSha256}. Four complete viewport journeys; complete strict verification; no reference writes.\n`,
    );
  console.log(JSON.stringify(result));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
)
  main();
