import {createRequire} from "node:module";
import {test,expect} from '@playwright/test';
import {login,authenticate,geometry} from './helpers';

test('reauthenticated sign-out ends two devices, preserves saved identity and restores focus',async({browser},info)=>{
  test.setTimeout(60000);
  const one=await browser.newContext(),two=await browser.newContext();
  try{
    const a=await one.newPage(),b=await two.newPage();const email=`devices-${Date.now()}@example.test`;
    await login(a,email);await a.getByLabel('Commander name').fill('Retained commander');await a.getByRole('button',{name:'Save identity'}).click();await expect(a.getByRole('status')).toContainText('Identity saved');
    await login(b,email);await expect(b.getByLabel('Commander name')).toHaveValue('Retained commander');await b.getByLabel('Commander name').fill('Unsent device draft');
    await a.getByRole('button',{name:'Close',exact:true}).click();
    for(const [name,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const){
      await a.setViewportSize({width,height});await geometry(a);
      const path=info.outputPath(`account-entry-${name}.png`);await a.screenshot({path});await info.attach(`Entry ${name}`,{path,contentType:'image/png'});
    }
    await a.getByRole('button',{name:'Your devices',exact:true}).click();
    await a.getByRole('button',{name:'Close',exact:true}).click();await expect(a.getByRole('button',{name:'Your devices',exact:true})).toBeFocused();
    await a.getByRole('button',{name:'Your devices',exact:true}).click();
    for(const [name,width,height] of [['phone',393,852],['desktop',1440,1000],['short',1280,720],['4k',3840,2160]] as const){
      await a.setViewportSize({width,height});await geometry(a);
      const path=info.outputPath(`sessions-${name}.png`);await a.screenshot({path});await info.attach(name,{path,contentType:'image/png'});
    }
    let popupPromise=a.waitForEvent('popup');await a.getByRole('button',{name:'Confirm with Google',exact:true}).click();let popup=await popupPromise;await popup.waitForLoadState();await popup.close();
    await expect(a.getByRole('alert')).toContainText('Sign-out completion could not be confirmed',{timeout:20000});await expect(a.getByRole('alert')).toBeFocused();
    await expect(b.getByLabel('Commander name')).toHaveValue('Unsent device draft');
    await a.setViewportSize({width:393,height:852});await geometry(a);
    const errorPath=info.outputPath('sessions-error-phone.png');await a.screenshot({path:errorPath});await info.attach('Cancelled reauthentication',{path:errorPath,contentType:'image/png'});
    // Inject one interruption after the real service transaction persists its fence.
    // Verify the browser's actual bearer token; no custom auth or alternate service.
    const require=createRequire(new URL('../../functions/package.json',import.meta.url));
    const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId:'demo-clusterii'});
    const db=require('firebase-admin/firestore').getFirestore();
    const {revokeCredentials}=require('./lib/functions/src/credential-revocation.js');
    let interrupted=false;
    await a.route('**/revokeCredentials',async route=>{
      if(route.request().method()!=='POST'||interrupted){await route.continue();return;}
      const token=await require('firebase-admin/auth').getAuth().verifyIdToken(route.request().headers().authorization.replace(/^Bearer /,''));
      const original=db.runTransaction.bind(db);
      db.runTransaction=async(...args:unknown[])=>{const result=await original(...args);interrupted=true;throw new Error('Stopped before database mirror');};
      try{let error:unknown;try{await revokeCredentials.run({auth:{uid:token.uid,token},data:route.request().postDataJSON().data});}catch(e){error=e;}
        expect((error as Error).message).toBe('Stopped before database mirror');
        expect((await db.doc(`sessionFences/${token.uid}`).get()).get('status')).toBe('pending');
        // The stopped worker's lease expires; recovery claims a new token.
        await db.doc(`sessionRevocations/${token.uid}/operations/${route.request().postDataJSON().data.operationId}`).update({leaseUntil:0});
      }finally{db.runTransaction=original;}
      await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{status:'INTERNAL',message:'Interrupted after persisted fence'}})});
    });
    popupPromise=a.waitForEvent('popup');await a.getByRole('button',{name:'Confirm with Google',exact:true}).click();popup=await popupPromise;await popup.waitForLoadState();
    await popup.getByRole('button',{name:'Add new account'}).click();await popup.getByLabel('Email',{exact:true}).fill(email);await popup.getByLabel('Display name',{exact:true}).fill('Commander');await popup.getByRole('button',{name:/Sign in with/}).click();
    await expect(a.getByRole('alert')).toContainText('Sign-out completion could not be confirmed');expect(interrupted).toBe(true);
    await a.unroute('**/revokeCredentials');await a.reload();
    await expect(a.getByRole('heading',{name:'Your devices.',exact:true})).toBeVisible();
    await expect(a.getByRole('button',{name:'Confirm with Google',exact:true})).toBeEnabled();
    const recoveredPath=info.outputPath('sessions-retry-phone.png');await a.screenshot({path:recoveredPath});await info.attach('Persisted sign-out recovery',{path:recoveredPath,contentType:'image/png'});
    popupPromise=a.waitForEvent('popup');await a.getByRole('button',{name:'Confirm with Google',exact:true}).click();popup=await popupPromise;await popup.waitForLoadState();
    await popup.getByRole('button',{name:'Add new account'}).click();await popup.getByLabel('Email',{exact:true}).fill(email);await popup.getByLabel('Display name',{exact:true}).fill('Commander');await popup.getByRole('button',{name:/Sign in with/}).click();
    for(const page of [a,b]){await expect(page.getByRole('status')).toHaveText('Your session ended. Sign in to continue.');await expect(page.getByRole('button',{name:'Play',exact:true})).toBeFocused();await expect(page.getByLabel('Commander name')).toHaveCount(0);}
    const path=info.outputPath('sessions-ended.png');await a.screenshot({path});await info.attach('Ended sessions',{path,contentType:'image/png'});
    // Firebase auth_time has second precision: fresh sign-in must follow the cutoff.
    await a.waitForTimeout(1100);await authenticate(a,email);
    await expect(a.getByLabel('Commander name')).toHaveValue('Retained commander');
    await a.reload();await a.getByRole('button',{name:'Your identity',exact:true}).click();await expect(a.getByLabel('Commander name')).toHaveValue('Retained commander');
  }finally{await one.close();await two.close();}
});
