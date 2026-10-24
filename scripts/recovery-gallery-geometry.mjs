// Read-only recovery diagnostic, not player-story or visual acceptance evidence.
// No screenshots, service setup, retries, viewport overrides or content changes.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const output = process.argv[2];
if (!output) throw new Error('An explicit retained JSON output path is required');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: {width:3840,height:2160}, deviceScaleFactor:1, locale:'en-US', timezoneId:'UTC', colorScheme:'dark', reducedMotion:'reduce' });
  page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:4173/clusterii/pr4/gallery/', {timeout:10000});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
  const geometry = await page.evaluate(()=>{
    const bounds = el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const dimensions = el=>({scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,offsetWidth:el.offsetWidth,offsetHeight:el.offsetHeight,clientWidth:el.clientWidth,clientHeight:el.clientHeight});
    return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},document:dimensions(document.documentElement),body:dimensions(document.body),
      sections:[...document.querySelectorAll('.samples > section')].map(el=>({headings:[...el.querySelectorAll('h2')].map(h=>h.textContent),...bounds(el)})),
      headings:[...document.querySelectorAll('.samples h2')].map(el=>({title:el.textContent,...bounds(el)})),
      extents:[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length).map(el=>({tag:el.tagName,classes:typeof el.className==='string'?el.className:'',...bounds(el)})).sort((a,b)=>(b.y+b.height)-(a.y+a.height)).slice(0,12),
      controls:[...document.querySelectorAll('button,input,select')].filter(el=>el.getClientRects().length).length,
      images:{count:document.images.length,incomplete:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length},
      canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),
    };
  });
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics=await cdp.send('Performance.getMetrics');
  const allowed=new Set(['Documents','Nodes','JSHeapUsedSize','JSHeapTotalSize','LayoutCount','RecalcStyleCount']);
  writeFileSync(output,JSON.stringify({browser:browser.version(),geometry,metrics:metrics.metrics.filter(m=>allowed.has(m.name))},null,2)+'\n');
} finally { await browser.close(); }
