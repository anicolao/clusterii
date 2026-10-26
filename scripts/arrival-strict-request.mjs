import {cases} from './arrival-strict-case.mjs';
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
export const requestFile = ".github/recovery/pr70-arrival-strict-01.json";
export const branch = "refs/heads/investigate/pr70-arrival-strict";
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
    request.id !== "arrival-strict-20261026-01" ||
    request.case !== "arrival-strict" ||
    request.mode !== "verify" ||
    request.referenceTree !== "b672fb1c5bb8253151ba9e5715d46e243aadc2a1" ||
    request.featureReferenceTree !== "d3b62c90b9cc37d7f29f8396b1832349f6a19d42" ||
    request.target !== "a28bb2f168cc2807c022ef8c5eaad9fe2362ed46" ||
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
  const rows=JSON.parse(readFileSync('docs/testing/pr70-approved-import/verified160.json','utf8'));
  if(rows.length!==160||new Set(rows.map(r=>r.path)).size!==160)throw Error('Complete160 distinct references required');
  for(const viewport of ['phone','desktop','large','short']) {
    const group=rows.filter(r=>r.viewport===viewport);
    if(group.length!==40)throw Error('Exactly40 images per viewport required');
    const folder='tests/e2e/008-fleet-travel/screenshots/live-fleet-travel/'+viewport+'/linux-arm64/';
    const provenance=JSON.parse(readFileSync('docs/testing/pr70-approved-import/'+viewport+'-generation-source.json','utf8'));
    if(JSON.stringify(JSON.parse(readFileSync(folder+'renderer.json','utf8')))!==JSON.stringify(provenance.renderer))throw Error('Renderer differs from retained generation');
    for(const row of group) {
      if(!row.path.startsWith(folder)||row.path.split('/').includes('..')||!row.path.endsWith('.png'))throw Error('Unexpected reference path');
      if(createHash('sha256').update(readFileSync(row.path)).digest('hex')!==row.sha256)throw Error('Reviewed reference bytes differ');
    }
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
  const delta=git('diff','--name-only',request.target,'HEAD','--','src','shared','functions','tests','package.json','bun.lock','playwright.stories.config.ts','vite.config.ts','docs/testing/pr70-parent-preparation/REFERENCE_PATH_MAPPING.json');if(delta)throw Error('Target source/spec/runtime differs');
  const allowed=new Set(['scripts/arrival-strict-case.mjs','scripts/arrival-strict-run.mjs','scripts/arrival-strict-request.mjs','scripts/arrival-strict.test.mjs','scripts/ci-in-renderer.sh','nix/ci-renderer.sh','.github/workflows/recovery-arrival-strict.yml',requestFile]);
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
      `Bounded request ${result.requestId}\n\nSource ${parent}; executor ${head}; request SHA256 ${result.requestSha256}. Four complete viewport journeys; strict comparison of160 reviewed images; no updates or whole-suite acceptance.\n`,
    );
  console.log(JSON.stringify(result));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
)
  main();
