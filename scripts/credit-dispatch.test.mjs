import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const outer = readFileSync(new URL('../nix/ci-renderer.sh', import.meta.url), 'utf8').match(/case [\s\S]*?\nesac/)[0];
const inner = readFileSync(new URL('./ci-in-renderer.sh', import.meta.url), 'utf8').match(/case [\s\S]*?\nesac/)[0];
const run = (code,args) => spawnSync('bash',['-eu','-c', 'node() { printf "NODE:%s\n" "$*"; }; bun() { printf "BUN:%s\n" "$*"; }; '+code,'dispatch',...args],{encoding:'utf8'});
test('actual outer launcher dispatch accepts only the exact bounded credit route',()=>{
 assert.equal(run(outer,['recovery','credit']).status,0);
 for(const args of [[],['recovery'],['recovery','all'],['recovery','credit','extra'],['arbitrary']]) assert.equal(run(outer,args).status,2);
 for(const args of [['stories','verify'],['stories','generate'],['application']]) assert.equal(run(outer,args).status,0);
});
test('actual inner dispatch reaches only the bounded candidate entry and rejects unsupported recovery arguments',()=>{
 const result=run(inner,['recovery','credit']);assert.equal(result.status,0);assert.equal(result.stdout,'NODE:scripts/credit-candidates.mjs\n');
 for(const args of [['recovery'],['recovery','all'],['recovery','credit','extra'],['arbitrary']]) {const result=run(inner,args);assert.equal(result.status,2);assert.equal(result.stdout,'');}
});

test('complete outer script admits credit to runner preflight without starting infrastructure',()=>{
 const env={...process.env};delete env.RUNNER_TEMP;
 for(const key of ['containerd','rootShell','engine','imageArchive','imageTag','imageConfig','imageDigest','nixCommand']) env[key]='unused-fixture';
 const result=spawnSync('bash',['nix/ci-renderer.sh','recovery','credit'],{encoding:'utf8',env});
 assert.equal(result.status,1);assert.match(result.stderr,/GitHub runner scratch directory required/);assert.doesNotMatch(result.stderr,/Usage:/);
});
