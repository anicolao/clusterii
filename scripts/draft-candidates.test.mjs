import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {selection,assertListing,viewports} from './draft-candidates-case.mjs';
import {validateRequest,validateReferenceFiles,requestFile,branch} from './draft-candidates-request.mjs';
const parent='a'.repeat(40),head='b'.repeat(40);
const valid=()=>({request:{version:1,id:'draft-candidates-20261026-01',case:'draft-candidates',mode:'generate',target:'4a8264453ad62788c454fe3f2b8e20829e3c804f',sourceCommit:parent,arrivalReferenceTree:"d3b62c90b9cc37d7f29f8396b1832349f6a19d42",featureReferenceTree:'6de45f638d9990d25f4c4a65cdd89e403290f342',referenceTree:'a7a4782123c9655a160e9f89025ac849a8fe83ae'},env:{GITHUB_EVENT_NAME:'push',GITHUB_REF:branch,GITHUB_REPOSITORY:'anicolao/clusterii',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:head},head,parent,changed:[requestFile,'PROMPT_WORK.md'],requestWasPresent:false});
test('fresh exact request accepted; wrong/replayed/broadened requests rejected',()=>{
 assert.equal(validateRequest(valid()).mode,'generate');
 for(const mutate of [x=>x.request.mode='verify',x=>x.request.case='all',x=>x.request.referenceTree='0'.repeat(40),x=>x.request.featureReferenceTree='0'.repeat(40),x=>x.request.arrivalReferenceTree='0'.repeat(40),x=>x.request.target='0'.repeat(40),x=>x.request.sourceCommit=head,x=>x.requestWasPresent=true,x=>x.changed.push('src/x'),x=>x.env.GITHUB_RUN_ATTEMPT='2',x=>x.env.GITHUB_REPOSITORY='elsewhere/repo',x=>x.env.GITHUB_REF='refs/heads/main',x=>x.env.GITHUB_EVENT_NAME='pull_request',x=>x.env.GITHUB_SHA=parent]){const x=valid();mutate(x);assert.throws(()=>validateRequest(x));}
});
test('exact four selections only, no empty or wrong collected test',()=>{
 for(const family of ['draft'])for(const viewport of viewports){const c=selection([family,viewport]);const row=`  [${viewport}] › ${c.file.split('/').at(-1)}:1:1 › ${c.title}`;assertListing(`Listing tests:\n${row}\nTotal: 1 test in 1 file`,c);assert.ok(c.args.includes('--update-snapshots=none'));assert.ok(c.args.includes('--max-failures=1'));const grep=new RegExp(c.args[c.args.indexOf('--grep')+1]);assert.ok(grep.test(viewport+' '+c.file.split('/').at(-1)+' '+c.title));assert.ok(!grep.test(viewport+' '+c.file+' another test'));assert.ok(!grep.test(c.title+' extra')); for(const bad of ['',row+'\nTotal: 0 tests in 0 files',row+'\n'+row+'\nTotal: 1 test in 1 file',row.replace(c.title,'another test')+'\nTotal: 1 test in 1 file',row.replace('['+viewport+']','[wrong]')+'\nTotal: 1 test in 1 file'])assert.throws(()=>assertListing(bad,c));}
 for(const args of [[],['start'],['all','phone'],['start','all'],['draft','phone','--update-snapshots']])assert.throws(()=>selection(args));
});
const outer=readFileSync('nix/ci-renderer.sh','utf8').match(/case [\s\S]*?\nesac/)[0],inner=readFileSync('scripts/ci-in-renderer.sh','utf8').match(/case [\s\S]*?\nesac/)[0];
const run=(code,args)=>spawnSync('bash',['-eu','-c','node(){ printf "NODE:%s\\n" "$*"; }; bun(){ :; }; '+code,'dispatch',...args],{encoding:'utf8'});
test('both actual dispatch layers accept exactly four cases and reject wrong or empty args',()=>{
 for(const f of ['draft'])for(const v of viewports){const args=['recovery','draft-candidates',f,v];assert.equal(run(outer,args).status,0);const r=run(inner,args);assert.equal(r.status,0);assert.equal(r.stdout,`NODE:scripts/draft-candidates-run.mjs ${f} ${v}\n`);}
 for(const args of [[],['recovery'],['recovery','draft-candidates'],['recovery','draft-candidates','all','phone'],['recovery','draft-candidates','draft','phone','extra'],['recovery','draft-candidates','start','bogus'],['recovery','generate','route','phone']])for(const layer of [outer,inner])assert.notEqual(run(layer,args).status,0);
 for(const args of [['stories','verify'],['stories','generate'],['application']])assert.equal(run(outer,args).status,0);
});
test('full outer script accepts scoped route only up to required runner preflight',()=>{
 const env={...process.env};delete env.RUNNER_TEMP;for(const k of ['containerd','rootShell','engine','imageArchive','imageTag','imageConfig','imageDigest','nixCommand'])env[k]='unused-fixture';const r=spawnSync('bash',['nix/ci-renderer.sh','recovery','draft-candidates','draft','phone'],{env,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/GitHub runner scratch directory required/);
});

test('all inherited feature references and renderer siblings are present with exact Git blobs',()=>{assert.deepEqual(validateReferenceFiles(),{files:100,pngs:100,renderers:4});});
