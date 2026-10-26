import {cases} from './normal-focus-candidates-case.mjs';
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
export const requestFile = ".github/recovery/pr70-normal-focus-candidates-01.json";
export const branch = "refs/heads/investigate/pr70-normal-focus-candidates";
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
    request.id !== "normal-focus-candidates-20261026-01" ||
    request.case !== "normal-focus-candidates" ||
    request.mode !== "generate" ||
    request.referenceTree !== "b672fb1c5bb8253151ba9e5715d46e243aadc2a1" ||
    request.featureReferenceTree !== "a094cba4acdf19e7c592bcde28c46dfad6ecc1f0" ||
    request.target !== "8b522244846dfd33a24beeaac54267f4c84de934" ||
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
  const mapping=JSON.parse(readFileSync('docs/testing/pr70-parent-preparation/REFERENCE_PATH_MAPPING.json','utf8'));
  if(mapping.length!==240||new Set(mapping.map(r=>r.new)).size!==240)throw Error('Complete inherited reference mapping required');
  let pngs=0;
  for(const row of mapping){
    if(!row.new.startsWith('tests/e2e/008-fleet-travel/screenshots/live-fleet-travel/')||row.new.split('/').includes('..'))throw Error('Unexpected reference path');
    const bytes=readFileSync(row.new);
    if(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')!==row.gitBlob)throw Error('Mapped reference bytes differ');
    if(row.new.endsWith('.png')){pngs++;const folder=row.new.slice(0,row.new.lastIndexOf('/'));JSON.parse(readFileSync(folder+'/renderer.json','utf8'));JSON.parse(readFileSync(folder+'/review.json','utf8'));}
  }
  if(pngs!==224)throw Error('Complete inherited PNG family required');
  return {files:240,pngs};
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
  const delta=git('diff','--name-only',request.target,'HEAD','--','src','shared','functions','tests','package.json','bun.lock','playwright.stories.config.ts','vite.config.ts','docs/testing/pr70-parent-preparation/REFERENCE_PATH_MAPPING.json');if(delta)throw Error('Target source/spec/runtime differs');
  const allowed=new Set(['scripts/normal-focus-candidates-case.mjs','scripts/normal-focus-candidates-run.mjs','scripts/normal-focus-candidates-request.mjs','scripts/normal-focus-candidates.test.mjs','scripts/ci-in-renderer.sh','nix/ci-renderer.sh','.github/workflows/recovery-normal-focus-candidates.yml',requestFile]);
  for(const p of git('diff','--name-only',request.target,'HEAD','--','scripts','nix','.github').split('\n').filter(Boolean))if(!allowed.has(p))throw Error('Unapproved runner/workflow delta');
  if(git('rev-parse','HEAD:tests/e2e/008-fleet-travel/screenshots')!==request.featureReferenceTree)throw Error('Feature references differ');
  validateReferenceFiles();
  result.referenceTree=request.referenceTree;result.featureReferenceTree=request.featureReferenceTree;result.specs=cases;
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
      `Bounded request ${result.requestId}\n\nSource ${parent}; executor ${head}; request SHA256 ${result.requestSha256}. One complete normal phone candidate journey; candidate generation only; no reference promotion or whole-suite acceptance.\n`,
    );
  console.log(JSON.stringify(result));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
)
  main();
