import { mkdirSync, mkdtempSync, realpathSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { childExit } from './recovery-settlement.mjs';
import { candidateGuard } from './recovery-contacts.mjs';
export const cases = Object.freeze([
 ['contacts', 'scripts/recovery-contacts.mjs', 'feature012-contacts-candidates'],
 ['science', 'scripts/recovery-live-science.mjs', 'feature003-live-science-candidates'],
]);
export function exactCase(args) {
 if(args.length !== 1 || args[0] !== 'client-contact-science-candidates') throw Error('Only complete contact/science batch allowed');
}
export async function executeBatch(run, record) {
 const outcomes=[];
 for(const [family,script,name] of cases) {
  let exit;
  try { exit=await run(process.execPath,[script,name]); }
  catch { exit=1; }
  outcomes.push({family,exit}); record(outcomes);
 }
 return outcomes.find(o=>o.exit!==0)?.exit ?? 0;
}
async function main(args) {
 exactCase(args); candidateGuard(process.platform,process.env);
 const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
 if(git('status','--porcelain'))throw Error('Clean batch checkout required');
 mkdirSync('ci-evidence',{recursive:true});
 const folder=mkdtempSync(resolve('ci-evidence/recovery-client-batch-'));
 const commit=git('rev-parse','HEAD');
 return executeBatch(async(command,args)=>{
  const exit=await childExit(command,args,process.env);
  const family=args[0].includes('live-science')?'science':'contacts';
  const logs=join(folder,family);mkdirSync(logs);
  for(const name of ['firestore-debug.log','database-debug.log','firebase-debug.log'])if(existsSync(name))copyFileSync(name,join(logs,name));
  return exit;
 },outcomes=>writeFileSync(join(folder,'outcomes.json'),JSON.stringify({commit,mode:'generate',approval:'pending-independent-review',outcomes},null,2)+'\n'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){try{process.exitCode=await main(process.argv.slice(2));}catch(e){console.error(e instanceof Error?e.message:'Batch failed');process.exitCode=1;}}
