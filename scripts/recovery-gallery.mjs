import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createConnection } from 'node:net';
import { runtimeGuard, pinned, childExit } from './recovery-settlement.mjs';
export const spec = 'tests/browser/lab.spec.ts';
export const specHash = 'b2833ba48189368c7e0a91b166351ade20e4b486ed8f3d01503384b3aa403e6e';
export function galleryCase(args) {
  if(args.length!==1 || args[0]!=='gallery-large') throw Error('Only gallery-large is allowed');
  return ['x','playwright','test','--config','playwright.config.ts',spec,'--grep','large: gallery and lab rendered evidence$','--max-failures=1','--retries=0','--update-snapshots=none'];
}
export async function executeGallery({args, run, measure, record}) {
  const command=galleryCase(args);
  const measurementExit=await measure();
  if(measurementExit!==0) {record({measurementExit,testExit:null});return measurementExit;}
  const testExit=await run(command);
  record({measurementExit,testExit});
  return testExit;
}
async function measure(folder, env) {
  for(const args of [['x','svelte-kit','sync'],['run','build']]) {
    const code=await childExit('bun',args,env); if(code!==0) return code;
  }
  const server=spawn(process.execPath,['scripts/serve-pages.mjs','/clusterii/pr4','4173'],{env,stdio:'inherit'});
  const stopped=new Promise(resolve=>{server.once('exit',resolve);server.once('error',resolve);});
  try {
    const until=performance.now()+10000;
    let ready=false;
    while(performance.now()<until) {
      if(server.exitCode!==null) throw Error('Owned gallery server exited before readiness');
      try { const r=await fetch('http://127.0.0.1:4173/clusterii/pr4/gallery/',{signal:AbortSignal.timeout(500)});await r.body?.cancel();if(r.ok){ready=true;break;} } catch {}
      await new Promise(r=>setTimeout(r,100));
    }
    if(!ready) throw Error('Owned gallery server readiness exceeded 10s');
    return await childExit(process.execPath,['scripts/recovery-gallery-geometry.mjs',join(folder,'geometry.json')],env);
  } finally {
    server.kill('SIGTERM');
    const ended=await Promise.race([stopped.then(()=>true),new Promise(r=>setTimeout(()=>r(false),2000))]);
    if(!ended) {server.kill('SIGKILL');await stopped;}
  }
}
async function main(args) {
  galleryCase(args);runtimeGuard(process.platform,process.env);
  if(createHash('sha256').update(readFileSync(spec)).digest('hex')!==specHash) throw Error('Original legacy test changed');
  const busy=await new Promise(done=>{const s=createConnection({host:'127.0.0.1',port:4173});s.once('connect',()=>{s.destroy();done(true);});s.once('error',()=>done(false));});
  if(busy) throw Error('Port4173 is occupied; no process was stopped');
  const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
  if(git('status','--porcelain')) throw Error('Clean checkout required');
  mkdirSync('ci-evidence',{recursive:true});
  const folder=mkdtempSync(resolve('ci-evidence/recovery-gallery-'));
  writeFileSync(join(folder,'source.json'),JSON.stringify({commit:git('rev-parse','HEAD'),renderer:pinned,spec,specHash,viewport:[3840,2160],testBudgetMs:45000,fullPage:true,mode:'verify'},null,2)+'\n');
  const env={...process.env,CI:'true',PUBLIC_BASE_PATH:'/clusterii/pr4',PUBLIC_EMULATORS:'true'};
  // Prove the fixed filter selects exactly one unchanged case before execution.
  const listed=execFileSync('bun',[...galleryCase(args),'--list'],{env,encoding:'utf8',maxBuffer:256*1024,timeout:30000});
  writeFileSync(join(folder,'selection.log'),listed);
  if(!/Total: 1 test in 1 file/.test(listed)||!listed.includes('large: gallery and lab rendered evidence')) throw Error('Unexpected case selection');
  return executeGallery({args,measure:()=>measure(folder,env),run:a=>childExit('bun',[...a,`--output=${folder}/playwright`],env),record:result=>writeFileSync(join(folder,'result.json'),JSON.stringify(result,null,2)+'\n')});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href) {
  try { process.exitCode=await main(process.argv.slice(2)); } catch(e) {console.error(e instanceof Error?e.message:'Gallery recovery failed');process.exitCode=1;}
}
