// Single bounded real-service cardinality comparison; no canonical state injection.
import {expect} from 'bun:test';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithCredential,GoogleAuthProvider} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,ref,set} from 'firebase/database';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,collection,getDocs,onSnapshot} from 'firebase/firestore';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';
import {provider} from '../shared/crypto';
import {commandContext} from '../shared/profile';
import {commandDigest} from '../shared/command-receipt';
import type {CampaignAction} from '../shared/campaign';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {settlementTiming} from '../tests/browser/story-helpers/settlement-timing';
const projectId='demo-clusterii';const clients:ReturnType<typeof initializeApp>[]=[];
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
async function developer(c: Awaited<ReturnType<typeof client>>, enabled=true, refresh=true) {
  const result = await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:update', {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer owner'},
    body:JSON.stringify({localId:c.uid,customAttributes:JSON.stringify({developer:enabled})}),
  });
  if(!result.ok)throw new Error(await result.text());
  if(refresh) await c.user.getIdToken(true);
}
async function receipt(c:Awaited<ReturnType<typeof client>>,id:string){
 const deadline=Date.now()+20000;while(Date.now()<deadline){const r=await getDoc(doc(c.firestore,'profiles',c.uid,'receipts',id));if(r.exists())return r.data();await new Promise(r=>setTimeout(r,100));}throw Error('Profile receipt deadline');
}
async function saveIdentity(c: Awaited<ReturnType<typeof client>>) {
  const id=crypto.randomUUID();
  await set(ref(c.database,`profileCommands/${c.uid}/${id}`),await provider('mock').seal({kind:'profile.set',expectedRevision:0,profile:{alias:'Commander',portrait:'G1'}},c.kek,commandContext(c.uid,id)));
  expect((await receipt(c,id)).status).toBe('accepted');
}
async function campaignCommand(c:Awaited<ReturnType<typeof client>>,gameId:string,action:CampaignAction,mode:"mock"|"real"=action.kind==='campaign.create'?action.mode:'mock',epoch=1,commandId:string=crypto.randomUUID()) {
  const id=commandId;
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

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:18080'||process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:19000'||!process.argv[2])throw Error('Explicit loopback/output required');
const output=process.argv[2],result:any={scope:'Real development directory cardinality; local service only',budget:{totalMs:180000,batchMs:30000,ticks:200,additionalCampaigns:32},phases:[]};
const require=createRequire(new URL('../functions/package.json',import.meta.url));const admin=require('firebase-admin/app');if(!admin.getApps().length)admin.initializeApp({projectId});const db=require('firebase-admin/firestore').getFirestore();
const {startDueCampaign}=require('./lib/functions/src/campaigns.js');const {settleCampaignTicks}=require('./lib/functions/src/production.js');
let unsubscribe=()=>{};let phase='setup';const total=setTimeout(()=>{result.status='failed';result.boundary=phase;writeFileSync(output+'.json',JSON.stringify(result,null,2));process.exit(1);},180000);
const waitFor=async(check:()=>boolean)=>{const end=Date.now()+10000;while(!check()){if(Date.now()>end)throw Error('Authorized listener deadline');await new Promise(r=>setTimeout(r,50));}};
try{
 const players=[];for(let i=0;i<4;i++){const c=await client('cardinality-'+i+'-'+crypto.randomUUID());await developer(c);await saveIdentity(c);players.push(c);}
 const [owner,peer]=players;if(!(await getDocs(collection(owner.firestore,'developmentCampaigns'))).empty)throw Error('Fresh owned emulator required');
 let observed:any[]=[],listenerError=false,deliveries=0;
 unsubscribe=onSnapshot(collection(owner.firestore,'developmentCampaigns'),s=>{observed=s.docs.map(d=>({id:d.id,...d.data()}));deliveries++;},()=>{listenerError=true;});
 const id=crypto.randomUUID();const create=async(gameId:string)=>{expect((await campaignCommand(owner,gameId,{kind:'campaign.create',expectedRevision:0,name:'Directory comparison',capacity:4,mode:'mock',development:true})).receipt.status).toBe('accepted');};
 await create(id);for(const [i,faction] of ['heliac','pelagic','vesper','dracon'].entries())expect((await campaignCommand(players[i],id,{kind:'campaign.join',expectedRevision:i+1,faction:faction as any})).receipt.status).toBe('accepted');
 const scheduled=await getDoc(doc(owner.firestore,'developmentCampaigns',id));const start=scheduled.get('startAt');expect(typeof start).toBe('number');await startDueCampaign(id,start);
 for(const [label,tick,cardinality] of [['sparse',100,1],['dense',200,33]] as const){
  if(label==='dense')for(let i=0;i<32;i++)await create(crypto.randomUUID());
  await waitFor(()=>observed.length===cardinality);expect(listenerError).toBe(false);phase=label;
  const timing=settlementTiming(db,output+'-'+label+'.jsonl');const began=performance.now();let timedOut=false;const deadline=setTimeout(()=>{timedOut=true;result.status='failed';result.boundary=label;writeFileSync(output+'.json',JSON.stringify(result,null,2));process.exit(1);},30000);
  let count=0;try{await timing.span('batch',async()=>{let n;do{n=await settleCampaignTicks(id,()=>start+tick*900000);count+=n;}while(n===96);});}finally{clearTimeout(deadline);}
  expect(timedOut).toBe(false);expect(count).toBe(100);const elapsedMs=performance.now()-began;
  const own=await getDoc(doc(owner.firestore,'campaignViews',id,'members',owner.uid));expect(own.exists()).toBe(true);await expect(getDoc(doc(peer.firestore,'campaignViews',id,'members',owner.uid))).rejects.toThrow();
  const directory=await getDoc(doc(owner.firestore,'developmentCampaigns',id));await waitFor(()=>observed.some(d=>d.id===id&&d.revision===directory.get('revision')));
  expect(await timing.span('repeat',()=>settleCampaignTicks(id,()=>start+tick*900000))).toBe(0);expect((await getDoc(doc(owner.firestore,'campaignViews',id,'members',owner.uid))).get('revision')).toBe(own.get('revision'));
  result.phases.push({label,cardinality,ticks:count,elapsedMs,deliveries,revision:own.get('revision'),authorizedDelivery:true,foreignReadDenied:true,repeatUnchanged:true});
 }
 result.status='complete';
}catch(error){result.status='failed';result.boundary=phase;result.error=error instanceof Error?error.name:'unknown';throw error;}finally{clearTimeout(total);unsubscribe();writeFileSync(output+'.json',JSON.stringify(result,null,2));await Promise.all(clients.map(deleteApp));await db.terminate();}
