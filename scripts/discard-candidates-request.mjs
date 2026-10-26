import {cases} from './discard-candidates-case.mjs';
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
export const requestFile = ".github/recovery/pr77-discard-candidates-01.json";
export const branch = "refs/heads/investigate/pr77-discard-candidates";
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
    request.id !== "discard-candidates-20261026-01" ||
    request.case !== "discard-candidates" ||
    request.mode !== "generate" ||
    request.referenceTree !== "a7a4782123c9655a160e9f89025ac849a8fe83ae" ||
    request.featureReferenceTree !== "28753435f6f9c1c7ae66b522f0c3510d03601bbd" ||
    request.arrivalReferenceTree !== "668d7de7fd5316f28b73c9e8fa0ef41736199039" ||
    request.target !== "0701e49aeb60d1ccd556738a56a76c8864da9db2" ||
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
export function validateReferenceFiles() {
  if(process.env.CLUSTER_RENDER_TELEMETRY==='1')throw Error('Telemetry must be disabled for acceptance');
  const inventory=JSON.parse(readFileSync('docs/testing/pr76-approved-import/verified272.json','utf8'));
  if(inventory.length!==272||new Set(inventory.map(r=>r.path)).size!==272)throw Error('Complete272 reviewed references required');
  const counts=new Map();
  for(const row of inventory){
    if(!['phone','desktop','large','short'].includes(row.viewport)||!/^\d{3}-[a-z0-9-]+\.png$/.test(row.image)||row.path!==`tests/e2e/009-selected-history/screenshots/selected-history-consent/${row.viewport}/linux-arm64/${row.image}`)throw Error('Unexpected reference path');
    if(createHash('sha256').update(readFileSync(row.path)).digest('hex')!==row.sha256)throw Error('Reviewed PNG differs');
    counts.set(row.viewport,(counts.get(row.viewport)??0)+1);
  }
  for(const v of ['phone','desktop','large','short']){
    if(counts.get(v)!==68)throw Error('Exactly68 reviewed views per viewport required');
    const folder=`tests/e2e/009-selected-history/screenshots/selected-history-consent/${v}/linux-arm64`;
    const renderer=JSON.parse(readFileSync(folder+'/renderer.json','utf8'));
    const story=JSON.parse(readFileSync(`docs/testing/pr76-approved-import/${v}-story.json`,'utf8'));
    const review=JSON.parse(readFileSync(folder+'/review.json','utf8'));
    if(JSON.stringify(renderer)!==JSON.stringify(story.renderer)||JSON.stringify(review.renderer)!==JSON.stringify(renderer))throw Error('Actual reviewed renderer metadata required');
  }
  return {files:272,pngs:272,renderers:4};
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
  const delta=git('diff','--name-only',request.target,'HEAD','--','src','shared','functions','tests','package.json','bun.lock','playwright.stories.config.ts','vite.config.ts','docs/testing/pr76-approved-import/verified272.json');if(delta)throw Error('Target source/spec/runtime differs');
  const allowed=new Set(['scripts/discard-candidates-case.mjs','scripts/discard-candidates-run.mjs','scripts/discard-candidates-request.mjs','scripts/discard-candidates.test.mjs','scripts/ci-in-renderer.sh','nix/ci-renderer.sh','.github/workflows/recovery-discard-candidates.yml',requestFile]);
  for(const p of git('diff','--name-only',request.target,'HEAD','--','scripts','nix','.github').split('\n').filter(Boolean))if(!allowed.has(p))throw Error('Unapproved runner/workflow delta');
  if(git('rev-parse','HEAD:tests/e2e/009-selected-history/screenshots')!==request.featureReferenceTree)throw Error('Feature references differ');
  if(git('rev-parse','HEAD:tests/e2e/008-fleet-travel/screenshots')!==request.arrivalReferenceTree)throw Error('Inherited arrival references differ');
  validateReferenceFiles();
  result.arrivalReferenceTree=request.arrivalReferenceTree;result.referenceTree=request.referenceTree;result.featureReferenceTree=request.featureReferenceTree;result.specs=cases;
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
      `Bounded request ${result.requestId}\n\nSource ${parent}; executor ${head}; request SHA256 ${result.requestSha256}. Four independent allowlisted complete candidate journeys; candidate generation only; no reference promotion or whole-suite acceptance.\n`,
    );
  console.log(JSON.stringify(result));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
)
  main();
