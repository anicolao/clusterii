import { commandDigest, verifyReceipt } from "../shared/command-receipt";
import { afterAll, expect, test, spyOn } from "bun:test";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  set,
  get,
} from "firebase/database";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import {
  commandContext,
  profileContext,
  type ProfileView,
  type Profile,
} from "../shared/profile";
import { newKey, provider, unwrap } from "../shared/crypto";
const projectId = "demo-clusterii";
const clients: ReturnType<typeof initializeApp>[] = [];
async function client(name: string) {
  const app = initializeApp(
    {
      projectId,
      apiKey: "demo-key",
      databaseURL: "http://127.0.0.1:19000?ns=demo-clusterii-default-rtdb",
    },
    `${name}-${crypto.randomUUID()}`,
  );
  clients.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:19099", {
    disableWarnings: true,
  });
  const cred = GoogleAuthProvider.credential(
    JSON.stringify({
      sub: name,
      email: `${name}@example.test`,
      email_verified: true,
    }),
  );
  const { user } = await signInWithCredential(auth, cred);
  const database = getDatabase(app);
  connectDatabaseEmulator(database, "127.0.0.1", 19000);
  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, "127.0.0.1", 18080);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 15001);
  const { data } = await httpsCallable<undefined, { kek: string }>(
    functions,
    "profileKey",
  )();
  return { uid: user.uid, user, functions, database, firestore, kek: data.kek };
}
afterAll(async () => {
  await Promise.all(clients.map(deleteApp));
});
async function receipt(c: Awaited<ReturnType<typeof client>>, id: string) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const result = await getDoc(
      doc(c.firestore, "profiles", c.uid, "receipts", id),
    );
    if (result.exists()) return result.data();
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("No authoritative receipt");
}
test("authenticated ingress, owner grants, replay, concurrent CAS and direct access rules", async () => {
  const alice = await client(`alice${Date.now()}`),
    bob = await client(`bob${Date.now()}`);
  const id = crypto.randomUUID();
  const codec = provider("mock");
  const body = await codec.seal(
    {
      kind: "profile.set",
      expectedRevision: 0,
      profile: { alias: "Alice 🌌", portrait: "A1" },
    },
    alice.kek,
    commandContext(alice.uid, id),
  );
  const command = ref(alice.database, `profileCommands/${alice.uid}/${id}`);
  await expect(
    set(ref(bob.database, `profileCommands/${alice.uid}/${id}`), body),
  ).rejects.toThrow();
  await set(command, body);
  const acceptedReceipt = await receipt(alice,id);
  expect(acceptedReceipt.status).toBe("accepted");
  expect(acceptedReceipt.requestDigest).toBe(await commandDigest(`profileCommands/${alice.uid}/${id}`,body));
  expect(()=>verifyReceipt(acceptedReceipt, "changed-body")).toThrow("does not match");
  await expect(set(command, body)).rejects.toThrow();
  await expect(get(command)).rejects.toThrow();
  const head = doc(alice.firestore, "profiles", alice.uid);
  const view = (await getDoc(head)).data() as ProfileView;
  expect(view.revision).toBe(1);
  const ctx = profileContext(alice.uid, 1);
  const key = await unwrap(view.grant, alice.kek, alice.uid, ctx, "mock");
  expect(await codec.open<Profile>(view.envelope, key, ctx)).toEqual({
    alias: "Alice 🌌",
    portrait: "A1",
  });
  await expect(
    getDoc(doc(bob.firestore, "profiles", alice.uid)),
  ).rejects.toThrow();
  await expect(
    getDoc(doc(alice.firestore, "profileKeys", alice.uid)),
  ).rejects.toThrow();
  await expect(setDoc(head, { revision: 999 })).rejects.toThrow();
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  await Promise.all(
    ids.map(async (next, i) =>
      set(
        ref(alice.database, `profileCommands/${alice.uid}/${next}`),
        await codec.seal(
          {
            kind: "profile.set",
            expectedRevision: 1,
            profile: { alias: `Alice ${i}`, portrait: "G1" },
          },
          alice.kek,
          commandContext(alice.uid, next),
        ),
      ),
    ),
  );
  const receipts = await Promise.all(ids.map((next) => receipt(alice, next)));
  expect(receipts.map((r) => r.status).sort()).toEqual([
    "accepted",
    "rejected",
  ]);
  expect(receipts.find((r) => r.status === "rejected")?.reason).toBe(
    "conflict",
  );
  expect((await getDoc(head)).get("revision")).toBe(2);
  const wrong = crypto.randomUUID();
  await set(
    ref(alice.database, `profileCommands/${alice.uid}/${wrong}`),
    await codec.seal(
      {
        kind: "profile.set",
        expectedRevision: 2,
        profile: { alias: "Forged", portrait: "G1" },
      },
      newKey(),
      commandContext(alice.uid, wrong),
    ),
  );
  expect((await receipt(alice, wrong)).status).toBe("rejected");
  expect((await getDoc(head)).get("revision")).toBe(2);
}, 60000);

import type { CampaignAction, CampaignView } from '../shared/campaign';
import { collection, getDocs } from 'firebase/firestore';
async function developer(c: Awaited<ReturnType<typeof client>>, enabled=true, refresh=true) {
  const result = await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:update', {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer owner'},
    body:JSON.stringify({localId:c.uid,customAttributes:JSON.stringify({developer:enabled})}),
  });
  if(!result.ok)throw new Error(await result.text());
  if(refresh) await c.user.getIdToken(true);
}
async function saveIdentity(c: Awaited<ReturnType<typeof client>>) {
  const id=crypto.randomUUID();
  await set(ref(c.database,`profileCommands/${c.uid}/${id}`),await provider('mock').seal({kind:'profile.set',expectedRevision:0,profile:{alias:'Commander',portrait:'G1'}},c.kek,commandContext(c.uid,id)));
  expect((await receipt(c,id)).status).toBe('accepted');
}
async function campaignCommand(c:Awaited<ReturnType<typeof client>>,gameId:string,action:CampaignAction,mode:"mock"|"real"=action.kind==='campaign.create'?action.mode:'mock',epoch=1) {
  const id=crypto.randomUUID();
  const commandKey=mode==='real'?(await httpsCallable<undefined,{kek:string}>(c.functions,'campaignCommandKey')()).data.kek:c.kek;
  const payload={kind:action.kind,envelope:await provider(mode).seal(action,commandKey,{gameId,objectId:`command:${id}`,revision:0,epoch,keyVersion:1})};
  if(mode==='real'){
    expect(payload.envelope.algorithm).toBe('AES-256-GCM');expect(payload.envelope.nonce).toHaveLength(24);expect(payload.envelope.tag).toHaveLength(32);
    expect((await c.user.getIdTokenResult()).claims.developer).toBe(true);
  }
  const ingress=ref(c.database,`${action.kind==="campaign.migrate"?"migrationCommands":["campaign.pause","campaign.resume"].includes(action.kind)?"maintenanceCommands":"commands"}/${gameId}/${c.uid}/${id}`);
  await set(ingress,payload);
  const deadline=Date.now()+(action.kind==='campaign.migrate'?120000:20000);
  while(Date.now()<deadline){
    const result=await getDoc(doc(c.firestore,'campaignReceipts',c.uid,'results',id));
    if(result.exists()){ const path=`${action.kind==='campaign.migrate'?'migrationCommands':['campaign.pause','campaign.resume'].includes(action.kind)?'maintenanceCommands':'commands'}/${gameId}/${c.uid}/${id}`;expect(result.get('requestDigest')).toBe(await commandDigest(path,payload));return {receipt:result.data(),ingress,payload};}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('No campaign receipt');
}
test('campaign authorization, create/join/CAS/recover/revocation use persisted private envelopes',async()=>{
  const a=await client(`captain${Date.now()}`), b=await client(`rival${Date.now()}`), outsider=await client(`visitor${Date.now()}`);
  await Promise.all([developer(a),developer(b)]);
  await Promise.all([saveIdentity(a),saveIdentity(b)]);
  const gameId=crypto.randomUUID();
  const create:CampaignAction={kind:'campaign.create',expectedRevision:0,name:'Real service galaxy',capacity:4,mode:'mock',development:true};
  await expect(campaignCommand(outsider,gameId,create)).rejects.toThrow();
  const made=await campaignCommand(a,gameId,create);
  expect(made.receipt.status).toBe('accepted');
  expect(made.receipt.requestDigest).toBe(await commandDigest(`commands/${gameId}/${a.uid}/${made.ingress.key}`,made.payload));
  // A real envelope may not borrow the inspectable profile key when no real ingress key exists.
  const forgedId=crypto.randomUUID();
  await set(ref(b.database,`commands/${gameId}/${b.uid}/${forgedId}`),{kind:'campaign.join',envelope:await provider('real').seal({kind:'campaign.join',expectedRevision:1,faction:'pelagic'},b.kek,{gameId,objectId:`command:${forgedId}`,revision:0,epoch:1,keyVersion:1})});
  let forgedReceipt;
  for(let attempt=0;attempt<100;attempt++){const snap=await getDoc(doc(b.firestore,'campaignReceipts',b.uid,'results',forgedId));if(snap.exists()){forgedReceipt=snap.data();break;}await new Promise(resolve=>setTimeout(resolve,100));}
  expect(forgedReceipt?.status).toBe('rejected');
  expect(forgedReceipt?.revision).toBe(1);
  await expect(set(made.ingress,made.payload)).rejects.toThrow();
  await expect(getDocs(collection(outsider.firestore,'developmentCampaigns'))).rejects.toThrow();
  expect((await httpsCallable(b.functions,'campaignKey')({gameId})).data).toEqual({joined:false});
  const joins=await Promise.all([campaignCommand(a,gameId,{kind:'campaign.join',expectedRevision:1,faction:'heliac'}),campaignCommand(b,gameId,{kind:'campaign.join',expectedRevision:1,faction:'pelagic'})]);
  expect(joins.map(r=>r.receipt.status).sort()).toEqual(['accepted','rejected']);
  const winner=joins[0].receipt.status==='accepted'?a:b;
  const loser=winner===a?b:a;
  expect(joins.find(r=>r.receipt.status==='rejected')!.receipt.reason).toBe('conflict');
  const head=doc(winner.firestore,'campaignViews',gameId,'members',winner.uid);
  const stored=(await getDoc(head)).data()!;
  const access=(await httpsCallable<{gameId:string},{joined:true,kek:string}>(winner.functions,'campaignKey')({gameId})).data;
  const ctx={gameId,objectId:`member:${winner.uid}`,revision:2,epoch:1,keyVersion:1};
  const key=await unwrap(stored.grant,access.kek,winner.uid,ctx,'mock');
  const view=await provider('mock').open<CampaignView>(stored.envelope,key,ctx);
  expect(view.stars).toHaveLength(128);
  expect(view.own.profile.alias).toBe('Commander');
  expect(JSON.stringify(view)).not.toContain('seed');
  await expect(getDoc(doc(loser.firestore,'campaignViews',gameId,'members',winner.uid))).rejects.toThrow();
  await expect(getDoc(doc(winner.firestore,'campaignStates',gameId))).rejects.toThrow();
  await expect(getDoc(doc(winner.firestore,'campaignKeys',gameId))).rejects.toThrow();
  await expect(setDoc(head,{revision:999})).rejects.toThrow();
  const membership=doc(winner.firestore,'campaignMemberships',winner.uid,'games',gameId);
  expect((await getDoc(membership)).data()).toEqual({gameId,phase:'waiting',revision:2});
  await expect(getDocs(collection(loser.firestore,'campaignMemberships',winner.uid,'games'))).rejects.toThrow();
  await expect(setDoc(membership,{gameId,phase:'active',revision:999})).rejects.toThrow();
  const left=await campaignCommand(winner,gameId,{kind:'campaign.leave',expectedRevision:2});
  expect(left.receipt.status).toBe('accepted');
  expect((await getDoc(membership)).exists()).toBe(false);
  await expect(getDoc(head)).rejects.toThrow();
  await expect(getDoc(doc(winner.firestore,'campaignViews',gameId,'members',winner.uid,'versions','2'))).rejects.toThrow();
  expect((await httpsCallable(winner.functions,'campaignKey')({gameId})).data).toEqual({joined:false});
},60000);

for (const mode of ['mock','real'] as const) test.skipIf(mode==='real' && process.env.CLUSTER_KMS_TEST!=='true')(`${mode} full roster starts atomically once with recipient-only home assignments`,async()=>{
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../functions/package.json',import.meta.url));
  const admin = require('firebase-admin/app');
  if(!admin.getApps().length)admin.initializeApp({projectId});
  const db = require('firebase-admin/firestore').getFirestore();
  const { startDueCampaign } = await import('../functions/src/campaigns');
  const players=await Promise.all(['heliac','pelagic','vesper','dracon'].map(async(faction)=>{
    const c=await client(`start-${faction}-${Date.now()}`);await developer(c);await saveIdentity(c);return c;
  }));
  const gameId=crypto.randomUUID();
  await campaignCommand(players[0],gameId,{kind:'campaign.create',expectedRevision:0,name:'Scheduled galaxy',capacity:4,development:true,mode});
  for(let i=0;i<4;i++)expect((await campaignCommand(players[i],gameId,{kind:'campaign.join',expectedRevision:i+1,faction:['heliac','pelagic','vesper','dracon'][i] as 'heliac'},mode)).receipt.status).toBe('accepted');
  const scheduled=await db.doc(`campaignStates/${gameId}`).get();
  expect(scheduled.get('phase')).toBe('scheduled');
  expect((await campaignCommand(players[0],gameId,{kind:'campaign.pause',expectedRevision:5},mode)).receipt.status).toBe('accepted');
  await startDueCampaign(gameId,scheduled.get('startAt')+1000000);
  expect((await db.doc(`campaignStates/${gameId}`).get()).get('revision')).toBe(6);
  expect((await campaignCommand(players[0],gameId,{kind:'campaign.resume',expectedRevision:6},mode)).receipt.status).toBe('accepted');
  const now=(await db.doc(`campaignStates/${gameId}`).get()).get('startAt');
  await startDueCampaign(gameId,now-1);
  expect((await db.doc(`campaignStates/${gameId}`).get()).get('revision')).toBe(7);
  await Promise.all([startDueCampaign(gameId,now),startDueCampaign(gameId,now)]);
  const active=await db.doc(`campaignStates/${gameId}`).get();
  expect(active.get('revision')).toBe(8);expect(active.get('phase')).toBe('active');
  const homes:string[]=[];
  for(const c of players){
    const stored=(await getDoc(doc(c.firestore,'campaignViews',gameId,'members',c.uid))).data()!;
    const access=(await httpsCallable<{gameId:string},{kek:string}>(c.functions,'campaignKey')({gameId})).data;
    const ctx={gameId,objectId:`member:${c.uid}`,revision:8,epoch:1,keyVersion:1};
    const key=await unwrap(stored.grant,access.kek,c.uid,ctx,mode);
    const view=await provider(mode).open<CampaignView>(stored.envelope,key,ctx);
    expect(view.holdings).toHaveLength(1);expect(view.holdings[0].orbit).toBe('You');
    expect(view.own.home).toBe(view.holdings[0].starId);homes.push(view.own.home!);
  }
  expect(new Set(homes).size).toBe(4);
},120000);


test.skipIf(process.env.CLUSTER_KMS_TEST!=='true')('live KMS campaign creation, encrypted canonical history, recipient recovery and mode rejection',async()=>{
  const a=await client(`secure-${Date.now()}`),b=await client(`secure-other-${Date.now()}`);
  await Promise.all([developer(a),developer(b)]);
  await Promise.all([saveIdentity(a),saveIdentity(b)]);
  expect((await httpsCallable(a.functions,'campaignSecurity')()).data).toEqual({realAvailable:true});
  const gameId=crypto.randomUUID();
  const created=await campaignCommand(a,gameId,{kind:'campaign.create',expectedRevision:0,name:'Managed encryption',capacity:4,development:true,mode:'real'});
  expect(created.receipt.status).toBe('accepted');
  expect(created.payload.envelope.mode).toBe('real');
  const bad=await campaignCommand(a,gameId,{kind:'campaign.join',expectedRevision:1,faction:'heliac'},'mock');
  expect(bad.receipt.status).toBe('rejected');expect(bad.receipt.reason).toBe('invalid');
  const joined=await campaignCommand(a,gameId,{kind:'campaign.join',expectedRevision:1,faction:'heliac'},'real');
  expect(joined.receipt.status).toBe('accepted');
  const access=(await httpsCallable<{gameId:string},{joined:true,kek:string,mode:string}>(a.functions,'campaignKey')({gameId})).data;
  expect(access.mode).toBe('real');
  const stored=(await getDoc(doc(a.firestore,'campaignViews',gameId,'members',a.uid))).data()!;
  const ctx={gameId,objectId:`member:${a.uid}`,revision:2,epoch:1,keyVersion:1};
  const key=await unwrap(stored.grant,access.kek,a.uid,ctx,'real');
  const view=await provider('real').open<CampaignView>(stored.envelope,key,ctx);
  expect(view.name).toBe('Managed encryption');expect(view.stars).toHaveLength(128);
  const {createRequire}=await import('node:module');
  const require=createRequire(new URL('../functions/package.json',import.meta.url));
  const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});
  const db=require('firebase-admin/firestore').getFirestore();
  const versions=await db.collection(`campaignStates/${gameId}/versions`).get();
  expect(versions.size).toBe(2);
  for(const version of versions.docs){const data=version.data();expect(data.mode).toBe('real');expect(data.canonicalKey).toBeUndefined();expect(data.protectedKey.algorithm).toBe('GCP-KMS');expect(JSON.stringify(data)).not.toContain('Managed encryption');}
  expect(versions.docs[0].get('protectedKey.ciphertext')).not.toBe(versions.docs[1].get('protectedKey.ciphertext'));
  const recipient=await db.doc(`campaignKeys/${gameId}/members/${a.uid}`).get();expect(recipient.get('kek')).toBeUndefined();expect(recipient.get('protectedKey.algorithm')).toBe('GCP-KMS');
  await expect(getDoc(doc(b.firestore,'campaignViews',gameId,'members',a.uid))).rejects.toThrow();
  await expect(getDoc(doc(a.firestore,'campaignCommandKeys',a.uid))).rejects.toThrow();
  await expect(set(joined.ingress,joined.payload)).rejects.toThrow();
  const left=await campaignCommand(a,gameId,{kind:'campaign.leave',expectedRevision:2},'real');expect(left.receipt.status).toBe('accepted');
  await expect(getDoc(doc(a.firestore,'campaignViews',gameId,'members',a.uid,'versions','2'))).rejects.toThrow();
  expect((await httpsCallable(a.functions,'campaignKey')({gameId})).data).toEqual({joined:false});
},90000);

test('upgrading a legacy mock campaign retains its historical canonical key',async()=>{
  const c=await client(`legacy-key-${Date.now()}`);await developer(c);await saveIdentity(c);
  const gameId=crypto.randomUUID();
  await campaignCommand(c,gameId,{kind:'campaign.create',expectedRevision:0,name:'Legacy history',capacity:4,development:true,mode:'mock'});
  const {createRequire}=await import('node:module');const require=createRequire(new URL('../functions/package.json',import.meta.url));
  const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});
  const {getFirestore,FieldValue}=require('firebase-admin/firestore');const db=getFirestore();
  const head=db.doc(`campaignStates/${gameId}`),version=head.collection('versions').doc('1');
  const before=await head.get(),legacyKey=before.get('canonicalKey');
  // Reproduce the deployed pre-per-version-key record shape, not fabricated gameplay.
  await head.update({canonicalKey:FieldValue.delete()});await version.update({canonicalKey:FieldValue.delete()});
  expect((await campaignCommand(c,gameId,{kind:'campaign.join',expectedRevision:1,faction:'heliac'})).receipt.status).toBe('accepted');
  const retained=await db.doc(`campaignKeys/${gameId}`).get();expect(retained.get('legacyCanonicalKey')).toBe(legacyKey);
  expect(retained.get('key')).not.toBe(legacyKey);
  const history=await provider('mock').open<{name:string}>(before.get('envelope'),retained.get('legacyCanonicalKey'),{gameId,objectId:'canonical',revision:1,epoch:1,keyVersion:1});expect(history.name).toBe('Legacy history');
  await campaignCommand(c,gameId,{kind:'campaign.leave',expectedRevision:2});
  expect((await db.doc(`campaignKeys/${gameId}`).get()).get('legacyCanonicalKey')).toBe(legacyKey);
},60000);

test('maintenance admission is member/developer-only, atomic, replay-safe and persistent',async()=>{
 const a=await client(`maintenance-${Date.now()}`),b=await client(`maintenance-outsider-${Date.now()}`);
 await Promise.all([developer(a),developer(b)]);await Promise.all([saveIdentity(a),saveIdentity(b)]);
 const gameId=crypto.randomUUID();await campaignCommand(a,gameId,{kind:'campaign.create',expectedRevision:0,name:'Paused service',capacity:4,mode:'mock',development:true});
 await campaignCommand(a,gameId,{kind:'campaign.join',expectedRevision:1,faction:'heliac'});
 expect((await campaignCommand(b,gameId,{kind:'campaign.pause',expectedRevision:2})).receipt.reason).toBe('permission');
 const pair=await Promise.all([campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:2}),campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:2})]);
 expect(pair.map(x=>x.receipt.status).sort()).toEqual(['accepted','rejected']);
 const accepted=pair.find(x=>x.receipt.status==='accepted')!;
 await expect(set(accepted.ingress,accepted.payload)).rejects.toThrow();
 const directory=doc(a.firestore,'developmentCampaigns',gameId);expect((await getDoc(directory)).get('pausedAt')).toBeGreaterThan(0);expect((await getDoc(directory)).get('revision')).toBe(3);
 expect((await campaignCommand(b,gameId,{kind:'campaign.join',expectedRevision:3,faction:'pelagic'})).receipt.reason).toBe('paused');
 expect((await campaignCommand(a,gameId,{kind:'campaign.resume',expectedRevision:3})).receipt.status).toBe('accepted');
 expect((await getDoc(directory)).get('pausedAt')).toBeNull();
 expect((await campaignCommand(b,gameId,{kind:'campaign.join',expectedRevision:4,faction:'pelagic'})).receipt.status).toBe('accepted');
 await developer(a,false,false);
 expect((await campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:5})).receipt.reason).toBe('permission');
 await a.user.getIdToken(true);
 await expect(campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:5})).rejects.toThrow();
},60000);

test.skipIf(process.env.CLUSTER_KMS_TEST!=='true')('migration fences history, preserves recipients across repeated switches, and rolls back failed verification',async()=>{
 const a=await client(`migrate-${Date.now()}`),b=await client(`migration-former-${Date.now()}`);
 await Promise.all([developer(a),developer(b)]);await Promise.all([saveIdentity(a),saveIdentity(b)]);
 const {createRequire}=await import('node:module');const require=createRequire(new URL('../functions/package.json',import.meta.url));const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});const db=require('firebase-admin/firestore').getFirestore();
 const gameId=crypto.randomUUID(),untouched=crypto.randomUUID();
 for(const id of [gameId,untouched])await campaignCommand(a,id,{kind:'campaign.create',expectedRevision:0,name:'Retained migration',capacity:4,mode:'mock',development:true});
 await campaignCommand(a,gameId,{kind:'campaign.join',expectedRevision:1,faction:'heliac'});
 await campaignCommand(b,gameId,{kind:'campaign.join',expectedRevision:2,faction:'pelagic'});
 await campaignCommand(b,gameId,{kind:'campaign.leave',expectedRevision:3});
 await campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:4});
 const oldAccess=(await httpsCallable<{gameId:string},{kek:string}>(a.functions,'campaignKey')({gameId})).data;
 const head=db.doc(`campaignStates/${gameId}`);
 const pending=Promise.all([campaignCommand(a,gameId,{kind:'campaign.migrate',expectedRevision:5,targetMode:'real'}),campaignCommand(a,gameId,{kind:'campaign.migrate',expectedRevision:5,targetMode:'real'})]);
 const deadline=Date.now()+20000;while(!(await head.get()).get('migration')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 expect((await head.get()).get('migration')).toBeString();
 await expect(getDocs(collection(a.firestore,'campaignViews',gameId,'members',a.uid,'epochs','2','versions'))).rejects.toThrow();
 await expect(setDoc(doc(a.firestore,'campaignMigrationTasks','forged'),{jobId:'forged',sequence:0})).rejects.toThrow();
 expect((await campaignCommand(a,gameId,{kind:'campaign.resume',expectedRevision:5})).receipt.reason).toBe('migrating');
 const results=await pending;expect(results.map(r=>r.receipt.status).sort()).toEqual(['accepted','rejected']);
 expect(results.find(r=>r.receipt.status==='rejected')!.receipt.reason).toBe('conflict');
 const active=await head.get();expect(active.get('envelope.epoch')).toBe(2);expect(active.get('mode')).toBe('real');expect(active.get('revision')).toBe(6);expect(active.get('migration')).toBeUndefined();
 expect((await db.doc(`campaignStates/${untouched}`).get()).get('revision')).toBe(1);
 expect((await head.collection('epochs').doc('2').collection('versions').get()).size).toBe(6);
 const access=(await httpsCallable<{gameId:string},{kek:string;mode:string;epoch:number}>(a.functions,'campaignKey')({gameId})).data;expect(access.mode).toBe('real');expect(access.epoch).toBe(2);
 expect((await getDocs(collection(a.firestore,'campaignViews',gameId,'members',a.uid,'epochs','2','versions'))).size).toBe(5);
 const view=(await getDoc(doc(a.firestore,'campaignViews',gameId,'members',a.uid))).data()!;const ctx={gameId,objectId:`member:${a.uid}`,revision:6,epoch:2,keyVersion:1};
 const key=await unwrap(view.grant,access.kek,a.uid,ctx,'real');expect((await provider('real').open<CampaignView>(view.envelope,key,ctx)).name).toBe('Retained migration');
 await expect(unwrap(view.grant,oldAccess.kek,a.uid,ctx,'real')).rejects.toThrow();
 await expect(getDoc(doc(a.firestore,'campaignViews',gameId,'members',a.uid,'versions','5'))).rejects.toThrow();
 await expect(getDoc(doc(b.firestore,'campaignViews',gameId,'members',b.uid,'epochs','2','versions','3'))).rejects.toThrow();
 expect((await campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:6},'real',1)).receipt.status).toBe('rejected');
 await campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:6},'real',2);
 expect((await campaignCommand(a,gameId,{kind:'campaign.migrate',expectedRevision:7,targetMode:'mock'},'real',2)).receipt.status).toBe('accepted');
 expect((await head.get()).get('envelope.epoch')).toBe(3);expect((await head.get()).get('mode')).toBe('mock');
 expect((await campaignCommand(b,gameId,{kind:'campaign.join',expectedRevision:8,faction:'pelagic'},'mock',3)).receipt.status).toBe('accepted');
 let failureRevision=9;
 for(let cycle=0;cycle<6;cycle++){await campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:failureRevision++},'mock',3);await campaignCommand(a,gameId,{kind:'campaign.resume',expectedRevision:failureRevision++},'mock',3);}
 await campaignCommand(a,gameId,{kind:'campaign.pause',expectedRevision:failureRevision++},'mock',3);
 const historical=head.collection('epochs').doc('3').collection('versions').doc('9'),original=(await historical.get()).get('envelope.tag');await historical.update({'envelope.tag':'0'.repeat(64)});
 const failed=await campaignCommand(a,gameId,{kind:'campaign.migrate',expectedRevision:failureRevision,targetMode:'real'},'mock',3);expect(failed.receipt.reason).toBe('migration-failed');
 expect((await head.get()).get('mode')).toBe('mock');expect((await head.get()).get('envelope.epoch')).toBe(3);expect((await head.get()).get('revision')).toBe(failureRevision);expect((await head.get()).get('migration')).toBeUndefined();
 expect((await getDoc(doc(a.firestore,'developmentCampaigns',gameId))).get('pausedAt')).toBeGreaterThan(0);
 const failedJob=db.doc(`campaignMigrations/${failed.ingress.key}`);const cleanupDeadline=Date.now()+20000;while((await failedJob.get()).get('phase')!=='failed'&&Date.now()<cleanupDeadline)await new Promise(r=>setTimeout(r,100));
 expect((await failedJob.get()).get('phase')).toBe('failed');expect((await failedJob.get()).get('verified')).toBeGreaterThanOrEqual(10);expect((await head.collection('epochs').doc('4').collection('versions').get()).empty).toBe(true);
 await historical.update({'envelope.tag':original});
 const retry=await campaignCommand(a,gameId,{kind:'campaign.migrate',expectedRevision:failureRevision,targetMode:'real'},'mock',3);expect(retry.receipt.status).toBe('accepted');expect((await head.get()).get('envelope.epoch')).toBe(5);
 const accepted=results.find(r=>r.receipt.status==='accepted')!;const jobId=accepted.ingress.key!;
 await db.doc(`campaignMigrationTasks/replayed-${crypto.randomUUID()}`).set({jobId,sequence:0});await new Promise(r=>setTimeout(r,300));expect((await head.get()).get('revision')).toBe(failureRevision+1);
},240000);

test.skipIf(process.env.CLUSTER_KMS_TEST!=='true')('expired migration lease recovery fences stale workers and isolates delayed cleanup from a successful epoch',async()=>{
 const a=await client(`fault-owner-${Date.now()}`),b=await client(`fault-former-${Date.now()}`);
 await Promise.all([developer(a),developer(b)]);await Promise.all([saveIdentity(a),saveIdentity(b)]);
 const {createRequire}=await import('node:module');const require=createRequire(new URL('../functions/package.json',import.meta.url));const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});const db=require('firebase-admin/firestore').getFirestore();
 const migration=await import('../functions/src/campaign-migration');const {unprotect}=await import('../functions/src/key-protection');
 const id=crypto.randomUUID(),head=db.doc(`campaignStates/${id}`);
 await campaignCommand(a,id,{kind:'campaign.create',expectedRevision:0,name:'Lease recovery',capacity:4,mode:'mock',development:true});
 await campaignCommand(a,id,{kind:'campaign.join',expectedRevision:1,faction:'heliac'});await campaignCommand(b,id,{kind:'campaign.join',expectedRevision:2,faction:'pelagic'});await campaignCommand(b,id,{kind:'campaign.leave',expectedRevision:3});
 let revision=4;for(let i=0;i<6;i++){await campaignCommand(a,id,{kind:'campaign.pause',expectedRevision:revision++});await campaignCommand(a,id,{kind:'campaign.resume',expectedRevision:revision++});}await campaignCommand(a,id,{kind:'campaign.pause',expectedRevision:revision++});
 const sourceCanonical=await head.collection('versions').get();expect(sourceCanonical.size).toBeGreaterThan(10);
 const memberIds=(await db.collection(`campaignViews/${id}/members`).get()).docs.map((d:any)=>d.id).sort();expect(memberIds).toEqual([a.uid,b.uid].sort());
 const sourceHistories=new Map<string,{key:string;records:any[]}>();for(const uid of memberIds)sourceHistories.set(uid,{key:(await db.doc(`campaignKeys/${id}/members/${uid}`).get()).get('kek'),records:(await db.collection(`campaignViews/${id}/members/${uid}/versions`).get()).docs});
 // Fault control affects only event delivery in this test process. All reads, writes,
 // lease checks and transactions still execute against the real Firestore emulator.
 const original=db.runTransaction.bind(db);
 const delivery=spyOn(db,'runTransaction').mockImplementation((update:any,options:any)=>original((tx:any)=>update(new Proxy(tx,{get(target,property){
  if(property==='create')return (ref:any,data:any)=>target.create(ref.path.startsWith('campaignMigrationTasks/')?db.doc(`campaignMigrationFaultTasks/${ref.id}`):ref,data);
  const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
 }})),options));
 const begin=async(targetMode:'mock'|'real')=>{
  const state=await head.get(),mode=state.get('mode') as 'mock'|'real',epoch=state.get('envelope.epoch'),commandId=crypto.randomUUID();
  const kek=mode==='mock'?a.kek:(await httpsCallable<undefined,{kek:string}>(a.functions,'campaignCommandKey')()).data.kek;
  const payload={kind:'campaign.migrate',envelope:await provider(mode).seal({kind:'campaign.migrate',expectedRevision:state.get('revision'),targetMode},kek,{gameId:id,objectId:`command:${commandId}`,revision:0,epoch,keyVersion:1})};
  await migration.processCampaignMigration.run({params:{gameId:id,uid:a.uid,commandId},data:{val:()=>payload}} as never);
  return db.doc(`campaignMigrations/${commandId}`);
 };
 const drive=async(ref:any,stopAtCleanup=false)=>{
  for(let n=0;n<100;n++){const job=(await ref.get()).data();if(['complete','failed'].includes(job.phase)||(stopAtCleanup&&job.phase==='cleanup'))return job;
   const claimed=await migration.claim(ref.id,job.sequence);expect(claimed).not.toBeNull();await migration.executeClaimedMigration(claimed!);
  }throw new Error('Migration failed to reach its terminal phase');
 };
 const gameplay=(value:any)=>{const {mode,encryptionEpoch,mockExposed,...rest}=value;return rest;};
 try{
  console.info('Fault test: admission');
  const first=await begin('real');const stale=await migration.claim(first.id,0);expect(stale).not.toBeNull();
  // The first worker dies after claiming. Advancing lease time replaces a two-minute wait.
  console.info('Fault test: expire and reclaim');
  await first.update({'lease.until':Date.now()-1});const replacement=await migration.claim(first.id,0);expect(replacement!.lease!.id).not.toBe(stale!.lease!.id);
  console.info('Fault test: stale page must be fenced');
  let staleWrite:unknown;try{await migration.canonicalPage(stale!);}catch(error){staleWrite=error;}expect(staleWrite).toBeInstanceOf(Error);expect((staleWrite as Error).message).toBe('Lost migration fence');
  console.info('Fault test: stale activation and abort');
  let staleActivation:unknown;try{await migration.activate(stale!);}catch(error){staleActivation=error;}expect(staleActivation).toBeInstanceOf(Error);expect((staleActivation as Error).message).toBe('Lost activation fence');await migration.abort(stale!);
  expect((await first.get()).get('lease.id')).toBe(replacement!.lease!.id);expect((await db.doc(`campaignReceipts/${a.uid}/results/${first.id}`).get()).exists).toBe(false);
  expect((await head.collection('epochs').doc('2').collection('versions').get()).empty).toBe(true);
  console.info('Fault test: replacement progress');
  await migration.executeClaimedMigration(replacement!);expect((await first.get()).get('verified')).toBe(10);
  console.info('Fault test: finish replacement');
  await drive(first);expect((await head.get()).get('revision')).toBe(revision+1);expect((await head.get()).get('envelope.epoch')).toBe(2);
  await migration.activate(stale!);await migration.abort(stale!);expect(await migration.claim(first.id,0)).toBeNull();expect((await head.get()).get('revision')).toBe(revision+1);
  expect((await db.collection(`campaignReceipts/${a.uid}/results`).where('gameId','==',id).where('epoch','==',2).get()).size).toBe(1);
  const targetCanonical=await head.collection('epochs').doc('2').collection('versions').get();expect(targetCanonical.size).toBe(sourceCanonical.size+1);
  console.info('Fault test: compare complete history');
  for(const source of sourceCanonical.docs){const old=source.data(),next=targetCanonical.docs.find((d:any)=>d.id===source.id).data(),rev=old.revision;
   const oldState=await provider('mock').open(old.envelope,old.canonicalKey,{gameId:id,objectId:'canonical',revision:rev,epoch:1,keyVersion:1});
   const newKey=await unprotect(next.protectedKey,`canonical:${id}:${rev}:2`);const newState=await provider('real').open(next.envelope,newKey,{gameId:id,objectId:'canonical',revision:rev,epoch:2,keyVersion:1});expect(gameplay(newState)).toEqual(gameplay(oldState));
  }
  expect((await db.collection(`campaignKeys/${id}/epochs/2/members`).get()).docs.map((d:any)=>d.id).sort()).toEqual(memberIds);
  for(const uid of memberIds){const original=sourceHistories.get(uid)!;const records=await db.collection(`campaignViews/${id}/members/${uid}/epochs/2/versions`).get();expect(records.size).toBe(original.records.length+(uid===a.uid?1:0));const protectedKey=(await db.doc(`campaignKeys/${id}/epochs/2/members/${uid}`).get()).get('protectedKey');const kek=await unprotect(protectedKey,`recipient:${id}:${uid}:2`);
   for(const oldRecord of original.records){const old=oldRecord.data(),next=records.docs.find((d:any)=>d.id===oldRecord.id).data(),oldCtx={gameId:id,objectId:`member:${uid}`,revision:old.revision,epoch:1,keyVersion:1},newCtx={...oldCtx,epoch:2};
    const oldKey=await unwrap(old.grant,original.key,uid,oldCtx,'mock'),newKey=await unwrap(next.grant,kek,uid,newCtx,'real');expect(gameplay(await provider('real').open(next.envelope,newKey,newCtx))).toEqual(gameplay(await provider('mock').open(old.envelope,oldKey,oldCtx)));
   }
  }
  await campaignCommand(a,id,{kind:'campaign.pause',expectedRevision:revision+1},'real',2);
  const damaged=head.collection('epochs').doc('2').collection('versions').doc('9'),tag=(await damaged.get()).get('envelope.tag');await damaged.update({'envelope.tag':'0'.repeat(32)});
  console.info('Fault test: failed attempt before later epoch');
  const failed=await begin('mock');const failedJob=await drive(failed,true);expect(failedJob.phase).toBe('cleanup');expect(failedJob.verified).toBeGreaterThanOrEqual(10);expect((await head.collection('epochs').doc('3').collection('versions').get()).size).toBeGreaterThanOrEqual(10);
  await damaged.update({'envelope.tag':tag});const successful=await begin('mock');await drive(successful);const beforeCleanup=(await head.get()).data();expect(beforeCleanup.envelope.epoch).toBe(4);
  const successfulHistory=await head.collection('epochs').doc('4').collection('versions').get();await drive(failed);expect((await head.get()).data()).toEqual(beforeCleanup);expect((await head.collection('epochs').doc('4').collection('versions').get()).size).toBe(successfulHistory.size);expect((await head.collection('epochs').doc('3').collection('versions').get()).empty).toBe(true);
  expect((await db.doc(`campaignReceipts/${a.uid}/results/${successful.id}`).get()).get('status')).toBe('accepted');expect((await db.doc(`campaignReceipts/${a.uid}/results/${failed.id}`).get()).get('reason')).toBe('migration-failed');
 }finally{delivery.mockRestore();}
},240000);

test.skipIf(process.env.CLUSTER_KMS_TEST==='true')('unconfigured real migration fails explicitly without changing the paused campaign',async()=>{
 const c=await client(`unconfigured-migration-${Date.now()}`);await developer(c);await saveIdentity(c);const id=crypto.randomUUID();
 await campaignCommand(c,id,{kind:'campaign.create',expectedRevision:0,name:'Explicit unavailable',capacity:4,mode:'mock',development:true});await campaignCommand(c,id,{kind:'campaign.join',expectedRevision:1,faction:'heliac'});await campaignCommand(c,id,{kind:'campaign.pause',expectedRevision:2});
 const before=(await getDoc(doc(c.firestore,'developmentCampaigns',id))).data();
 expect((await campaignCommand(c,id,{kind:'campaign.migrate',expectedRevision:3,targetMode:'real'})).receipt.reason).toBe('unavailable');
 expect((await campaignCommand(c,id,{kind:'campaign.migrate',expectedRevision:3,targetMode:'mock'})).receipt.reason).toBe('invalid');
 expect((await getDoc(doc(c.firestore,'developmentCampaigns',id))).data()).toEqual(before);
},30000);

test('a command ID reused across campaigns retains its original bound receipt and cannot mutate the other campaign',async()=>{
 const c=await client(`collision${Date.now()}`);await developer(c);await saveIdentity(c);
 const first=crypto.randomUUID(), second=crypto.randomUUID();
 const action:CampaignAction={kind:'campaign.create',expectedRevision:0,name:'Original request',capacity:4,mode:'mock',development:true};
 const made=await campaignCommand(c,first,action),id=made.ingress.key!;
 const payload={kind:action.kind,envelope:await provider('mock').seal({...action,name:'Different request'},c.kek,{gameId:second,objectId:`command:${id}`,revision:0,epoch:1,keyVersion:1})};
 const ingress=`commands/${second}/${c.uid}/${id}`;await set(ref(c.database,ingress),payload);
 const {createRequire}=await import('node:module');const require=createRequire(new URL('../functions/package.json',import.meta.url));const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});
 const {processCampaign}=await import('../functions/src/campaigns');
 await processCampaign.run({params:{gameId:second,uid:c.uid,commandId:id},data:{val:()=>payload}} as never);
 const retained=(await getDoc(doc(c.firestore,'campaignReceipts',c.uid,'results',id))).data()!;
 expect(retained).toEqual(made.receipt);expect(()=>verifyReceipt(retained,'not-original')).toThrow('does not match');
 const digest=await commandDigest(ingress,payload);expect(retained.requestDigest).not.toBe(digest);expect(()=>verifyReceipt(retained,digest)).toThrow('does not match');
 expect((await getDoc(doc(c.firestore,'developmentCampaigns',second))).exists()).toBe(false);
 expect((await getDoc(doc(c.firestore,'developmentCampaigns',first))).get('revision')).toBe(1);
},30000);

test('scheduled start isolates a corrupt campaign and recovers after lost completion acknowledgement',async()=>{
  const { createRequire }=await import('node:module');
  const require=createRequire(new URL('../functions/package.json',import.meta.url));
  const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});
  const db=require('firebase-admin/firestore').getFirestore();
  const {sweepScheduledCampaigns,startDueCampaign}=await import('../functions/src/campaigns');
  const players=await Promise.all(['heliac','pelagic','vesper','dracon'].map(async faction=>{const c=await client(`recovery-${faction}-${Date.now()}`);await developer(c);await saveIdentity(c);return c;}));
  const ids=Array.from({length:26},()=>crypto.randomUUID()).sort();
  for(const id of ids){
    expect((await campaignCommand(players[0],id,{kind:'campaign.create',expectedRevision:0,name:'Recovery constellation',capacity:4,development:true,mode:'mock'})).receipt.status).toBe('accepted');
    for(let i=0;i<4;i++)expect((await campaignCommand(players[i],id,{kind:'campaign.join',expectedRevision:i+1,faction:['heliac','pelagic','vesper','dracon'][i] as 'heliac'})).receipt.status).toBe('accepted');
  }
  const first=db.doc(`campaignStates/${ids[0]}`),second=db.doc(`campaignStates/${ids[1]}`);
  const saved=(await first.get()).data();
  const now=Math.max(saved.startAt,(await second.get()).get('startAt'))+3*900000;
  // Storage fault, not an alternate service: all commands, transitions and publications are real.
  await first.update({envelope:{...saved.envelope,ciphertext:'corrupted'}});
  try {
    const sweep=await sweepScheduledCampaigns(now);
    expect(sweep.failed).toContain(ids[0]);
    expect((await first.get()).get('revision')).toBe(5);
    expect((await second.get()).get('revision')).toBe(6);
    expect((await second.get()).get('phase')).toBe('active');
    expect((await db.doc(`campaignStates/${ids[25]}`).get()).get('phase')).toBe('active');
    expect(sweep.inspected).toBeGreaterThanOrEqual(26);
  }finally{await first.set(saved);}
  // A worker stops after staging every write but before Firestore commits any of them.
  const transaction=db.runTransaction.bind(db);
  const beforeCommit=spyOn(db,'runTransaction').mockImplementation((callback: (tx:unknown)=>Promise<unknown>)=>transaction(async(tx:unknown)=>{
    await callback(tx);throw new Error('Stopped before commit');
  }));
  try {
    let failure:unknown;try{await startDueCampaign(ids[0],now);}catch(error){failure=error;}
    expect((failure as Error).message).toBe('Stopped before commit');
  }finally{beforeCommit.mockRestore();}
  expect((await first.get()).data()).toEqual(saved);
  expect((await db.collection(`campaignStates/${ids[0]}/versions`).get()).size).toBe(5);
  for(const c of players)expect((await getDoc(doc(c.firestore,'campaignViews',ids[0],'members',c.uid))).get('envelope.revision')).toBe(5);
  // The transaction commits, then its caller dies before acknowledging completion.
  // Retry must observe the committed phase/revision, not assign homes again.
  const original=db.runTransaction.bind(db);
  let lost=false;
  const fault=spyOn(db,'runTransaction').mockImplementation(async(...args:unknown[])=>{
    const result=await original(...args);
    if(!lost){lost=true;throw new Error('Lost scheduler completion');}
    return result;
  });
  try {
    let failure:unknown;try{await startDueCampaign(ids[0],now);}catch(error){failure=error;}
    expect(failure).toBeInstanceOf(Error);expect((failure as Error).message).toBe('Lost scheduler completion');
  }finally{fault.mockRestore();}
  const committed=(await first.get()).data();
  expect(committed.phase).toBe('active');expect(committed.revision).toBe(6);expect(committed.startAt).toBe(saved.startAt);
  await Promise.all([sweepScheduledCampaigns(now+900000),startDueCampaign(ids[0],now+900000)]);
  expect((await first.get()).data()).toEqual(committed);
  for(const id of ids){
    const history=await db.collection(`campaignStates/${id}/versions`).get();
    expect(history.size).toBe(6);
    const homes:string[]=[];
    for(const c of players){
      const stored=(await getDoc(doc(c.firestore,'campaignViews',id,'members',c.uid))).data()!;
      const access=(await httpsCallable<{gameId:string},{kek:string}>(c.functions,'campaignKey')({gameId:id})).data;
      const ctx={gameId:id,objectId:`member:${c.uid}`,revision:6,epoch:1,keyVersion:1};
      const key=await unwrap(stored.grant,access.kek,c.uid,ctx,'mock');
      const view=await provider('mock').open<CampaignView>(stored.envelope,key,ctx);
      expect(view.phase).toBe('active');expect(view.holdings).toHaveLength(1);homes.push(view.own.home!);
      expect((await getDoc(doc(c.firestore,'campaignMemberships',c.uid,'games',id))).get('revision')).toBe(6);
    }
    expect(new Set(homes).size).toBe(4);
  }
},120000);
