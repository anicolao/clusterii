// Retained static scene replay. This does not simulate authenticated player acceptance.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const fixtureBase=process.env.IDENTITY_RETAINED_ROOT;
if (!fixtureBase?.endsWith('/')) throw Error('IDENTITY_RETAINED_ROOT must identify the retained fixture checkout with trailing slash');
const root=fixtureBase+'tests/fixtures/identity-paint/';
const resources=JSON.parse(readFileSync(root+'resources.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const r of Object.values(resources))if(hash(readFileSync(fixtureBase+r.path))!==r.sha256)throw Error('Retained static resource changed: '+r.path);
const args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--num-raster-threads=2','--disable-skia-runtime-opts','--run-all-compositor-stages-before-draw','--disable-checker-imaging','--disable-partial-raster','--disable-gpu-rasterization','--disable-gpu'];
const out=mkdtempSync('/tmp/cluster-pr53-layer-');
console.log('Retained output:',out);
const browser=await chromium.launch({args});
const records=[], errors=[], layerEvidence=[];
const started=Date.now();
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce',colorScheme:'dark',locale:'en-US',timezoneId:'UTC',deviceScaleFactor:1});
 const cdp=await page.context().newCDPSession(page);let layers=[];await cdp.send('LayerTree.enable');cdp.on('LayerTree.layerTreeDidChange',e=>{layers=e.layers??[]});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url==='http://127.0.0.1:4173/clusterii/pr4/')return route.fulfill({contentType:'text/html',body:readFileSync(root+'scene.html')});
  const resource=resources[url];
  if(resource)return route.fulfill({contentType:resource.mime,body:readFileSync(fixtureBase+resource.path)});
  // Unused font subsets are still from original bundled CSS, and must fail visibly if requested.
  errors.push('Unretained resource: '+url);
  return route.abort();
 });
 await page.goto('http://127.0.0.1:4173/clusterii/pr4/');
 await page.evaluate(async()=>{
  await document.fonts.ready;
  await Promise.all([...document.images].map(i=>i.decode()));
  const sources=new Set();
  for(const e of document.querySelectorAll('*'))for(const m of getComputedStyle(e).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))sources.add(m[1]);
  await Promise.all([...sources].map(src=>{const image=new Image();image.src=src;return image.decode()}));
 });
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const captures=new Map();
 for(const variant of ['current-leading','own-layer']){
  await page.evaluate(v=>{const p=document.querySelector('.identity-intro');p.style.lineHeight='28px';p.style.transform=v==='own-layer'?'translateZ(0)':''},variant);
  for(let i=0;i<8;i++){
   if(Date.now()-started>90000)throw Error('Bounded renderer probe exceeded90s');
   await page.evaluate(i=>{
    const p=document.querySelector('.identity-intro'), form=document.querySelector('form');
    form.style.height=(i*3.125)+'px';form.style.overflow='hidden';
    p.style.fontFamily=i%2?'Arial, sans-serif':'';
   },i);
   await settle();
   await page.evaluate(()=>{
    const p=document.querySelector('.identity-intro'),form=document.querySelector('form');
    p.style.fontFamily='';form.style.height='';form.style.overflow='';
   });
   await page.evaluate(()=>document.fonts.ready);
   await settle();
   const image=await page.screenshot({animations:'allow',caret:'hide'});
   const crop=await sharp(image).extract({left:580,top:280,width:440,height:35}).ensureAlpha().raw().toBuffer();
   const digest=hash(crop);
   const geometry=await page.evaluate(()=>{const p=document.querySelector('.identity-intro'),r=document.createRange();r.selectNodeContents(p);return{box:p.getBoundingClientRect().toJSON(),text:[...r.getClientRects()].map(x=>x.toJSON()),font:getComputedStyle(p).font}});
   if(!captures.has(digest)){const name=variant+'-'+i+'.png';writeFileSync(out+'/'+name,image);captures.set(digest,name)}
   records.push({variant,iteration:i,sha256:digest,image:captures.get(digest),geometry});
  }
 }
 const {root:dom}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:dom.nodeId,selector:'.identity-intro'});const {node}=await cdp.send('DOM.describeNode',{nodeId});
 for(const layer of layers.filter(l=>l.backendNodeId===node.backendNodeId)) layerEvidence.push({...layer,reasons:await cdp.send('LayerTree.compositingReasons',{layerId:layer.layerId})});
 writeFileSync(out+'/result.json',JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),platform:process.platform,arch:process.arch,environment:process.env.CLUSTER_PINNED_RENDERER??null,args,elapsedMs:Date.now()-started,errors,layerEvidence,records},null,2));
 console.log(JSON.stringify({errors,variants:Object.fromEntries(['current-leading','own-layer'].map(v=>[v,[...new Set(records.filter(r=>r.variant===v).map(r=>r.sha256))]]))}));
 if(errors.length)throw Error('Fixture requested unretained resources or had browser errors');
}finally{await browser.close()}
