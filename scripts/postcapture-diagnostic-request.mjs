import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const base='058c3a6ce6449fc1f7d9a731bcb5da2b64727781';
const request=JSON.parse(readFileSync('.github/recovery/pr70-postcapture-diagnostic-01.json','utf8'));
if(process.env.GITHUB_RUN_ATTEMPT!=='1'||request.target!==base||request.source!==git('rev-parse','HEAD^'))throw Error('Immutable first-attempt request required');
if(git('status','--porcelain'))throw Error('Clean request checkout required');
const changed=git('diff','--name-only','HEAD^','HEAD').split('\n');
if(changed.some(p=>!['.github/recovery/pr70-postcapture-diagnostic-01.json','PROMPT_WORK.md'].includes(p)))throw Error('Request child changes executable input');
for(const p of ['src','functions','shared','vite.config.ts','playwright.stories.config.ts','nix/flake.nix','nix/flake.lock','package.json','bun.lock'])if(git('diff',base,'HEAD','--',p))throw Error('Diagnostic changed product, stories, references or renderer: '+p);
const helper='tests/e2e/helpers/test-step-helper.ts';
const testDelta=git('diff','--name-only',base,'HEAD','--','tests').split('\n').filter(Boolean);
if(testDelta.length!==1||testDelta[0]!==helper||createHash('sha256').update(readFileSync(helper)).digest('hex')!=='7ea1406a6dbfdbaf34d4e1a09ba9f740f7db87a018796224aa492e8f3d5c8d01')throw Error('Only exact post-capture telemetry helper permitted');
if(process.env.GITHUB_EVENT_NAME!=='push'||process.env.GITHUB_REF!=='refs/heads/investigate/pr70-postcapture-diagnostic'||process.env.GITHUB_REPOSITORY!=='anicolao/clusterii'||process.env.GITHUB_SHA!==git('rev-parse','HEAD'))throw Error('Wrong execution context');

let existed=true;try{git('cat-file','-e',request.source+':.github/recovery/pr70-postcapture-diagnostic-01.json')}catch{existed=false}
if(existed||!changed.includes('.github/recovery/pr70-postcapture-diagnostic-01.json'))throw Error('Fresh request required');
mkdirSync('ci-evidence/recovery-request',{recursive:true});
writeFileSync('ci-evidence/recovery-request/binding.json',JSON.stringify({...request,executor:git('rev-parse','HEAD'),run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,diagnosticOnly:true},null,2)+'\n');

