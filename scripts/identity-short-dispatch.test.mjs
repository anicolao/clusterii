import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const outer = readFileSync(new URL('../nix/ci-renderer.sh', import.meta.url), 'utf8').match(/case [\s\S]*?\nesac/)[0];
const inner = readFileSync(new URL('./ci-in-renderer.sh', import.meta.url), 'utf8').match(/case [\s\S]*?\nesac/)[0];
const run = (code,args) => spawnSync('bash',['-eu','-c', 'node() { printf "NODE:%s\n" "$*"; }; bun() { printf "BUN:%s\n" "$*"; }; '+code,'dispatch',...args],{encoding:'utf8'});
test('actual outer launcher dispatch accepts only the exact bounded identity-short route',()=>{
 assert.equal(run(outer,['recovery','identity-short']).status,0);
 for(const args of [[],['recovery'],['recovery','all'],['recovery','identity-short','extra'],['arbitrary']]) assert.equal(run(outer,args).status,2);
 for(const args of [['stories','verify'],['stories','generate'],['application']]) assert.equal(run(outer,args).status,0);
});
test('actual inner dispatch reaches only the bounded candidate entry and rejects unsupported recovery arguments',()=>{
 const result=run(inner,['recovery','identity-short']);assert.equal(result.status,0);assert.equal(result.stdout,'NODE:scripts/identity-short-candidates.mjs\n');
 for(const args of [['recovery'],['recovery','all'],['recovery','identity-short','extra'],['arbitrary']]) {const result=run(inner,args);assert.equal(result.status,2);assert.equal(result.stdout,'');}
});

test('complete outer script admits identity-short to runner preflight without starting infrastructure',()=>{
 const env={...process.env};delete env.RUNNER_TEMP;
 for(const key of ['containerd','rootShell','engine','imageArchive','imageTag','imageConfig','imageDigest','nixCommand']) env[key]='unused-fixture';
 const result=spawnSync('bash',['nix/ci-renderer.sh','recovery','identity-short'],{encoding:'utf8',env});
 assert.equal(result.status,1);assert.match(result.stderr,/GitHub runner scratch directory required/);assert.doesNotMatch(result.stderr,/Usage:/);
});

import { validateRequest, branch, requestFile } from './identity-short-request.mjs';
test('request binds fresh exact source, branch, attempt and isolated request commit',()=>{
 const parent='a'.repeat(40),head='b'.repeat(40);
 const input={request:{version:1,id:'identity-layer-20261025-01',case:'identity-short',mode:'generate',target:'fa4144360fd9152f180df50659a50c4bf214aeba',sourceCommit:parent},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},head,parent,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false};
 assert.equal(validateRequest(input).sourceCommit,parent);
 for(const patch of [{requestWasPresent:true},{changed:[requestFile,'src/routes/app.css']},{request:{...input.request,sourceCommit:head}},{env:{...input.env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...input.env,GITHUB_REF:'refs/heads/feat/live-sharing-stories'}}]) assert.throws(()=>validateRequest({...input,...patch}));
});
