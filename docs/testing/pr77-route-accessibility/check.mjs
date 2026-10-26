import { chromium } from '/tmp/cluster-pr54-credit-review/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { expect } from '/tmp/cluster-pr54-credit-review/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}); const results=[];
try { for (const motion of ['reduce','no-preference']) for(const [size,width,height] of [['phone',393,852],['desktop',1440,1000],['large',3840,2160],['short',1280,720]]) {
const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});
await page.goto('http://127.0.0.1:5197/clusterii/pr4/gallery/');
const planner=page.getByRole('region',{name:'Fleet route planner',exact:true}).first();await planner.waitFor();await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('16px "Atkinson Hyperlegible"')));await planner.scrollIntoViewIfNeeded();
const details=planner.getByRole('region',{name:'Route details',exact:true});await details.focus();await page.keyboard.press('End');
await page.waitForFunction(()=>{const e=[...document.querySelectorAll('[aria-label="Route details"]')][0];return e.scrollTop+e.clientHeight>=e.scrollHeight-1;});
const warning=details.getByText('Defenders may be unknown',{exact:false});const d=await details.boundingBox(),w=await warning.boundingBox();assert(w.y>=d.y&&w.y+w.height<=d.y+d.height+1);assert(w.y>=0&&w.y+w.height<=height);
await page.screenshot({path:`/tmp/cluster-pr77-accessibility/${size}-${motion}-warning.png`});
const discard=planner.getByRole('button',{name:'Discard draft',exact:true});await discard.focus();await discard.press('Enter');
await expect(planner.getByRole('list',{name:'Route waypoints'}).locator('li')).toHaveCount(0);
await expect(planner.getByRole('searchbox',{name:'Find a waypoint'})).toBeFocused();await expect(discard).toBeDisabled();
results.push({size,motion,warningBounds:w,detailsBounds:d,keyboardEndReadsWarning:true,discardClearsDraft:true,focusReturns:true});await page.close();
}} finally {await browser.close();fs.writeFileSync('/tmp/cluster-pr77-accessibility/results.json',JSON.stringify(results,null,2));}console.log(JSON.stringify(results));
