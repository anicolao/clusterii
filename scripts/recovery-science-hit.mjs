// Read-only exact component-action diagnostic. No service mocks/captures/retries.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { rendererArgs } from '../playwright.stories.config.ts';
const [port,output]=process.argv.slice(2);
if(!['4173','4174'].includes(port)||!output)throw Error('Explicit owned port/output required');
const browser=await chromium.launch({args:rendererArgs});
const timer=setTimeout(()=>{console.error('Science hit diagnostic exceeded30s');void browser.close();},30000);timer.unref();
try{
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark',reducedMotion:'reduce'});page.setDefaultTimeout(10000);
 await page.goto(`http://127.0.0.1:${port}/clusterii/pr4/gallery/`);
 const open=page.getByRole('button',{name:'Open science source specimen',exact:true});await open.focus();await open.press('Enter');
 const ledger=page.getByRole('region',{name:'Science sources',exact:true});await ledger.scrollIntoViewIfNeeded();
 const reading=ledger.getByRole('region',{name:'Science source ledger',exact:true});const total=ledger.locator('dl > div').filter({hasText:'Last delivered science'});
 await reading.focus();await reading.press('End');
 for(let i=0;i<12;i++){
  if(await total.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('[aria-label="Science source ledger"]').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}))break;
  await reading.press('ArrowUp');await reading.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 }
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const result=await ledger.getByRole('button',{name:'Return to galaxy',exact:true}).evaluate(e=>{
  const box=e.getBoundingClientRect();const describe=p=>p?{tag:p.tagName,class:p.className,label:p.getAttribute('aria-label'),text:p.textContent?.trim().slice(0,100),rect:p.getBoundingClientRect().toJSON()}:null;
  return {viewport:{width:innerWidth,height:innerHeight},scrollY,documentHeight:document.documentElement.scrollHeight,target:describe(e),points:[[box.left+1,box.top+1],[box.right-1,box.bottom-1],[box.left+box.width/2,box.top+box.height/2]].map(([x,y])=>{const hit=document.elementFromPoint(x,y);return {x,y,hit:hit===e||e.contains(hit),painted:describe(hit),stack:document.elementsFromPoint(x,y).slice(0,6).map(describe)};}),ancestors:(()=>{const a=[];for(let p=e.parentElement;p;p=p.parentElement)a.push({...describe(p),overflow:getComputedStyle(p).overflow});return a;})()};
 });
 writeFileSync(output,JSON.stringify({browser:browser.version(),rendererArgs,...result},null,2)+'\n');
}finally{clearTimeout(timer);await browser.close();}
