import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createConnection} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(process.argv.length!==2)throw Error('No broadening arguments permitted');
const c={family:'all-short',viewport:'short',story:'live-fleet-travel',views:40,args:['x','playwright','test','--config','playwright.stories.config.ts','--project=short','--retries=0','--max-failures=1','--update-snapshots=none']};
function assertListing(output){const rows=output.split('\n').filter(l=>/^\s*\[short\]/.test(l));if(rows.length!==45||!output.includes('Total: 45 tests')||!rows.some(l=>l.includes('Live fleet travel and arrival preserve private forces through recovery')))throw Error('Exact original45-test short cohort required');}


const root='ci-evidence/cohort-diagnostic';if(existsSync(root))throw Error('Fresh output required');mkdirSync(root,{recursive:true});
const run=(cmd,args,env=process.env)=>{const r=spawnSync(cmd,args,{stdio:'inherit',env});if(r.status!==0)throw Error('Command failed: '+cmd+' exit '+r.status);};
const disk=spawnSync('df',['-Pk','.'],{encoding:'utf8'});const free=Number(disk.stdout.trim().split('\n').at(-1).trim().split(/\s+/)[3]);if(disk.status!==0||!Number.isFinite(free)||free<2559296)throw Error('Disk floor plus reserve required');
for(const port of [4173,19099,19000,18080,15001,14400,19150]){const busy=await new Promise(res=>{const s=createConnection({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();res(true)});s.once('error',()=>res(false));});if(busy)throw Error('Owned port occupied '+port);}
run('bun',['x','svelte-kit','sync']);
const list=spawnSync('bun',[...c.args,'--list'],{encoding:'utf8',maxBuffer:1024*1024});writeFileSync(root+'/collection.log',list.stdout+list.stderr);if(list.status!==0)throw Error('Collection failed');assertListing(list.stdout,c);
writeFileSync(root+'/selection.json',JSON.stringify({...c,mode:'verify',freeKiBBefore:free},null,2)+'\n');
run('bun',['run','--cwd','functions','build']);
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
const result=spawnSync('bun',['x','firebase','emulators:exec','--project','demo-clusterii','--only','auth,database,firestore,functions',['bun',...c.args].map(quote).join(' ')],{stdio:'inherit',env:{...process.env,CLUSTER_STORY_MODE:'verify',CLUSTER_RENDER_TELEMETRY:'1',NODE_OPTIONS:[process.env.NODE_OPTIONS??'','--import='+pathToFileURL(resolve('tests/browser/story-helpers/emulator-catalogue-register.mjs')).href].join(' ')}});
const ref=spawnSync('git',['diff','--exit-code','--','tests/browser/story-baselines','tests/e2e/008-fleet-travel/screenshots'],{stdio:'inherit'});
const manifest='test-results/stories/008-fleet-travel/stories/'+c.story+'/'+c.viewport+'/linux-arm64/story.json';let m=null;if(existsSync(manifest)){const raw=readFileSync(manifest);writeFileSync(root+'/story.json',raw);m=JSON.parse(raw);}
const summary={family:c.family,viewport:c.viewport,exit:result.status,signal:result.signal,referenceDiffExit:ref.status,manifestStatus:m?.status??'absent',mode:m?.mode??'absent',views:m?.steps?.flatMap(s=>s.views).length??0};writeFileSync(root+'/outcome.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
if(result.status!==0)process.exit(result.status??1);
if(ref.status!==0||m?.status!=='passed'||m?.mode!=='verify'||summary.views!==c.views)throw Error('Complete strict journey and unchanged reviewed references required');
