import { execFileSync } from "node:child_process";
import {test,expect} from '@playwright/test';
import {login,geometry,grantDeveloper} from './helpers';
for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const) test(`reused command identity cannot acknowledge another draft: ${label}`,async({page},info)=>{
 await page.setViewportSize({width,height});
 // Controlled UUID collision exercises production submission, persistence and recovery.
 await page.addInitScript(()=>{const original=crypto.randomUUID.bind(crypto);const id=original();crypto.randomUUID=()=>id;Object.assign(window,{restoreCommandIds:()=>{crypto.randomUUID=original;}});});
 await login(page,`receipt-${label}-${Date.now()}@example.test`);
 await page.getByLabel('Commander name').fill('Accepted identity');await page.getByRole('button',{name:'Save identity',exact:true}).click();await expect(page.getByRole('status')).toContainText('Identity saved');
 await page.getByLabel('Commander name').fill('Preserved new draft');await page.getByRole('button',{name:'Save identity',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('does not match your order');await expect(page.getByLabel('Commander name')).toHaveValue('Preserved new draft');await expect(page.getByRole('button',{name:'Retry save'})).toHaveCount(0);
 await expect(page.getByRole('alert')).toBeFocused();await expect(page.getByLabel('Commander name')).not.toHaveAttribute('aria-invalid','true');await geometry(page);const path=info.outputPath(`receipt-mismatch-${label}.png`);await page.screenshot({path});await info.attach(label,{path,contentType:'image/png'});
 await page.evaluate(()=>{(window as unknown as {restoreCommandIds:()=>void}).restoreCommandIds();});
 await page.getByRole('button',{name:'Save identity',exact:true}).click();await expect(page.getByRole('status')).toContainText('Identity saved');await page.reload();await page.getByRole('button',{name:'Your identity',exact:true}).click();await expect(page.getByLabel('Commander name')).toHaveValue('Preserved new draft');
});

for(const [label,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const) test(`campaign collision preserves the proposed galaxy: ${label}`,async({page,request},info)=>{
 await page.setViewportSize({width,height});const email=`campaign-receipt-${label}-${Date.now()}@example.test`;await login(page,email);await page.getByLabel('Commander name').fill('Receipt envoy');await page.getByRole('button',{name:'Save identity',exact:true}).click();await expect(page.getByRole('status')).toContainText('Identity saved');await grantDeveloper(email);await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('link',{name:'Open campaigns'}).click();
 await page.evaluate(()=>{const original=crypto.randomUUID.bind(crypto);const id=original();crypto.randomUUID=()=>id;Object.assign(window,{restoreCommandIds:()=>{crypto.randomUUID=original;}});});
 await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.getByLabel('Campaign name').fill('Original galaxy');await page.getByRole('button',{name:'Create galaxy',exact:true}).click();await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();const originalId=new URL(page.url()).searchParams.get('campaign')!;await page.getByRole('button',{name:'All campaigns',exact:true}).click();await page.getByRole('button',{name:'Create campaign',exact:true}).click();await page.getByLabel('Campaign name').fill('Preserved galaxy');await page.getByRole('button',{name:'Create galaxy',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('does not match your order');await expect(page.getByRole('alert')).toBeFocused();await expect(page.getByLabel('Campaign name')).toHaveValue('Preserved galaxy');await expect(page.getByRole('button',{name:'Create galaxy',exact:true})).toBeEnabled();await expect.poll(()=>savedOrderCount(page)).toBe(0);const original=await request.get(`http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/developmentCampaigns/${originalId}`,{headers:{Authorization:'Bearer owner'}});expect(original.ok()).toBe(true);expect((await original.json()).fields).toMatchObject({name:{stringValue:'Original galaxy'},revision:{integerValue:'1'}});await geometry(page);await page.getByRole('alert').scrollIntoViewIfNeeded();const path=info.outputPath(`campaign-receipt-${label}.png`);await page.screenshot({path});await info.attach(label,{path,contentType:'image/png'});
 await page.evaluate(()=>{(window as unknown as {restoreCommandIds:()=>void}).restoreCommandIds();});await page.getByRole('button',{name:'Create galaxy',exact:true}).click();await expect(page.getByRole('heading',{name:'Choose your faction'})).toBeVisible();await expect(page.getByRole('heading',{name:'Preserved galaxy',exact:true})).toBeVisible();const freshId=new URL(page.url()).searchParams.get('campaign')!;expect(freshId).not.toBe(originalId);await expect.poll(()=>savedOrderCount(page)).toBe(0);const fresh=await request.get(`http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/developmentCampaigns/${freshId}`,{headers:{Authorization:'Bearer owner'}});expect(fresh.ok()).toBe(true);expect((await fresh.json()).fields).toMatchObject({name:{stringValue:'Preserved galaxy'},revision:{integerValue:'1'}});await page.reload();await expect(page.getByRole('heading',{name:'Preserved galaxy',exact:true})).toBeVisible();
});

async function savedOrderCount(page: import("@playwright/test").Page) {
 return page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open("clusterii-recovery",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const count=await new Promise<number>((resolve,reject)=>{const r=db.transaction("orders").objectStore("orders").count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return count;
 });
}

test("durable cleanup compares the complete encrypted record, including a replacement using the same UUID",async({page})=>{
 const source=execFileSync("bun",["build","src/lib/recovery-store.ts","--target=browser"],{encoding:"utf8"});
 await page.route("**/__recovery-store-test.js",route=>route.fulfill({contentType:"text/javascript",body:source}));
 await page.goto("./");
 const result=await page.evaluate(async()=>{
  const url=new URL("__recovery-store-test.js",location.href).href;
  const {claimOrder,readOrder,clearOrder}=await import(url);
  // Opaque encrypted bytes are compared by the actual production IndexedDB store.
  const old={id:"same-command",gameId:"campaign",kind:"campaign.create",envelope:{body:"first encrypted payload"}};
  const replacement={...old,envelope:{body:"replacement encrypted payload"}};
  await claimOrder("same-account",old);
  await clearOrder("same-account",{...old,dispatched:true});
  const retired=await readOrder("same-account");
  await claimOrder("same-account",replacement);
  let conflict=false;try{await clearOrder("same-account",old);}catch(error){conflict=(error as {area?:string}).area==="order";}
  const retained=await readOrder("same-account");
  await clearOrder("same-account",replacement);
  await clearOrder("same-account",replacement);
  return {retired:retired??null,conflict,retained,empty:(await readOrder("same-account"))??null};
 });
 expect(result.retired).toBeNull();expect(result.conflict).toBe(true);expect(result.retained.envelope.body).toBe("replacement encrypted payload");expect(result.empty).toBeNull();
});
