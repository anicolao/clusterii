import { afterAll, expect, test } from "bun:test";
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
  expect((await receipt(alice, id)).status).toBe("accepted");
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
async function developer(c: Awaited<ReturnType<typeof client>>) {
  const result = await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:update', {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer owner'},
    body:JSON.stringify({localId:c.uid,customAttributes:JSON.stringify({developer:true})}),
  });
  if(!result.ok)throw new Error(await result.text());
  await c.user.getIdToken(true);
}
async function saveIdentity(c: Awaited<ReturnType<typeof client>>) {
  const id=crypto.randomUUID();
  await set(ref(c.database,`profileCommands/${c.uid}/${id}`),await provider('mock').seal({kind:'profile.set',expectedRevision:0,profile:{alias:'Commander',portrait:'G1'}},c.kek,commandContext(c.uid,id)));
  expect((await receipt(c,id)).status).toBe('accepted');
}
async function campaignCommand(c:Awaited<ReturnType<typeof client>>,gameId:string,action:CampaignAction) {
  const id=crypto.randomUUID();
  const payload={kind:action.kind,envelope:await provider('mock').seal(action,c.kek,{gameId,objectId:`command:${id}`,revision:0,epoch:1,keyVersion:1})};
  const ingress=ref(c.database,`commands/${gameId}/${c.uid}/${id}`);
  await set(ingress,payload);
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
    const result=await getDoc(doc(c.firestore,'campaignReceipts',c.uid,'results',id));
    if(result.exists())return {receipt:result.data(),ingress,payload};
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('No campaign receipt');
}
test('campaign authorization, create/join/CAS/recover/revocation use persisted private envelopes',async()=>{
  const a=await client(`captain${Date.now()}`), b=await client(`rival${Date.now()}`), outsider=await client(`visitor${Date.now()}`);
  await Promise.all([developer(a),developer(b),saveIdentity(a),saveIdentity(b)]);
  const gameId=crypto.randomUUID();
  const create:CampaignAction={kind:'campaign.create',expectedRevision:0,name:'Real service galaxy',capacity:4,mode:'mock',development:true};
  await expect(campaignCommand(outsider,gameId,create)).rejects.toThrow();
  const made=await campaignCommand(a,gameId,create);
  expect(made.receipt.status).toBe('accepted');
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

test('full roster starts atomically once with recipient-only home assignments',async()=>{
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
  await campaignCommand(players[0],gameId,{kind:'campaign.create',expectedRevision:0,name:'Scheduled galaxy',capacity:4,development:true,mode:'mock'});
  for(let i=0;i<4;i++)expect((await campaignCommand(players[i],gameId,{kind:'campaign.join',expectedRevision:i+1,faction:['heliac','pelagic','vesper','dracon'][i] as 'heliac'})).receipt.status).toBe('accepted');
  const scheduled=await db.doc(`campaignStates/${gameId}`).get();
  expect(scheduled.get('phase')).toBe('scheduled');
  const now=scheduled.get('startAt');
  await startDueCampaign(gameId,now-1);
  expect((await db.doc(`campaignStates/${gameId}`).get()).get('revision')).toBe(5);
  await Promise.all([startDueCampaign(gameId,now),startDueCampaign(gameId,now)]);
  const active=await db.doc(`campaignStates/${gameId}`).get();
  expect(active.get('revision')).toBe(6);expect(active.get('phase')).toBe('active');
  const homes:string[]=[];
  for(const c of players){
    const stored=(await getDoc(doc(c.firestore,'campaignViews',gameId,'members',c.uid))).data()!;
    const access=(await httpsCallable<{gameId:string},{kek:string}>(c.functions,'campaignKey')({gameId})).data;
    const ctx={gameId,objectId:`member:${c.uid}`,revision:6,epoch:1,keyVersion:1};
    const key=await unwrap(stored.grant,access.kek,c.uid,ctx,'mock');
    const view=await provider('mock').open<CampaignView>(stored.envelope,key,ctx);
    expect(view.holdings).toHaveLength(1);expect(view.holdings[0].orbit).toBe('You');
    expect(view.own.home).toBe(view.holdings[0].starId);homes.push(view.own.home!);
  }
  expect(new Set(homes).size).toBe(4);
},60000);
