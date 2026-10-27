import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const b=await chromium.launch();const results=[];
try{
for(const motion of ['reduce','no-preference'])for(const mode of ['draft','pending','retry']){
const p=await b.newPage({viewport:{width:1280,height:720},reducedMotion:motion});
await p.goto('http://127.0.0.1:5197/review-route?mode='+mode);await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
const region=p.getByRole('region',{name:'Route details',exact:true}),summary=p.locator('details.route-rules summary');
await p.getByRole('button',{name:'Back to fleets',exact:true}).focus();let found=false;for(let n=0;n<5;n++){await p.keyboard.press('Shift+Tab');if(await summary.evaluate(e=>e===document.activeElement)){found=true;break;}}assert(found,'Tab must reach help');
const rb=await region.boundingBox(),sb=await summary.boundingBox();assert(sb.y>=rb.y&&sb.y+sb.height<=rb.y+rb.height,'summary visible on keyboard focus');
await p.keyboard.press('Enter');assert(await p.locator('details.route-rules').evaluate(e=>e.open));
await region.focus();await p.keyboard.press('End');await p.waitForFunction(()=>{const e=document.querySelector('[aria-label="Route details"]');return e.scrollTop+e.clientHeight>=e.scrollHeight-1});
const explanation=region.locator('p.summary'),eb=await explanation.boundingBox();assert(eb.y>=rb.y&&eb.y+eb.height<=rb.y+rb.height+1,'departure explanation reachable using End');
results.push({mode,motion,tabReachesHelp:true,summary:sb,region:rb,departure:eb,keyboardEndExposesDeparture:true});
await p.screenshot({path:'/tmp/pr78-access-'+mode+'-'+motion+'.png'});await p.close();
}
}finally{await b.close();fs.writeFileSync('/tmp/pr78-short-access.json',JSON.stringify(results,null,2));}
console.log(results);
