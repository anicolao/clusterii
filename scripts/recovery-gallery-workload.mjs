// Bounded read-only component workload diagnostic. No screenshots or game services.
import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { rendererArgs } from '../playwright.stories.config.ts';
import { expectReadingTarget } from '../tests/browser/story-helpers/reading-target.ts';
const output=process.argv[2]; if(!output)throw Error('Explicit retained output required');
const browser=await chromium.launch({args:rendererArgs});
const result={scope:'4K real gallery workload; not visual or service acceptance',browser:browser.version(),phases:[]};
const timer=setTimeout(()=>void browser.close(),30000);timer.unref();
try{
 const page=await browser.newPage({viewport:{width:3840,height:2160},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark',reducedMotion:'reduce'});
 page.setDefaultTimeout(10000);
 result.pageErrors=[];page.on('pageerror',error=>{if(result.pageErrors.length<8)result.pageErrors.push({name:error.name,message:error.message});});
 await page.addInitScript(()=>{
  const counts={draws:0};Object.defineProperty(window,'__galleryDrawCounts',{value:counts});
  for(const type of [WebGLRenderingContext,WebGL2RenderingContext])for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
   const original=type.prototype[name];if(!original)continue;
   type.prototype[name]=function(...args){counts.draws++;return Reflect.apply(original,this,args);};
  }
 });
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Performance.enable');await cdp.send('Profiler.enable');
 for(const motion of ['reduce','no-preference']){
  const phase={motion,operations:[]};result.phases.push(phase);
  const measure=async(name,run)=>{const at=performance.now();try{return await run();}finally{phase.operations.push({name,elapsedMs:performance.now()-at});}};
  await page.emulateMedia({reducedMotion:motion});await cdp.send('Profiler.start');
  await measure('navigate-and-assets',async()=>{
   await page.goto('http://127.0.0.1:4173/clusterii/pr4/gallery/');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  });
  const open=page.getByRole('button',{name:'Open science source specimen',exact:true});
  await measure('open-ledger',async()=>{await open.focus();await expect(open).toBeFocused();await open.press('Enter');});
  const panel=page.getByRole('region',{name:'Science sources',exact:true});
  const reading=panel.getByRole('region',{name:'Science source ledger',exact:true});
  const heading=panel.getByRole('heading',{name:'Empire total',exact:true});
  await measure('native-reading',async()=>{
   await reading.focus();await reading.press('End');await expect(reading).toBeFocused();
   for(let i=0;i<12;i++){
    if(await heading.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('[aria-label="Science source ledger"]').getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom;}))break;
    await page.keyboard.press('ArrowUp');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   }
   await expectReadingTarget(heading,false);
   await expectReadingTarget(panel.locator('dl > div').filter({hasText:'Last delivered science'}),false);
  });
  phase.steadyDraws=await page.evaluate(async()=>{
   const before=window.__galleryDrawCounts.draws,at=performance.now();
   await new Promise(resolve=>setTimeout(resolve,500));
   return {before,after:window.__galleryDrawCounts.draws,elapsedMs:performance.now()-at};
  });
  phase.geometry=await page.evaluate(()=>({height:document.documentElement.scrollHeight,controls:document.querySelectorAll('button,input,select').length,canvases:[...document.querySelectorAll('canvas')].map(c=>{const b=c.getBoundingClientRect();return {width:c.width,height:c.height,inViewport:b.bottom>0&&b.top<innerHeight&&b.right>0&&b.left<innerWidth};})}));
  const {profile}=await cdp.send('Profiler.stop');
  const counts=new Map();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);
  phase.cpu={durationUs:profile.endTime-profile.startTime,samples:profile.samples?.length??0,top:profile.nodes.map(n=>({function:n.callFrame.functionName,script:n.callFrame.url.split('/').pop(),line:n.callFrame.lineNumber,column:n.callFrame.columnNumber,samples:counts.get(n.id)??0})).sort((a,b)=>b.samples-a.samples).slice(0,24)};
  const allowed=new Set(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','Nodes','Documents','JSHeapUsedSize']);
  phase.metrics=(await cdp.send('Performance.getMetrics')).metrics.filter(m=>allowed.has(m.name));
  await panel.getByRole('button',{name:'Return to galaxy',exact:true}).press('Enter');await expect(open).toBeFocused();
 }
 if(result.pageErrors.length)throw Error('Gallery render errors');
 for(const phase of result.phases)if(phase.steadyDraws.after!==phase.steadyDraws.before)throw Error('Static offscreen scenes continue drawing');
 const charts=await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
 if(charts.some(n=>n.width<=0||n.height<=0))throw Error('Collapsed shared scene');
 result.charts=charts;
 const labels=await page.locator('.route-node').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,text:n.textContent.trim()})));
 if(!labels.length||labels.some(n=>!n.width||!n.height||!n.text))throw Error('Projected route labels missing');
 result.routeLabels=labels;result.status='complete';
}catch(error){result.status='failed';result.errorName=error?.name??'Error';throw error;}
finally{writeFileSync(output,JSON.stringify(result,null,2)+'\n');clearTimeout(timer);await browser.close();}
