import {chromium,expect} from '/tmp/cluster-pr54-credit-review/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true});const results=[];
try {
for(const motion of ['reduce','no-preference'])for(const [size,width,height] of [['phone',393,852],['desktop',1440,1000],['large',3840,2160],['short',1280,720]]){
const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});
await page.goto('http://127.0.0.1:5197/reviewer-discard/');
const route=page.getByRole('region',{name:'Fleet route planner',exact:true});
await route.waitFor();await page.evaluate(()=>document.fonts.ready);
const discard=route.getByRole('button',{name:'Discard draft',exact:true});
const before=await page.getByLabel('Bound waypoints').textContent();
await expect(discard).toBeEnabled();
for(const [pending,busy] of [[true,false],[false,true],[true,true]]){
 await page.getByLabel('Pending',{exact:true}).setChecked(pending);
 await page.getByLabel('Busy',{exact:true}).setChecked(busy);
 await expect(discard).toBeDisabled();
 await discard.dispatchEvent('click');
 await expect(page.getByLabel('Bound waypoints')).toHaveText(before);
 await expect(page.getByLabel('Commit calls')).toHaveText('0');
 await expect(route.getByText('Draft discarded. No fleet order was sent.',{exact:true})).toHaveCount(0);
 results.push({size,motion,pending,busy,disabled:true,syntheticClickPreservesDraft:true,commits:0});
}
await page.getByLabel('Pending',{exact:true}).uncheck();await page.getByLabel('Busy',{exact:true}).uncheck();
await expect(discard).toBeEnabled();await discard.focus();await discard.press('Enter');
await expect(page.getByLabel('Bound waypoints')).toHaveText('[]');
await expect(page.getByLabel('Commit calls')).toHaveText('0');
await expect(route.getByRole('searchbox',{name:'Find a waypoint'})).toBeFocused();
await expect(discard).toBeDisabled();
await page.getByLabel('Accepted',{exact:true}).check();
await expect(discard).toHaveCount(0);
results.push({size,motion,releasedGuardKeyboardDiscard:true,focusReturned:true,acceptedRouteHasNoDiscard:true});
await page.close();
}
}finally{await browser.close();fs.writeFileSync('/tmp/cluster-pr77-pending-busy/results.json',JSON.stringify(results,null,2));}
console.log('Passed '+results.length+' guard/release cases across four viewports and both motion settings.');
