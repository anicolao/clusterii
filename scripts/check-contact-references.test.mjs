import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {checkContactReferences} from './check-contact-references.mjs';
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'contact-reference-preflight-')),bytes=Buffer.from('fixture-png-bytes'),sha256=createHash('sha256').update(bytes).digest('hex');
 const approval={status:'approved-for-regression-baseline-import',images:[]},inventory=[];
 for(const viewport of ['phone','desktop','large','short']){
  const renderer={platform:'linux-arm64',viewport,motion:'reduce'},images=[],folder=join(root,'tests/browser/story-baselines/live-fleet-contacts',viewport,'linux-arm64');mkdirSync(folder,{recursive:true});
  for(let n=0;n<19;n++){const filename=n+'.png',path='/tmp/cluster-pr69-linux-candidates/test-results/stories/live-fleet-contacts/'+viewport+'/linux-arm64/'+filename;images.push({path,sha256});approval.images.push({path,sha256});writeFileSync(join(folder,filename),bytes);}
  writeFileSync(join(folder,'renderer.json'),JSON.stringify(renderer));writeFileSync(join(folder,'review.json'),JSON.stringify({renderer}));inventory.push({outcome:{viewport},images,renderer});
 }
 return {root,approval,inventory,phone:join(root,'tests/browser/story-baselines/live-fleet-contacts/phone/linux-arm64')};
}
test('complete approved PNGs and original renderer metadata pass',()=>{const f=fixture();try{assert.deepEqual(checkContactReferences(f.root,f.approval,f.inventory),{images:76,viewports:4});}finally{rmSync(f.root,{recursive:true});}});
test('missing renderer is rejected even with every approved PNG and review present',()=>{const f=fixture();try{rmSync(join(f.phone,'renderer.json'));assert.throws(()=>checkContactReferences(f.root,f.approval,f.inventory),/Missing required reference file/);}finally{rmSync(f.root,{recursive:true});}});
test('missing/altered PNG and altered renderer or approval fail closed',()=>{
 for(const mutate of [f=>rmSync(join(f.phone,'0.png')),f=>writeFileSync(join(f.phone,'0.png'),'wrong'),f=>writeFileSync(join(f.phone,'renderer.json'),'{}'),f=>writeFileSync(join(f.phone,'review.json'),'{}'),f=>f.approval.images.pop(),f=>f.approval.images[0]=f.approval.images[1],f=>f.inventory[0].images.pop()]){const f=fixture();try{mutate(f);assert.throws(()=>checkContactReferences(f.root,f.approval,f.inventory));}finally{rmSync(f.root,{recursive:true});}}
});
