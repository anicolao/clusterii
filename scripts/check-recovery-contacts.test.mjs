import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import { validateRequest, branch, requestFile } from "./recovery-contacts-request.mjs";
const parent = "a".repeat(40),
  head = "b".repeat(40);
const fixture = () => ({
  request: {
    version: 1,
    id: "contacts-label-current-20261024-01",
    case: "feature012-contacts-candidates",
    mode: "generate",
    target: "d0804122e614b0b8c26351dee4593ec20cb6f731",
    sourceCommit: parent,
  },
  env: {
    GITHUB_EVENT_NAME: "push",
    GITHUB_REF: branch,
    GITHUB_REPOSITORY: "anicolao/clusterii",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: head,
    GITHUB_RUN_ID: "123",
  },
  head,
  parent,
  changed: [requestFile, "PROMPT_WORK.md"],
  requestWasPresent: false,
});
test("request binds one source/checkout/case and rejects reruns or code mixed with request", () => {
  assert.equal(validateRequest(fixture()).executorCommit, head);
  assert.throws(() =>
    validateRequest({ ...fixture(), requestWasPresent: true }),
  );
  for (const delta of [
    { GITHUB_EVENT_NAME: "workflow_dispatch" },
    { GITHUB_REF: "refs/heads/main" },
    { GITHUB_REPOSITORY: "foreign/repo" },
    { GITHUB_RUN_ATTEMPT: "2" },
    { GITHUB_SHA: parent },
  ]) {
    const f = fixture();
    Object.assign(f.env, delta);
    assert.throws(() => validateRequest(f));
  }
  for (const delta of [
    { sourceCommit: head },
    { mode: "verify" },
    { case: "all" },
    { id: "second-request" },
  ]) {
    const f = fixture();
    Object.assign(f.request, delta);
    assert.throws(() => validateRequest(f));
  }
  for (const changed of [
    ["PROMPTS.md"],
    [requestFile, "src/routes/+page.svelte"],
    [requestFile, ".github/workflows/recovery-contacts.yml"],
  ])
    assert.throws(() => validateRequest({ ...fixture(), changed }));
});
test("parsed workflow is branch-and-request-only, least privilege and failure-retaining", () => {
  const w = parse(
    readFileSync(".github/workflows/recovery-contacts.yml", "utf8"),
  );
  assert.deepEqual(w.on, {
    push: { branches: ["investigate/jfr-export-load"], paths: [requestFile] },
  });
  assert.deepEqual(w.permissions, { contents: "read" });
  assert.equal(w.concurrency["cancel-in-progress"], false);
  assert.deepEqual(Object.keys(w.jobs), ["feature012-contacts-candidates"]);
  const j = w.jobs["feature012-contacts-candidates"];
  assert.equal(j["runs-on"], "ubuntu-24.04-arm");
  assert.equal(j["timeout-minutes"], 20);
  assert.equal(
    j.defaults.run.shell,
    "nix develop path:./nix --accept-flake-config --command bash -e {0}",
  );
  assert.deepEqual(
    j.steps.filter((s) => s.run).map((s) => s.run),
    [
      "node scripts/recovery-contacts-request.mjs",
      "nix run path:./nix#ci-renderer -- recovery feature012-contacts-candidates",
    ],
  );
  assert.equal(j.steps[0].with["persist-credentials"], false);
  assert.equal(
    j.steps.find((s) => s.name === "One complete contact family")[
      "timeout-minutes"
    ],
    15,
  );
  const upload = j.steps.at(-1);
  assert.equal(upload.if, "always()");
  assert.equal(upload.with["if-no-files-found"], "error");
  assert.doesNotMatch(upload.with.path, /database-debug/);
  assert.match(upload.with.path, /ci-evidence\/recovery-\*\//);
  assert.doesNotMatch(
    JSON.stringify(w),
    /secrets\.|deploy|workflow_dispatch|pull_request|test:stories|generate|update-snapshots/,
  );
  // Evaluate the exact filter, proving later docs/code-only pushes cannot repeat it.
  const fires = (ref, paths) =>
    w.on.push.branches.includes(ref) &&
    paths.some((p) => w.on.push.paths.includes(p));
  assert.equal(fires("investigate/jfr-export-load", [requestFile]), true);
  for (const paths of [
    ["PROMPTS.md"],
    ["docs/testing/result.md"],
    ["scripts/recovery-settlement.mjs"],
  ])
    assert.equal(fires("investigate/jfr-export-load", paths), false);
  assert.equal(fires("main", [requestFile]), false);
});

test("actual request CLI records exact checkout and refuses a second attempt", () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-request-fixture-"));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    git("init", "-q");
    git("config", "user.name", "Recovery fixture");
    git("config", "user.email", "fixture@example.invalid");
    copyFileSync(
      resolve("scripts/recovery-contacts-request.mjs"),
      join(dir, "request.mjs"),
    );
    writeFileSync(join(dir, ".gitignore"), "ci-evidence/\n");
    git("add", ".");
    git("commit", "-qm", "source");
    const source = git("rev-parse", "HEAD"),
      f = fixture();
    f.request.sourceCommit = source;
    mkdirSync(join(dir, ".github/recovery"), { recursive: true });
    writeFileSync(join(dir, requestFile), JSON.stringify(f.request));
    git("add", ".");
    git("commit", "-qm", "request");
    const executor = git("rev-parse", "HEAD"),
      env = { ...process.env, ...f.env, GITHUB_SHA: executor };
    delete env.GITHUB_STEP_SUMMARY;
    const output = JSON.parse(
      execFileSync(process.execPath, [join(dir, "request.mjs")], {
        cwd: dir,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
    assert.equal(output.sourceCommit, source);
    assert.equal(output.executorCommit, executor);
    assert.match(output.requestSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(
      JSON.parse(
        readFileSync(
          join(dir, "ci-evidence/recovery-request/executor.json"),
          "utf8",
        ),
      ),
      output,
    );
    assert.throws(() =>
      execFileSync(process.execPath, [join(dir, "request.mjs")], {
        cwd: dir,
        env: { ...env, GITHUB_RUN_ATTEMPT: "2" },
        stdio: "pipe",
      }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


import {candidateCase,validateComplete,executeCandidates,prepareCandidates,specHash,feature,projects} from './recovery-contacts.mjs';
import {createHash} from 'node:crypto';
test('exact complete four-size contact family without filters or fallback',()=>{assert.equal(createHash('sha256').update(readFileSync(feature)).digest('hex'),specHash);assert.deepEqual(candidateCase(['feature012-contacts-candidates']),['x','playwright','test','--config','playwright.stories.config.ts',feature,...projects.map(p=>'--project='+p),'--max-failures=1','--retries=0','--update-snapshots=none']);for(const a of [[],['all'],['feature012-contacts-candidates','--grep=contacts']])assert.throws(()=>candidateCase(a));});
const complete=()=>({commit:head,records:projects.map(project=>({pngs:24,failed:false,manifest:{project,status:'passed',mode:'generate',platform:'linux-arm64',source:{commit:head,dirty:false,spec:feature,specSha256:specHash}}}))});
test('all96 images, projects and clean source required',()=>{assert.equal(validateComplete(complete()).images,96);for(const mutate of [f=>f.records.pop(),f=>f.records[1]=f.records[0],f=>f.records[0].pngs=21,f=>f.records[0].pngs=22,f=>f.records[0].failed=true,f=>f.records[0].manifest.source.dirty=true,f=>f.records[0].manifest.platform='darwin-arm64',f=>f.commit=parent]){const f=complete();mutate(f);assert.throws(()=>validateComplete(f));}});
test('serial sync/build/emulators preserves setup failures and actual service command',async()=>{for(const fail of [-1,0,1,2]){const calls=[];const code=await prepareCandidates(async(a)=>{calls.push(a);return calls.length-1===fail?9:0;},{});assert.equal(code,fail<0?0:9);assert.equal(calls.length,fail<0?3:fail+1);assert.deepEqual(calls[0],['x','svelte-kit','sync']);if(calls.length>1)assert.deepEqual(calls[1],['run','--cwd','functions','build']);if(calls.length>2)assert.deepEqual(calls[2],['x','firebase','emulators:exec','--project','demo-clusterii','--only','auth,database,firestore,functions','node scripts/recovery-contacts.mjs inside-feature012-contacts-candidates']);}});
test('test failure preserved, partial evidence rejected, no retry',async()=>{for(const code of [0,7]){let calls=0,seen=false,result;const exit=await executeCandidates({run:async a=>{calls++;assert.deepEqual(a,candidateCase(['feature012-contacts-candidates']));return code;},inspect:async()=>{seen=true;return validateComplete(complete());},record:r=>result=r});assert.equal(exit,code);assert.equal(calls,1);assert.equal(seen,code===0);assert.equal(result.testExit,code);}assert.equal(await executeCandidates({run:async()=>0,inspect:async()=>{throw Error('partial')},record:()=>{}}),2);});
