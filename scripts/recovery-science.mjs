import { execFileSync } from 'node:child_process';
import { existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createConnection } from 'node:net';
import { runtimeGuard,pinned,childExit } from './recovery-settlement.mjs';
export const feature='tests/e2e/003-science/components.spec.ts';
export const specHash='886cefc982dd9f99f8d05c9cc9dae343b41e11b91a33dd71d481c9958fe78be6';
export const projects=['phone','desktop','large','short'];
export function scienceCase(args){
 if(args.length!==1||args[0]!=='science-components-candidates')throw Error('Only complete science component family allowed');
 return ['x','playwright','test','--config','playwright.stories.config.ts',feature,...projects.map(p=>`--project=${p}`),'--max-failures=1','--retries=0','--update-snapshots=none'];
}
export function validateComplete({records,commit}){
 if(records.length!==4)throw Error('All four sizes required');
 for(const project of projects){
  const recordsForProject=records.filter(r=>r.manifest.project===project);
  if(recordsForProject.length!==1)throw Error('Missing or duplicate project');
  const {manifest:m,pngs,failed}=recordsForProject[0];
  if(failed||pngs!==6||m.status!=='passed'||m.mode!=='generate'||m.platform!=='linux-arm64'||m.source?.commit!==commit||m.source?.dirty!==false||m.source?.spec!==feature||m.source?.specSha256!==specHash)throw Error('Incomplete or wrong-source candidates');
 }
 return {status:'complete-candidates',images:24,approval:'pending-independent-review'};
}
export async function executeScience({run,inspect,record}){
 const code=await run(['x','svelte-kit','sync']);
 if(code!==0){record({setupExit:code,testExit:null});return code;}
 const testExit=await run(scienceCase(['science-components-candidates']));
 if(testExit!==0){record({testExit,status:'failed-unapprovable'});return testExit;}
 try{record({testExit,...await inspect()});return 0;}catch{record({testExit,status:'invalid-candidate-evidence'});return 2;}
}
async function main(args){
 scienceCase(args);runtimeGuard(process.platform,process.env);
 if(process.env.CLUSTER_STORY_MODE)throw Error('No inherited story mode');
 if(createHash('sha256').update(readFileSync(feature)).digest('hex')!==specHash)throw Error('Reviewed component story changed');
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
 if(git('status','--porcelain'))throw Error('Clean checkout required');
 const busy=await new Promise(done=>{const s=createConnection({host:'127.0.0.1',port:4173});s.once('connect',()=>{s.destroy();done(true);});s.once('error',()=>done(false));});
 if(busy)throw Error('Owned port4173 occupied; no process stopped');
 mkdirSync('ci-evidence',{recursive:true});const folder=mkdtempSync(resolve('ci-evidence/recovery-science-')),commit=git('rev-parse','HEAD');
 writeFileSync(join(folder,'source.json'),JSON.stringify({commit,renderer:pinned,feature,specHash,projects,mode:'generate',expectedCaptures:24,testBudgetMs:90000,stepBudgetMs:30000,captureBudgetMs:10000,assertionBudgetMs:10000},null,2)+'\n');
 const env={...process.env,CI:'true',CLUSTER_STORY_MODE:'generate',CLUSTER_STORY_OUTPUT_ROOT:join(folder,'stories')};
 return executeScience({run:a=>childExit('bun',a.includes('playwright')?[...a,`--output=${folder}/playwright`]:a,env),inspect:async()=>{
  if(git('status','--porcelain'))throw Error('Generation changed tracked source');
  return validateComplete({commit,records:projects.map(p=>{const dir=join(folder,'stories/science-ledger-components',p,'linux-arm64');return {manifest:JSON.parse(readFileSync(join(dir,'story.json'),'utf8')),pngs:readdirSync(dir).filter(n=>n.endsWith('.png')).length,failed:existsSync(join(dir,'FAILED.json'))};})});
 },record:r=>writeFileSync(join(folder,'result.json'),JSON.stringify(r,null,2)+'\n')});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){try{process.exitCode=await main(process.argv.slice(2));}catch(e){console.error(e instanceof Error?e.message:'Science orchestration failed');process.exitCode=1;}}
