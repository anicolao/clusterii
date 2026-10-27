import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch();const results=[];
try {for(const motion of ['reduce','no-preference'])for(const [name,width,height] of [['phone',393,852],['short',1280,720]]){
const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});await page.goto('http://127.0.0.1:5197/review-route');const details=page.getByRole('region',{name:'Route details',exact:true});await details.waitFor();await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('16px "Atkinson Hyperlegible"')));
assert(await page.getByRole('button',{name:'Discard draft',exact:true}).isDisabled());await details.focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const e=document.querySelector('[aria-label="Route details"]');return e.scrollTop+e.clientHeight>=e.scrollHeight-1});
const d=await details.boundingBox(),w=await details.getByText('Defenders may be unknown',{exact:false}).boundingBox();assert(w.y>=d.y&&w.y+w.height<=d.y+d.height+1);assert(w.y+w.height<=height);results.push({name,motion,details:d,warning:w,keyboardEndExposesEntireWarning:true});await page.screenshot({path:`/tmp/pr77-empty-${name}-${motion}.png`});await page.close();
}}finally{await browser.close();fs.writeFileSync('/tmp/pr77-empty-scroll.json',JSON.stringify(results,null,2))}console.log(results);
