import { createConnection } from 'node:net';
import {spawnSync} from 'node:child_process';
import {mkdirSync,existsSync,renameSync,copyFileSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const projects=['short'];
const args=['x','playwright','test','--config','playwright.stories.config.ts','tests/browser/fleet-route-recovery.story.spec.ts',...projects.map(p=>'--project='+p),'--retries=0','--max-failures=1','--update-snapshots=none'];
const run=(cmd,args,env=process.env)=>{const r=spawnSync(cmd,args,{stdio:'inherit',env});if(r.status!==0)process.exit(r.status??1)};
run('bun',['x','svelte-kit','sync']);
const listed=spawnSync('bun',[...args,'--list'],{encoding:'utf8'});
if(listed.status!==0||!listed.stdout.includes('Total: 1 test in 1 file')||projects.some(p=>listed.stdout.split('['+p+']').length-1!==1))throw Error('Exactly one short route journey required, no fallback');
process.stdout.write(listed.stdout);if(process.argv.includes('--list-only'))process.exit(0);
async function preflight(){const d=spawnSync('df',['-Pk','.'],{encoding:'utf8'});const available=Number(d.stdout.trim().split('\n').at(-1).trim().split(/\s+/)[3]);if(d.status!==0||!Number.isFinite(available)||available<2559296)throw Error('Disk floor plus reserve required');console.log('Available KiB',available);for(const port of [4173,19099,19000,18080,15001,14400,19150]){const busy=await new Promise(res=>{const s=createConnection({host:'127.0.0.1',port});s.once('connect',()=>{s.destroy();res(true)});s.once('error',()=>res(false));});if(busy)throw Error('Owned port already in use: '+port);}}
await preflight();run('bun',['run','--cwd','functions','build']);
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
for(const pass of [1,2]){
 await preflight();const dest=`ci-evidence/route-repeat/pass-${pass}`;if(existsSync(dest))throw Error('No reuse of prior pass output');mkdirSync(dest,{recursive:true});
 const r=spawnSync('bun',['x','firebase','emulators:exec','--project','demo-clusterii','--only','auth,database,firestore,functions',['bun',...args].map(quote).join(' ')],{stdio:'inherit',env:{...process.env,CLUSTER_STORY_MODE:'generate',NODE_OPTIONS:[process.env.NODE_OPTIONS??'','--import='+pathToFileURL(resolve('tests/browser/story-helpers/emulator-catalogue-register.mjs')).href].join(' ')}});
 if(existsSync('test-results/stories'))renameSync('test-results/stories',dest+'/stories');
 if(existsSync('firestore-debug.log'))copyFileSync('firestore-debug.log',dest+'/firestore-debug.log');
 writeFileSync(dest+'/exit.json',JSON.stringify({pass,status:r.status,signal:r.signal})+'\n');
 if(r.status!==0)process.exit(r.status??1);
 for(const project of projects){const folder=dest+`/stories/interrupted-fleet-route/${project}/linux-arm64`;const m=JSON.parse(readFileSync(folder+'/story.json'));if(m.status!=='passed'||m.mode!=='generate'||m.steps.flatMap(s=>s.views).length!==40||readdirSync(folder).filter(n=>n.endsWith('.png')).length!==40)throw Error('Every pass requires complete forty-view family per size');}
}
console.log('Two complete short route passes retained; no reference promotion or strict acceptance.');
const {createHash}=await import('node:crypto');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const comparison=[];
for(const project of projects){const rel=`stories/interrupted-fleet-route/${project}/linux-arm64`;for(const name of readdirSync(`ci-evidence/route-repeat/pass-1/${rel}`).filter(n=>n.endsWith('.png')).sort()){const a=readFileSync(`ci-evidence/route-repeat/pass-1/${rel}/${name}`),b=readFileSync(`ci-evidence/route-repeat/pass-2/${rel}/${name}`);comparison.push({project,name,first:digest(a),second:digest(b),identical:a.equals(b)});}}
function factFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?factFiles(dir+'/'+e.name):e.name === 'route-observation-facts.json'?[dir+'/'+e.name]:[]);}
const facts=[1,2].map(p=>factFiles(`ci-evidence/route-repeat/pass-${p}/stories`).map(f=>readFileSync(f,'utf8')).sort());
writeFileSync('ci-evidence/route-repeat/comparison.json',JSON.stringify({images:comparison,factCounts:facts.map(f=>f.length),factHashes:facts.map(fs=>fs.map(s=>digest(s))),factsIdentical:JSON.stringify(facts[0])===JSON.stringify(facts[1])},null,2)+'\n');
if(comparison.length!==40||comparison.some(c=>!c.identical)||facts.some(f=>f.length!==1)||JSON.stringify(facts[0])!==JSON.stringify(facts[1]))throw Error('Repeated complete journeys must retain exact image and redacted acquisition fingerprints; evidence preserved');
console.log('All40 image pairs and one acquisition summary per pass are byte-identical across two complete passes.');
