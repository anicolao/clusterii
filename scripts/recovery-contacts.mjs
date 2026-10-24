import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createConnection } from 'node:net';
import { runtimeGuard, pinned, childExit } from './recovery-settlement.mjs';
export const feature='tests/e2e/012-fleet-contacts/contacts.spec.ts';
export const projects=['phone','desktop','large','short'];
export const specHash='d80d55f3550c4e55a43aae202fbfcb611275c248cd93b61831b116c73419b7f4';
export function candidateCase(args) {
 if(args.length!==1||args[0]!=='feature012-contacts-candidates')throw Error('Only complete feature012 four-size candidates allowed');
 return ['x','playwright','test','--config','playwright.stories.config.ts',feature,...projects.map(p=>`--project=${p}`),'--max-failures=1','--retries=0','--update-snapshots=none'];
}
export function candidateGuard(platform,env,inside=false){
 if(env.CLUSTER_STORY_MODE && !(inside&&env.CLUSTER_STORY_MODE==='generate'))throw Error('Unexpected inherited story mode');
 runtimeGuard(platform,{...env,CLUSTER_STORY_MODE:undefined});
}
export function validateComplete({records,commit}) {
 if(records.length!==4)throw Error('All four sizes required');
 for(const project of projects){const entries=records.filter(r=>r.manifest.project===project);if(entries.length!==1)throw Error('Missing or duplicate project');const {manifest,pngs,failed}=entries[0];if(failed||manifest.status!=='passed'||manifest.mode!=='generate'||manifest.platform!=='linux-arm64'||manifest.source?.commit!==commit||manifest.source?.dirty!==false||manifest.source?.spec!==feature||manifest.source?.specSha256!==specHash||pngs!==22)throw Error('Incomplete or wrong-source candidates');}
 return {status:'complete-candidates',images:88,approval:'pending-independent-review'};
}
export async function executeCandidates({run,inspect,record}){
 const testExit=await run(candidateCase(['feature012-contacts-candidates']));
 if(testExit!==0){record({testExit,status:'failed-unapprovable'});return testExit;}
 try { const evidence=await inspect();record({testExit,...evidence});return 0; }
 catch {record({testExit,status:'invalid-candidate-evidence'});return 2;}
}
export async function prepareCandidates(run,env){
 for(const a of [['x','svelte-kit','sync'],['run','--cwd','functions','build']]){const code=await run(a,env);if(code!==0)return code;}
 return run(['x','firebase','emulators:exec','--project','demo-clusterii','--only','auth,database,firestore,functions','node scripts/recovery-contacts.mjs inside-feature012-contacts-candidates'],env);
}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
async function main(args){
 const inside=args.length===1&&args[0]==='inside-feature012-contacts-candidates';
 if(!inside)candidateCase(args);
 candidateGuard(process.platform,process.env,inside);
 if(createHash('sha256').update(readFileSync(feature)).digest('hex')!==specHash)throw Error('Original complete story changed');
 if(inside){
  const folder=process.env.CLUSTER_RECOVERY_OUTPUT;
  if(!folder||!resolve(folder).startsWith(resolve('ci-evidence')+'/recovery-contacts-')||!existsSync(join(folder,'source.json')))throw Error('Owned fresh source-bound output required');
  const source=JSON.parse(readFileSync(join(folder,'source.json'),'utf8'));
  if(source.commit!==git('rev-parse','HEAD')||process.env.CLUSTER_STORY_OUTPUT_ROOT!==join(folder,'stories'))throw Error('Output/source mismatch');
  return executeCandidates({run:a=>childExit('bun',[...a,`--output=${folder}/playwright`],process.env),inspect:async()=>{
   if(git('status','--porcelain'))throw Error('Generation modified repository content');
   return validateComplete({commit:source.commit,records:projects.map(project=>{const dir=join(folder,'stories/live-fleet-contacts',project,'linux-arm64');return {manifest:JSON.parse(readFileSync(join(dir,'story.json'),'utf8')),pngs:readdirSync(dir).filter(n=>n.endsWith('.png')).length,failed:existsSync(join(dir,'FAILED.json'))};})});
  },record:r=>writeFileSync(join(folder,'result.json'),JSON.stringify(r,null,2)+'\n')});
 }
 if(git('status','--porcelain'))throw Error('Clean checkout required');
 for(const port of [4173,19099,19000,18080,19150,15001,14400,14500]){
  const busy=await new Promise(done=>{const s=createConnection({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();done(true);});s.once('error',()=>done(false));});
  if(busy)throw Error(`Owned port ${port} occupied; no process was stopped`);
 }
 mkdirSync('ci-evidence',{recursive:true});const folder=mkdtempSync(resolve('ci-evidence/recovery-contacts-'));
 writeFileSync(join(folder,'source.json'),JSON.stringify({commit:git('rev-parse','HEAD'),renderer:pinned,feature,specHash,projects,mode:'generate',expectedCaptures:88,testBudgetMs:240000,stepBudgetMs:30000,assertionBudgetMs:10000},null,2)+'\n');
 const env={...process.env,CLUSTER_RECOVERY_OUTPUT:folder,CLUSTER_STORY_OUTPUT_ROOT:join(folder,'stories'),CLUSTER_STORY_MODE:'generate',NODE_OPTIONS:`--import=${pathToFileURL(resolve('tests/browser/story-helpers/emulator-catalogue-register.mjs')).href}`};
 delete env.CLUSTER_EMULATOR_POST_MARKER;
 return prepareCandidates((a,e)=>childExit('bun',a,e),env);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){try{process.exitCode=await main(process.argv.slice(2));}catch(e){console.error(e instanceof Error?e.message:'Candidate orchestration failed');process.exitCode=1;}}
