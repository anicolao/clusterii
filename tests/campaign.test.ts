import { expect, test } from 'bun:test';
import { generateGalaxy, validateGalaxy } from '../shared/galaxy';
import { rules } from '../shared/rules';
test('review rules generate persisted, reproducible, fair connected galaxies for every roster size',()=>{
  expect(rules.status).toBe('review');
  for(const seats of rules.playerCounts)for(let sample=0;sample<20;sample++) {
    const seed=sample.toString(16).padStart(64,'0');
    const galaxy=generateGalaxy(seats,seed);
    validateGalaxy(galaxy,seats);
    expect(galaxy).toEqual(generateGalaxy(seats,seed));
  }
});
import {type Campaign,createCampaign,joinOrLeave,startCampaign,campaignView,maintainCampaign} from '../shared/campaign';
import type {FactionId} from '../shared/rules';
test('development admission enforces quota, idempotency, stale claims, scheduled start and private views',()=>{
  const now=1000;
  let state=createCampaign('test',{kind:'campaign.create',expectedRevision:0,name:'Test galaxy',capacity:4,mode:'mock',development:true},'a'.repeat(64),now);
  const profile={alias:'Commander',portrait:'G1' as const};
  const join=(id:string,faction:FactionId,revision=state.revision)=>({kind:'campaign.join',expectedRevision:revision,faction});
  state=joinOrLeave(state,join('a','heliac'),'a',profile,now);
  expect(joinOrLeave(state,join('a','heliac',0),'a',profile,now)).toEqual(state);
  expect(()=>joinOrLeave(state,join('b','heliac'),'b',profile,now)).toThrow('full');
  expect(()=>joinOrLeave(state,join('b','pelagic',0),'b',profile,now)).toThrow('conflict');
  for(const [uid,f] of [['b','pelagic'],['c','vesper'],['d','dracon']] as const)state=joinOrLeave(state,join(uid,f),uid,profile,now);
  expect(state.startAt).toBe(900000);
  expect(startCampaign(state,899999)).toEqual(state);
  state=startCampaign(state,900000);
  expect(state.phase).toBe('active');
  expect(new Set(state.seats.map(s=>s.home)).size).toBe(4);
  const view=campaignView(state,'a');
  expect(view.holdings).toHaveLength(1);
  expect(view.empire?.creditsMilli).toBe(rules.startingAssets.credits*1000);
  expect(JSON.stringify(view)).not.toContain('seed');
  expect(()=>campaignView(state,'outsider')).toThrow('not-member');
  expect(()=>joinOrLeave(state,{kind:'campaign.leave',expectedRevision:state.revision},'a',profile,900000)).toThrow('started');
});

test('split ownership omits opposing layer values from serialized views', () => {
  let state=createCampaign('split',{kind:'campaign.create',expectedRevision:0,name:'Split galaxy',capacity:4,mode:'mock',development:true},'b'.repeat(64),0);
  state=joinOrLeave(state,{kind:'campaign.join',expectedRevision:1,faction:'heliac'},'a',{alias:'Alice',portrait:'G1'},0);
  state.systems.s0000={orbit:'a',surface:'b',fighters:11,camps:12,stations:13,infantry:98765,markets:98766,bases:98767,escrowMilli:98768};
  state.systems.s0001={orbit:'b',surface:'a',fighters:98769,camps:98770,stations:98771,infantry:21,markets:22,bases:23,escrowMilli:98772};
  const view=campaignView(state,'a');
  expect(view.holdings[0]).toEqual({starId:'s0000',orbit:'You',surface:'Unknown',fighters:11,camps:12,stations:13});
  expect(view.holdings[1]).toEqual({starId:'s0001',orbit:'Unknown',surface:'You',infantry:21,markets:22,bases:23});
  expect(JSON.stringify(view)).not.toMatch(/:987(?:6[5-9]|7[0-2])[,}]/);
});

test('private projections are independent of opposing-layer values for every control combination', () => {
  let state=createCampaign('entitlements',{kind:'campaign.create',expectedRevision:0,name:'Private layers',capacity:4,mode:'mock',development:true},'e'.repeat(64),0);
  for(const [uid,faction] of [['a','heliac'],['b','pelagic']] as const)
    state=joinOrLeave(state,{kind:'campaign.join',expectedRevision:state.revision,faction},uid,{alias:uid,portrait:'G1'},0);
  for(const orbit of ['a','b',null])for(const surface of ['a','b',null]) {
    state.systems={s0000:{orbit,surface,fighters:11,camps:12,stations:13,infantry:21,markets:22,bases:23,escrowMilli:31}};
    for(const uid of ['a','b']) {
      const original=JSON.stringify(campaignView(state,uid));
      const serialized=JSON.parse(original);
      if(orbit!==uid && surface!==uid) expect(serialized.holdings).toEqual([]);
      else {
        const holding=serialized.holdings[0];
        for(const field of ['fighters','camps','stations']) expect(Object.hasOwn(holding,field)).toBe(orbit===uid);
        for(const field of ['infantry','markets','bases']) expect(Object.hasOwn(holding,field)).toBe(surface===uid);
        expect(Object.hasOwn(holding,'escrowMilli')).toBe(orbit===uid && surface===uid);
      }
      const changed=structuredClone(state),system=changed.systems.s0000;
      if(orbit!==uid) {system.fighters=99101;system.camps=99102;system.stations=99103;}
      if(surface!==uid) {system.infantry=99201;system.markets=99202;system.bases=99203;}
      if(orbit!==uid || surface!==uid)system.escrowMilli=99301;
      changed.empires[uid==='a'?'b':'a']={creditsMilli:99401};
      expect(JSON.stringify(campaignView(changed,uid))).toBe(original);
    }
  }
});

test('maintenance freezes scheduled time and rejects admissions without changing holdings',async()=>{
  const {createCampaign,joinOrLeave,maintainCampaign,startCampaign}=await import('../shared/campaign');
  let state=createCampaign('maintenance',{kind:'campaign.create',expectedRevision:0,name:'Maintenance',capacity:4,development:true,mode:'mock'},'c'.repeat(64),0);
  for(const [i,faction] of ['heliac','pelagic','vesper','dracon'].entries())state=joinOrLeave(state,{kind:'campaign.join',expectedRevision:state.revision,faction},`p${i}`,{alias:`Envoy ${i}`,portrait:'G1'},0);
  const pause={kind:'campaign.pause',expectedRevision:state.revision};
  expect(()=>maintainCampaign(state,pause,'outsider',100)).toThrow('permission');
  const paused=maintainCampaign(state,pause,'p0',100);
  expect(startCampaign(paused,10_000_000)).toBe(paused);
  expect(()=>joinOrLeave(paused,{kind:'campaign.leave',expectedRevision:paused.revision},'p0',{alias:'Envoy',portrait:'G1'},200)).toThrow('paused');
  const resumed=maintainCampaign(paused,{kind:'campaign.resume',expectedRevision:paused.revision},'p0',1100);
  expect(resumed.startAt).toBe(state.startAt!+1000);expect(resumed.systems).toEqual(state.systems);
  expect(startCampaign(resumed,resumed.startAt!-1)).toBe(resumed);
  expect(startCampaign(resumed,resumed.startAt!).phase).toBe('active');
});

test('epoch activation resumes only paused members and permanently records mock exposure',async()=>{
 const {createCampaign,joinOrLeave,maintainCampaign,activateEncryptionEpoch}=await import('../shared/campaign');
 let state=createCampaign('epochs',{kind:'campaign.create',expectedRevision:0,name:'Epoch rules',capacity:4,development:true,mode:'real'},'d'.repeat(64),0);
 state=joinOrLeave(state,{kind:'campaign.join',expectedRevision:1,faction:'heliac'},'owner',{alias:'Envoy',portrait:'G1'},0);
 expect(()=>activateEncryptionEpoch(state,'mock',2,'owner',200)).toThrow('pause-required');
 state=maintainCampaign(state,{kind:'campaign.pause',expectedRevision:2},'owner',100);
 expect(()=>activateEncryptionEpoch(state,'mock',1,'owner',200)).toThrow('invalid');
 expect(()=>activateEncryptionEpoch(state,'real',2,'owner',200)).toThrow('invalid');
 expect(()=>activateEncryptionEpoch(state,'mock',2,'outsider',200)).toThrow('permission');
 const mock=activateEncryptionEpoch(state,'mock',2,'owner',200);expect(mock.mockExposed).toBe(true);expect(mock.pausedAt).toBeNull();expect(mock.revision).toBe(4);
 const paused=maintainCampaign(mock,{kind:'campaign.pause',expectedRevision:4},'owner',300);
 const real=activateEncryptionEpoch(paused,'real',4,'owner',400);expect(real.mockExposed).toBe(true);expect(real.mode).toBe('real');expect(real.seats).toEqual(state.seats);expect(real.systems).toEqual(state.systems);
});

import {powerMilli,produce,apportionMilli} from '../shared/production';
function productionFixture(){
 let campaign=createCampaign('production',{kind:'campaign.create',expectedRevision:0,name:'Production fixtures',capacity:4,mode:'mock',development:true},'e'.repeat(64),0);
 for(const [i,faction] of (['heliac','pelagic','vesper','dracon'] as const).entries())campaign=joinOrLeave(campaign,{kind:'campaign.join',expectedRevision:campaign.revision,faction},`p${i}`,{alias:`Envoy ${i}`,portrait:'G1'},0);
 return startCampaign(campaign,900000);
}
test('exact production floors review exponents, preserves milliunits and apportions stable ties',()=>{
 expect(powerMilli(2800,5)).toBe(2947);expect(powerMilli(1000000,5)).toBe(1412537);
 for(let level=0;level<=10;level++){expect(powerMilli(0,level)).toBe(0);expect(powerMilli(1000,level)).toBe(1000);}
 expect(powerMilli(999,10)).toBe(998);expect(()=>powerMilli(-1,0)).toThrow();expect(()=>powerMilli(Number.MAX_SAFE_INTEGER,10)).toThrow();
 expect([...apportionMilli(5,[{id:'b',milli:1},{id:'a',milli:1}])]).toEqual([['a',3],['b',2]]);
});
test('home production conserves credits, whole forces and fractional remainders; science advances only after output',()=>{
 let state=productionFixture();const home=state.seats[0].home!;
 expect(state.economy!.nextTickAt).toBe(1800000);expect(state.economy!.tick).toBe(0);
 for(let n=1;n<=5;n++) {const result=produce(state,state.economy!);state={...result.campaign,economy:result.economy};expect(state.empires.p0.creditsMilli).toBe(200000+2800*n);}
 expect(state.systems[home].fighters).toBe(27);expect(state.systems[home].infantry).toBe(27);expect(state.economy!.remainders[home]).toEqual({fightersMilli:0,infantryMilli:0});expect(state.economy!.research.p0.progressMilli.navigation).toBe(7000);
 state.economy!.research.p0.target='innovation';state.economy!.research.p0.progressMilli.innovation=19999;
 const result=produce(state,state.economy!);expect(result.economy.ledger.p0.scienceMilli).toBe(1400);expect(result.economy.research.p0.levels.innovation).toBe(1);expect(result.economy.research.p0.progressMilli.innovation).toBe(1399);
 const following=produce(result.campaign,result.economy);expect(following.economy.ledger.p0.scienceMilli).toBe(powerMilli(1400,1));
});
test('split control routes production by layer, releases escrow once and hides opposing ledgers',()=>{
 let state=productionFixture();const home=state.seats[0].home!;
 state.systems[home].orbit='p1';state.systems[home].escrowMilli=60000;
 const split=produce(state,state.economy!);state={...split.campaign,economy:split.economy};
 expect(state.empires.p0.creditsMilli).toBe(200000);expect(state.systems[home].escrowMilli).toBe(62800);expect(split.economy.ledger.p0.fighters).toBe(0);expect(split.economy.ledger.p0.scienceMilli).toBe(0);expect(split.economy.ledger.p0.infantry).toBe(1);
 state.systems[home].orbit='p0';const unified=produce(state,state.economy!);expect(unified.campaign.empires.p0.creditsMilli).toBe(265600);expect(unified.campaign.systems[home].escrowMilli).toBe(0);expect(unified.economy.ledger.p0.releasedEscrowMilli).toBe(62800);
 const again=produce(unified.campaign,unified.economy);expect(again.campaign.empires.p0.creditsMilli).toBe(268400);expect(again.economy.ledger.p0.releasedEscrowMilli).toBe(0);
 const view=campaignView({...unified.campaign,economy:unified.economy},'p0');expect(view.economy?.research).toEqual(unified.economy.research.p0);expect(JSON.stringify(view.economy)).not.toContain('p1');
});
test('production force caps record discarded units and legacy campaigns retain their stored capability',()=>{
 const state=productionFixture(),home=state.seats[0].home!;state.systems[home].fighters=rules.maximumUnitsPerPlayerPerType;state.systems[home].infantry=rules.maximumUnitsPerPlayerPerType;
 const result=produce(state,state.economy!);expect(result.campaign.systems[home].fighters).toBe(rules.maximumUnitsPerPlayerPerType);expect(result.economy.ledger.p0.discardedFighters).toBe(1);expect(result.economy.ledger.p0.discardedInfantry).toBe(1);
 const legacy={...state,schemaVersion:1 as const};delete legacy.economy;expect(campaignView(legacy,'p0').productionEnabled).toBe(false);expect(campaignView(legacy,'p0').production).toBeNull();
});

test('production pause preserves the remaining interval and legacy starts never gain an economy',()=>{
 const state=productionFixture();
 const paused=maintainCampaign(state,{kind:'campaign.pause',expectedRevision:state.revision},'p0',1200000);
 const resumed=maintainCampaign(paused,{kind:'campaign.resume',expectedRevision:paused.revision},'p0',1500000);
 expect(resumed.economy!.nextTickAt).toBe(2100000);expect(resumed.economy!.tick).toBe(0);expect(resumed.empires).toEqual(state.empires);expect(resumed.economy!.research).toEqual(state.economy!.research);
 const legacy={...state,phase:'scheduled' as const,schemaVersion:1 as const};delete legacy.economy;
 const began=startCampaign(legacy,900000);expect(began.economy).toBeUndefined();expect(campaignView(began,'p0').productionEnabled).toBe(false);
});

test('investing is applied once before wallet/escrow apportionment and neutral developments produce nothing',()=>{
 const state=productionFixture(),unfavored=state.galaxy.stars.find(s=>s.class==='O'&&!state.seats.some(seat=>seat.home===s.id))!.id;
 state.systems[unfavored]={orbit:'p1',surface:'p0',fighters:0,infantry:0,markets:1,camps:0,bases:0,stations:0,escrowMilli:0};state.economy!.research.p0.levels.investing=5;
 const neutral=state.galaxy.stars.find(s=>!state.seats.some(seat=>seat.home===s.id)&&s.id!==unfavored)!.id;state.systems[neutral].markets=100;state.systems[neutral].camps=100;state.systems[neutral].bases=100;state.systems[neutral].stations=100;
 const result=produce(state,state.economy!);const ledger=result.economy.ledger.p0;
 // Independent Decimal(precision=60) reference: floorMilli(3.6^1.05)=3.838.
 expect(ledger.creditsMilli+ledger.escrowMilli).toBe(3838);expect(result.campaign.systems[neutral]).toEqual(state.systems[neutral]);expect(result.campaign.empires.p0.creditsMilli-200000).toBe(ledger.creditsMilli);expect(result.campaign.systems[unfavored].escrowMilli).toBe(ledger.escrowMilli);
});

import {selectResearch,parseCampaignAction} from '../shared/campaign';
test('research admission assigns future cutoff, rejects foreign/stale/paused/legacy orders and keeps queues private',()=>{
 const initial=productionFixture(),due=initial.economy!.nextTickAt;
 const action={kind:'research.select',expectedRevision:initial.revision,target:'investing'};
 const queued=selectResearch(initial,action,'p0','before',due-1);
 expect(queued.economy!.research.p0.orders![0]).toMatchObject({id:'before',effectiveTick:1,sequence:7,target:'investing'});
 expect(selectResearch(initial,action,'p0','at',due).economy!.research.p0.orders![0].effectiveTick).toBe(2);
 expect(selectResearch(initial,action,'p0','late',due+3*900000).economy!.research.p0.orders![0].effectiveTick).toBe(5);
 expect(()=>selectResearch(initial,action,'foreign','x',0)).toThrow('permission');
 expect(()=>selectResearch(queued,action,'p0','x',0)).toThrow('conflict');
 expect(()=>selectResearch({...initial,pausedAt:1},action,'p0','x',0)).toThrow('paused');
 expect(()=>selectResearch({...initial,schemaVersion:1,economy:undefined},action,'p0','x',0)).toThrow('research-unavailable');
 expect(()=>parseCampaignAction({...action,target:'missing'})).toThrow('invalid');
 expect(()=>parseCampaignAction({...action,uid:'p1'})).toThrow('invalid');
 expect(JSON.stringify(campaignView(queued,'p1'))).not.toContain('before');
 const filled=structuredClone(queued);filled.economy!.research.p0.orders=Array.from({length:64},()=>queued.economy!.research.p0.orders![0]);
 expect(()=>selectResearch(filled,{...action,expectedRevision:filled.revision},'p0','overflow',0)).toThrow('research-queue-full');
 expect(initial.economy!.research.p0.orders).toBeUndefined();
});
test('research selections settle in admitted order, retain unfinished progress and transfer capped bank exactly once',()=>{
 let state=productionFixture();const due=state.economy!.nextTickAt;
 state.economy!.research.p0.levels.navigation=10;state.economy!.research.p0.progressMilli.navigation=6000;
 state.economy!.research.p0.progressMilli.investing=2000;
 state=selectResearch(state,{kind:'research.select',expectedRevision:state.revision,target:'investing'},'p0','first',due-1);
 state=selectResearch(state,{kind:'research.select',expectedRevision:state.revision,target:'recruiting'},'p0','second',due-1);
 state=selectResearch(state,{kind:'research.select',expectedRevision:state.revision,target:'innovation'},'p0','late',due);
 const first=produce(state,state.economy!);const research=first.economy.research.p0;
 expect(research.target).toBe('recruiting');expect(research.progressMilli.navigation).toBe(0);expect(research.progressMilli.investing).toBe(8000);expect(research.progressMilli.recruiting).toBe(1400);expect(research.orders?.map(o=>o.id)).toEqual(['late']);expect(research.lastApplied?.id).toBe('second');expect(research.appliedOrders?.map(o=>o.id)).toEqual(['first','second']);
 const next=produce(first.campaign,first.economy);expect(next.economy.research.p0.target).toBe('innovation');expect(next.economy.research.p0.progressMilli.investing).toBe(8000);expect(next.economy.research.p0.progressMilli.innovation).toBe(1400);expect(next.economy.research.p0.orders).toEqual([]);
 const repeated=produce(first.campaign,first.economy);expect(repeated).toEqual(next);
});


import {orderConstruction} from '../shared/campaign';
import {buildCost} from '../shared/construction';
function nextProduction(state:ReturnType<typeof productionFixture>){const result=produce(state,state.economy!);return {...result.campaign,economy:result.economy};}
test('construction reserves exact escalating prices, serial layer capacity and future cutoffs without overspending',()=>{
 let state=productionFixture();const home=state.seats[0].home!,due=state.economy!.nextTickAt;const action={kind:'construction.build',expectedRevision:state.revision,starId:home,type:'market'};
 expect(buildCost('market',2)).toBe(106000);state=orderConstruction(state,action,'p0',crypto.randomUUID(),due-1);expect(state.empires.p0.creditsMilli).toBe(94000);expect(state.construction!.orders[0]).toMatchObject({effectiveTick:1,paidMilli:106000,progress:0,startedTick:null});
 expect(()=>orderConstruction(state,{...action,expectedRevision:state.revision},'p0','x',due)).toThrow('insufficient-credits');
 expect(()=>orderConstruction(state,action,'p0','x',due)).toThrow('conflict');
 expect(()=>orderConstruction(state,{...action,expectedRevision:state.revision},'p1','x',due)).toThrow('permission');
 const cheap={...action,type:'camp',expectedRevision:state.revision};const at=orderConstruction(state,cheap,'p0',crypto.randomUUID(),due);expect(at.construction!.orders[1].effectiveTick).toBe(2);expect(at.empires.p0.creditsMilli).toBe(25000);
 expect(()=>parseCampaignAction({...cheap,uid:'p1'})).toThrow('invalid');expect(()=>parseCampaignAction({...cheap,type:'unknown'})).toThrow('invalid');
 const rich=structuredClone(state);rich.empires.p0.creditsMilli=10000000;let queued=rich;for(let i=0;i<3;i++)queued=orderConstruction(queued,{...action,expectedRevision:queued.revision,type:'base'},'p0',crypto.randomUUID(),due-1);
 expect(()=>orderConstruction(queued,{...action,expectedRevision:queued.revision,type:'base'},'p0','x',due-1)).toThrow('construction-queue-full');
 rich.systems[home].stations=8;expect(()=>orderConstruction(rich,{...action,expectedRevision:rich.revision,type:'station'},'p0','x',due-1)).toThrow('construction-capacity');
 expect(()=>orderConstruction({...state,pausedAt:1},{...action,expectedRevision:state.revision},'p0','x',due)).toThrow('paused');
 expect(()=>orderConstruction({...state,schemaVersion:1,economy:undefined},{...action,expectedRevision:state.revision},'p0','x',due)).toThrow('construction-unavailable');
});
test('four construction advances produce on completion and distribute one bounded dividend from frozen markets',()=>{
 let state=productionFixture();const home=state.seats[0].home!,id=crypto.randomUUID();state=orderConstruction(state,{kind:'construction.build',expectedRevision:state.revision,starId:home,type:'market'},'p0',id,state.economy!.nextTickAt-1);
 for(let t=1;t<=4;t++){state=nextProduction(state);expect(state.systems[home].markets).toBe(2);expect(state.construction!.orders[0].progress).toBe(t-1);expect(state.economy!.ledger.p0.marketDividendsMilli??0).toBe(0);}
 state=nextProduction(state);expect(state.systems[home].markets).toBe(3);expect(state.construction!.orders).toEqual([]);expect(state.construction!.ledger.p0).toEqual([{id,starId:home,type:'market',result:'completed',paidMilli:106000,refundMilli:0}]);expect(state.economy!.ledger.p0.creditsMilli).toBe(4200);
 expect(['p1','p2','p3'].reduce((sum,uid)=>sum+(state.economy!.ledger[uid].marketDividendsMilli??0),0)).toBe(10600);expect(state.empires.p0.creditsMilli).toBe(94000+4*2800+4200);
 state=nextProduction(state);expect(state.construction!.ledger).toEqual({});expect(state.economy!.ledger.p1.marketDividendsMilli??0).toBe(0);
});
test('cancellation settles at its assigned tick with full or half refund and cannot repeat',()=>{
 for(const advances of [0,1]){let state=productionFixture();const home=state.seats[0].home!,id=crypto.randomUUID();state=orderConstruction(state,{kind:'construction.build',expectedRevision:state.revision,starId:home,type:'market'},'p0',id,state.economy!.nextTickAt-1);state=nextProduction(state);if(advances)state=nextProduction(state);
 const prior=state.empires.p0.creditsMilli;const action={kind:'construction.cancel',expectedRevision:state.revision,orderId:id};state=orderConstruction(state,action,'p0',crypto.randomUUID(),state.economy!.nextTickAt-1);expect(state.empires.p0.creditsMilli).toBe(prior);expect(()=>orderConstruction(state,{...action,expectedRevision:state.revision},'p0','x',state.economy!.nextTickAt-1)).toThrow('cancellation-pending');state=nextProduction(state);expect(state.empires.p0.creditsMilli).toBe(prior+2800+(advances?53000:106000));expect(state.construction!.orders).toEqual([]);expect(state.construction!.cancellations).toEqual([]);expect(state.construction!.ledger.p0[0].result).toBe('cancelled');expect(state.economy!.ledger.p1.marketDividendsMilli??0).toBe(0);}
});
test('split-layer construction privacy, pre-execution invalidation and capture cancellation preserve exact refunds',()=>{
 let state=productionFixture();const home=state.seats[0].home!;state.empires.p0.creditsMilli=1000000;const market=crypto.randomUUID(),camp=crypto.randomUUID();for(const [id,type] of [[market,'market'],[camp,'camp']] as const)state=orderConstruction(state,{kind:'construction.build',expectedRevision:state.revision,starId:home,type},'p0',id,state.economy!.nextTickAt-1);
 state=nextProduction(state);const balance=state.empires.p0.creditsMilli;state.systems[home].surface='p1';const other=JSON.stringify(campaignView(state,'p1'));expect(other).not.toContain(market);expect(other).not.toContain(camp);expect(JSON.stringify(campaignView(state,'p0'))).not.toContain(market);state=nextProduction(state);expect(state.construction!.orders.map(o=>o.id)).toEqual([camp]);expect(state.construction!.ledger.p0[0]).toMatchObject({id:market,result:'captured',refundMilli:0});expect(state.empires.p0.creditsMilli).toBe(balance);
 let invalid=productionFixture();const target=invalid.seats[0].home!;invalid=orderConstruction(invalid,{kind:'construction.build',expectedRevision:invalid.revision,starId:target,type:'market'},'p0',crypto.randomUUID(),invalid.economy!.nextTickAt-1);invalid.systems[target].surface='p1';invalid=nextProduction(invalid);expect(invalid.empires.p0.creditsMilli).toBe(200000);expect(invalid.construction!.ledger.p0[0]).toMatchObject({result:'invalid',refundMilli:106000});
});

test('construction layer queues start successors without an immediate advance and dividend escrow conserves its pool',()=>{
 let state=productionFixture();const home=state.seats[0].home!,peer=state.seats[1].home!;state.empires.p0.creditsMilli=1000000;
 for(const type of ['market','base'] as const)state=orderConstruction(state,{kind:'construction.build',expectedRevision:state.revision,starId:home,type},'p0',crypto.randomUUID(),state.economy!.nextTickAt-1);
 state.systems[peer].orbit='p2';
 for(let n=0;n<5;n++)state=nextProduction(state);
 expect(state.construction!.orders).toHaveLength(1);expect(state.construction!.orders[0]).toMatchObject({type:'base',startedTick:5,progress:0});expect(state.systems[home].bases).toBe(1);
 const ledger=state.economy!.ledger;expect(ledger.p1.marketDividendsMilli??0).toBe(0);expect(ledger.p1.marketEscrowMilli).toBeGreaterThan(0);expect((ledger.p1.marketEscrowMilli??0)+(ledger.p2.marketDividendsMilli??0)+(ledger.p3.marketDividendsMilli??0)).toBe(10600);
 for(let n=0;n<4;n++)state=nextProduction(state);expect(state.systems[home].bases).toBe(2);expect(state.construction!.orders).toEqual([]);expect(state.economy!.ledger.p0.infantry).toBeGreaterThanOrEqual(2);
});

import {selectMarketFocus} from '../shared/campaign';
import {initialFocus} from '../shared/market-focus';
test('market focus validates exact allocation, membership, private orders and future boundary',()=>{
 const state=productionFixture(),due=state.economy!.nextTickAt,allocation={market:100,camp:0,base:0,station:0},action={kind:'market.focus',expectedRevision:state.revision,allocation};
 const before=structuredClone(state);const next=selectMarketFocus(state,action,'p0','focus-one',due-1);expect(state).toEqual(before);expect(next.economy!.marketFocus!.p0.orders[0]).toMatchObject({effectiveTick:1,allocation});expect(next.economy!.marketFocus!.p0.allocation).toEqual(initialFocus().allocation);expect(campaignView(next,'p1').economy!.marketFocus.orders).toEqual([]);expect(JSON.stringify(campaignView(next,'p1'))).not.toContain('focus-one');
 const boundary=selectMarketFocus(state,action,'p0','focus-two',due);expect(boundary.economy!.marketFocus!.p0.orders[0].effectiveTick).toBe(2);expect(selectMarketFocus(state,action,'p0','late',due+900000).economy!.marketFocus!.p0.orders[0].effectiveTick).toBe(3);
 for(const allocation of [{market:99,camp:0,base:0,station:0},{market:100.5,camp:0,base:0,station:0},{market:101,camp:-1,base:0,station:0},{market:100,camp:0,base:0,station:0,uid:'p1'},{market:'100',camp:0,base:0,station:0},null])expect(()=>selectMarketFocus(state,{...action,allocation},'p0','x',due)).toThrow('invalid');
 expect(()=>selectMarketFocus(state,action,'stranger','x',due)).toThrow('permission');expect(()=>selectMarketFocus(next,action,'p0','x',due)).toThrow('conflict');expect(()=>selectMarketFocus({...state,pausedAt:1},action,'p0','x',due)).toThrow('paused');expect(()=>selectMarketFocus({...state,schemaVersion:1,economy:undefined},action,'p0','x',due)).toThrow('focus-unavailable');
});
test('focus applies in sequence but completion dividends use the previous tick allocation',()=>{
 let state=productionFixture();const home=state.seats[0].home!;state=orderConstruction(state,{kind:'construction.build',expectedRevision:state.revision,starId:home,type:'camp'},'p0','build-focus',state.economy!.nextTickAt-1);
 for(let i=0;i<4;i++)state=nextProduction(state);
 state=selectMarketFocus(state,{kind:'market.focus',expectedRevision:state.revision,allocation:{market:100,camp:0,base:0,station:0}},'p1','zero-camp',state.economy!.nextTickAt-1);
 state=nextProduction(state);expect(state.economy!.marketFocus!.p1.allocation.camp).toBe(0);expect(state.economy!.ledger.p1.marketDividendsMilli).toBe(2300);expect(state.economy!.marketFocus!.p1.lastApplied!.effectiveTick).toBe(5);
 state=orderConstruction(state,{kind:'construction.build',expectedRevision:state.revision,starId:home,type:'camp'},'p0','next-build',state.economy!.nextTickAt-1);for(let i=0;i<5;i++)state=nextProduction(state);
 expect(state.economy!.ledger.p1.marketDividendsMilli??0).toBe(0);expect(state.economy!.ledger.p2.marketDividendsMilli).toBe(4000);expect(state.economy!.ledger.p3.marketDividendsMilli).toBe(4000);expect(state.economy!.marketFocus!.p1.orders).toEqual([]);
});

test('focus admission is bounded, ordered and zero-weight completion pools pay nothing',()=>{
 let state=productionFixture();const allocation={market:100,camp:0,base:0,station:0},due=state.economy!.nextTickAt;for(let i=0;i<64;i++)state=selectMarketFocus(state,{kind:'market.focus',expectedRevision:state.revision,allocation:i===63?{market:0,camp:100,base:0,station:0}:allocation},'p1',`order-${i}`,due-1);expect(()=>selectMarketFocus(state,{kind:'market.focus',expectedRevision:state.revision,allocation},'p1','overflow',due-1)).toThrow('focus-queue-full');state=nextProduction(state);expect(state.economy!.marketFocus!.p1.appliedOrders).toHaveLength(64);expect(state.economy!.marketFocus!.p1.allocation.camp).toBe(100);expect(state.economy!.marketFocus!.p1.orders).toEqual([]);
 let zero=productionFixture();delete zero.economy!.marketFocus;expect(campaignView(zero,'p0').economy!.marketFocus.allocation).toEqual(initialFocus().allocation);for(const uid of ['p1','p2','p3'])zero=selectMarketFocus(zero,{kind:'market.focus',expectedRevision:zero.revision,allocation},uid,`zero-${uid}`,zero.economy!.nextTickAt-1);zero=orderConstruction(zero,{kind:'construction.build',expectedRevision:zero.revision,starId:zero.seats[0].home!,type:'camp'},'p0','zero-pool',zero.economy!.nextTickAt-1);for(let i=0;i<5;i++)zero=nextProduction(zero);for(const ledger of Object.values(zero.economy!.ledger))expect(ledger.marketDividendsMilli??0).toBe(0);
});

import {assertObservationBudget,acquireObservations,detectionProbability,drawRange} from '../shared/observations';
import {observationDraw} from '../functions/src/observation-random';
function observedTick(state:Campaign,draw:(uid:string,starId:string,tick:number)=>number){const next=nextProduction(state);acquireObservations(state,next,draw);return next;}
test('scans use one private draw per target, frozen levels and nearest orbital source',()=>{
 expect(detectionProbability(1,10)).toBe(1);expect(detectionProbability(1,100)).toBe(.1);expect(detectionProbability(2,100)).toBe(.4);expect(detectionProbability(0,0)).toBe(1);expect(()=>detectionProbability(1,-1)).toThrow();
 let state=productionFixture(),calls=0;const next=observedTick(state,()=>{calls++;return 0;});expect(calls).toBe(4*(state.galaxy.stars.length-1));expect(Object.keys(next.intelligence!.reports.p0)).toHaveLength(state.galaxy.stars.length);expect(next.intelligence!.draws.p0).toHaveLength(state.galaxy.stars.length);expect(state.intelligence).toBeUndefined();
 const own=state.galaxy.stars.find(star=>star.id===state.seats[0].home)!,target=state.galaxy.stars.find(star=>star.id===state.seats[1].home)!;target.x=own.x+100;target.y=own.y;target.z=own.z;state.economy!.research.p0.target='scanning';state.economy!.research.p0.progressMilli.scanning=39999;
 state=observedTick(state,()=>Math.floor(drawRange*.2));expect(state.economy!.research.p0.levels.scanning).toBe(2);expect(state.intelligence!.reports.p0[target.id]).toBeUndefined();state=observedTick(state,()=>Math.floor(drawRange*.2));expect(state.intelligence!.reports.p0[target.id][0]).toBe(2);
});
test('stale observations preserve old permitted facts and never expose current enemy secrets or draws',()=>{
 let state=observedTick(productionFixture(),()=>0);const target=state.seats[1].home!,first=campaignView(state,'p0').observations![target];expect(first.observedTick).toBe(1);const next=nextProduction(state);next.systems[target].fighters=987654;next.systems[target].escrowMilli=87654321;next.empires.p1.creditsMilli=76543210;acquireObservations(state,next,()=>drawRange-1);const view=campaignView(next,'p0');expect(view.observations![target]).toEqual(first);expect(view.production!.tick).toBe(2);const serialized=JSON.stringify(view);for(const secret of ['987654','87654321','76543210',state.seed,'"draws"','"intelligence"'])expect(serialized).not.toContain(secret);expect(Object.keys(view.observations![target]).sort()).toEqual(['observedTick','sourceStarId','orbit','surface','fighters','infantry','markets','camps','bases','stations'].sort());
 const replay=nextProduction(state);replay.systems[target].fighters=987654;replay.systems[target].escrowMilli=87654321;replay.empires.p1.creditsMilli=76543210;acquireObservations(state,replay,()=>drawRange-1);expect(replay.intelligence).toEqual(next.intelligence);
});
test('split ownership grants only observed fields; no sensor means stale and legacy capability remains unchanged',()=>{
 let state=productionFixture();const own=state.seats[0].home!,foreign=state.seats[1].home!;state.systems[own].surface='p1';state.systems[own].infantry=861234;state.systems[own].escrowMilli=55667788;const next=observedTick(state,()=>drawRange-1);const ownView=campaignView(next,'p0'),otherView=campaignView(next,'p2');expect(ownView.holdings.find(h=>h.starId===own)!.infantry).toBeUndefined();expect(ownView.observations![own].infantry).toBeGreaterThanOrEqual(861234);expect(ownView.observations![own].surface).not.toBe('You');expect(JSON.stringify(otherView)).not.toContain('861234');expect(JSON.stringify(ownView.observations)).not.toContain('55667788');
 const observed=observedTick(productionFixture(),()=>0);observed.systems[observed.seats[0].home!].orbit='p1';const noSensor=observedTick(observed,(uid)=>{expect(uid).not.toBe('p0');return drawRange-1;});expect(noSensor.intelligence!.reports.p0).toEqual(observed.intelligence!.reports.p0);expect(noSensor.intelligence!.draws.p0.every(value=>value===null)).toBe(true);
 const legacy=productionFixture();delete legacy.intelligenceVersion;const unchanged=observedTick(legacy,()=>{throw new Error('Legacy must not scan');});expect(unchanged.intelligence).toBeUndefined();expect(campaignView(unchanged,'p0').scanningEnabled).toBe(false);expect(campaignView(unchanged,'p0').observations).toBeNull();
},10000);

test('server observation draws are stable and domain-separated without public replay secrets',()=>{
 const seed='a'.repeat(64),value=observationDraw(seed,'game','p0','s1',1);expect(value).toBe(observationDraw(seed,'game','p0','s1',1));expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThan(drawRange);for(const changed of [observationDraw('b'.repeat(64),'game','p0','s1',1),observationDraw(seed,'game2','p0','s1',1),observationDraw(seed,'game','p1','s1',1),observationDraw(seed,'game','p0','s2',1),observationDraw(seed,'game','p0','s1',2)])expect(changed).not.toBe(value);
});

test('the largest stellar catalogue retains complete reports within the canonical envelope budget',async()=>{
 let state=createCampaign('observation-budget',{kind:'campaign.create',expectedRevision:0,name:'Observation budget',capacity:12,mode:'mock',development:true},'c'.repeat(64),0);
 for(let i=0;i<12;i++)state=joinOrLeave(state,{kind:'campaign.join',expectedRevision:state.revision,faction:rules.factions[i%4].id},`player-${i}`,{alias:`Envoy ${i}`,portrait:'G1'},0);state=startCampaign(state,900000);
 for(let i=0;i<state.galaxy.stars.length;i++){const system=state.systems[state.galaxy.stars[i].id];system.orbit=system.surface=state.seats[i%12].uid;system.fighters=system.infantry=1000000;system.markets=system.camps=system.bases=system.stations=18;}for(const research of Object.values(state.economy!.research))research.levels.scanning=10;
 assertObservationBudget(state);state=observedTick(state,()=>drawRange-1);assertObservationBudget(state);for(const seat of state.seats)expect(Object.keys(state.intelligence!.reports[seat.uid])).toHaveLength(384);
 const {provider,newKey}=await import('../shared/crypto');for(const mode of ['mock','real'] as const){const envelope=await provider(mode).seal(state,newKey(),{gameId:state.id,objectId:'canonical',revision:state.revision,epoch:1,keyVersion:1});const bytes=new TextEncoder().encode(JSON.stringify(envelope)).byteLength;console.info('Stellar observation envelope budget',{mode,bytes,players:12,stars:384});expect(bytes).toBeLessThan(900000);}
});

test('observation storage reserves complete reports before admitting excess pending work',()=>{const state=productionFixture();assertObservationBudget(state);state.construction={orders:Array.from({length:4000},(_,i)=>({id:`${i}`.padStart(36,'0'),uid:'p0',starId:state.seats[0].home!,type:'market' as const,sequence:i,effectiveTick:1,paidMilli:100000,executedTick:null,startedTick:null,progress:0})),cancellations:[],ledger:{}};const before=structuredClone(state);expect(()=>assertObservationBudget(state)).toThrow('pending-work-capacity');expect(state).toEqual(before);});

import {
  fleetIdentity,
  orderFleet,
  reservedForces,
  stationedForces,
} from "../shared/fleets";
test("fleet admission reserves without moving forces; boundary settlement conserves units and rejects duplicate reservations", () => {
  const state = productionFixture(),
    home = state.seats[0].home!,
    action = {
      kind: "fleet.form",
      expectedRevision: state.revision,
      starId: home,
      fighters: 2,
      infantry: 20,
    };
  const queued = orderFleet(
    state,
    action,
    "p0",
    "formed",
    state.economy!.nextTickAt - 1,
  );
  expect(queued.systems[home]).toEqual(state.systems[home]);
  expect(reservedForces(queued, "p0", home)).toEqual({
    fighters: 2,
    infantry: 20,
  });
  expect(queued.military!.orders[0].effectiveTick).toBe(1);
  expect(() =>
    orderFleet(
      queued,
      { ...action, expectedRevision: queued.revision },
      "p0",
      "over",
      0,
    ),
  ).toThrow("insufficient-forces");
  const settled = observedTick(queued, () => 0);
  expect(settled.military!.fleets[fleetIdentity("p0", "formed")]).toMatchObject(
    { fighters: 2, infantry: 20, starId: home, formedTick: 1 },
  );
  expect(settled.systems[home]).toMatchObject({ fighters: 19, infantry: 1 });
  expect(stationedForces(settled, home)).toEqual({
    fighters: 21,
    infantry: 21,
  });
  expect(settled.intelligence!.reports.p1[home].slice(4, 6)).toEqual([21, 21]);
  expect(reservedForces(settled, "p0", home)).toEqual({
    fighters: 0,
    infantry: 0,
  });
  expect(settled.military!.ledger.p0[0].result).toBe("formed");
  const disband = orderFleet(
    settled,
    {
      kind: "fleet.disband",
      expectedRevision: settled.revision,
      fleetId: fleetIdentity("p0", "formed"),
    },
    "p0",
    "returned",
    settled.economy!.nextTickAt - 1,
  );
  expect(() =>
    orderFleet(
      disband,
      {
        kind: "fleet.disband",
        expectedRevision: disband.revision,
        fleetId: fleetIdentity("p0", "formed"),
      },
      "p0",
      "twice",
      0,
    ),
  ).toThrow("fleet-order-pending");
  const returned = nextProduction(disband);
  expect(returned.military!.fleets).toEqual({});
  expect(returned.systems[home]).toMatchObject({ fighters: 22, infantry: 22 });
  expect(returned.military!.ledger.p0[0].result).toBe("disbanded");
  expect(nextProduction(returned).systems[home]).toMatchObject({
    fighters: 24,
    infantry: 24,
  });
  const late = orderFleet(
    state,
    action,
    "p0",
    "late",
    state.economy!.nextTickAt,
  );
  expect(late.military!.orders[0].effectiveTick).toBe(2);
  expect(nextProduction(late).military!.fleets).toEqual({});
});
test("fleet validation, layer entitlement and private views fail closed", () => {
  const state = productionFixture(),
    home = state.seats[0].home!,
    a = {
      kind: "fleet.form",
      expectedRevision: state.revision,
      starId: home,
      fighters: 1,
      infantry: 10,
    };
  for (const patch of [
    { fighters: 0 },
    { fighters: 1.5 },
    { infantry: 11 },
    { infantry: -1 },
    { actor: "p1" },
  ])
    expect(() => orderFleet(state, { ...a, ...patch }, "p0", "x", 0)).toThrow();
  expect(() => orderFleet(state, a, "p1", "x", 0)).toThrow("permission");
  expect(() =>
    orderFleet(state, { ...a, expectedRevision: 999 }, "p0", "x", 0),
  ).toThrow("conflict");
  const split = structuredClone(state);
  split.systems[home].surface = "p1";
  expect(() => orderFleet(split, a, "p0", "x", 0)).toThrow("permission");
  expect(
    orderFleet(split, { ...a, infantry: 0 }, "p0", "x", 0).military!.orders,
  ).toHaveLength(1);
  const queued = orderFleet(state, a, "p0", "private-fleet", 0);
  expect(campaignView(queued, "p1").military).toEqual({
    fleets: [],
    orders: [],
    ledger: [],
  });
  expect(JSON.stringify(campaignView(queued, "p1"))).not.toContain(
    "private-fleet",
  );
  const formed = nextProduction(queued);
  expect(JSON.stringify(campaignView(formed, "p1"))).not.toContain(
    "private-fleet",
  );
  expect(() =>
    orderFleet(
      formed,
      {
        kind: "fleet.disband",
        expectedRevision: formed.revision,
        fleetId: fleetIdentity("p0", "private-fleet"),
      },
      "p1",
      "x",
      0,
    ),
  ).toThrow("permission");
  queued.systems[home].orbit = "p1";
  const lost = nextProduction(queued);
  expect(lost.military!.fleets).toEqual({});
  expect(lost.military!.orders).toEqual([]);
  expect(lost.military!.ledger.p0[0].result).toBe("invalid");
});
test("formed and reserved fleet units count toward the empire production ceiling", () => {
  let state = productionFixture();
  const home = state.seats[0].home!;
  state.systems[home].fighters = state.systems[home].infantry =
    rules.maximumUnitsPerPlayerPerType;
  state = orderFleet(
    state,
    {
      kind: "fleet.form",
      expectedRevision: state.revision,
      starId: home,
      fighters: 1,
      infantry: 10,
    },
    "p0",
    "cap",
    0,
  );
  state = nextProduction(state);
  expect(stationedForces(state, home)).toEqual({
    fighters: 1000000,
    infantry: 1000000,
  });
  expect(state.economy!.ledger.p0.fighters).toBe(0);
  expect(state.economy!.ledger.p0.infantry).toBe(0);
  state = orderFleet(
    state,
    {
      kind: "fleet.disband",
      expectedRevision: state.revision,
      fleetId: fleetIdentity("p0", "cap"),
    },
    "p0",
    "uncap",
    state.economy!.nextTickAt - 1,
  );
  state = nextProduction(state);
  expect(state.systems[home]).toMatchObject({
    fighters: 1000000,
    infantry: 1000000,
  });
  expect(state.economy!.ledger.p0.fighters).toBe(0);
});
test("fleet slots include reservations and enforce the recorded empire limit", () => {
  let state = productionFixture();
  const starId = state.seats[0].home!;
  state.systems[starId].fighters = 200;
  for (let i = 0; i < rules.maximumFleetsPerPlayer; i++)
    state = orderFleet(
      state,
      {
        kind: "fleet.form",
        expectedRevision: state.revision,
        starId,
        fighters: 1,
        infantry: 0,
      },
      "p0",
      `slot-${i}`,
      0,
    );
  expect(() =>
    orderFleet(
      state,
      {
        kind: "fleet.form",
        expectedRevision: state.revision,
        starId,
        fighters: 1,
        infantry: 0,
      },
      "p0",
      "overflow",
      0,
    ),
  ).toThrow("fleet-limit");
  const formed = nextProduction(state);
  expect(Object.keys(formed.military!.fleets)).toHaveLength(128);
  expect(stationedForces(formed, starId).fighters).toBe(201);
});
test("state capacity cannot block disbanding that frees persistent fleet storage", () => {
  let state = createCampaign(
    "fleet-budget",
    {
      kind: "campaign.create",
      expectedRevision: 0,
      name: "Fleet budget",
      capacity: 12,
      mode: "mock",
      development: true,
    },
    "c".repeat(64),
    0,
  );
  for (let i = 0; i < 12; i++)
    state = joinOrLeave(
      state,
      {
        kind: "campaign.join",
        expectedRevision: state.revision,
        faction: rules.factions[i % 4].id,
      },
      `player-${i}`,
      { alias: `Envoy ${i}`, portrait: "G1" },
      0,
    );
  state = startCampaign(state, 900000);
  state.military = { fleets: {}, orders: [], ledger: {} };
  let full = false;
  for (let i = 0; i < 1536; i++) {
    const seat = state.seats[Math.floor(i / 128)],
      id = String(i).padStart(36, "0");
    state.military.fleets[id] = {
      id,
      uid: seat.uid,
      starId: seat.home!,
      fighters: 1,
      infantry: 0,
      formedTick: 1,
      number: i,
    };
    try {
      assertObservationBudget(state);
    } catch {
      delete state.military.fleets[id];
      full = true;
      break;
    }
  }
  expect(full).toBe(true);
  assertObservationBudget(state);
  const queued = orderFleet(
    state,
    {
      kind: "fleet.disband",
      expectedRevision: state.revision,
      fleetId: "0".repeat(36),
    },
    "player-0",
    "release".padStart(36, "0"),
    state.economy!.nextTickAt - 1,
  );
  expect(() => assertObservationBudget(queued)).toThrow(
    "pending-work-capacity",
  );
  expect(() => assertObservationBudget(queued, true)).not.toThrow();
  state = nextProduction(nextProduction(queued));
  expect(state.military!.fleets["0".repeat(36)]).toBeUndefined();
  for (let i = 1; i <= 20; i++) {
    state = orderFleet(
      state,
      {
        kind: "fleet.disband",
        expectedRevision: state.revision,
        fleetId: String(i).padStart(36, "0"),
      },
      "player-0",
      `release-${i}`,
      state.economy!.nextTickAt - 1,
    );
    expect(() => assertObservationBudget(state, true)).not.toThrow();
  }
  state = nextProduction(nextProduction(state));
  expect(() => assertObservationBudget(state)).not.toThrow();
});
test("the disbanding recovery budget fits both encrypted envelope formats", async () => {
  const { provider, newKey } = await import("../shared/crypto");
  const value = { payload: "x".repeat(699986) };
  expect(new TextEncoder().encode(JSON.stringify(value)).byteLength).toBe(
    700000,
  );
  for (const mode of ["mock", "real"] as const) {
    const envelope = await provider(mode).seal(value, newKey(), {
      gameId: "recovery-budget",
      objectId: "canonical",
      revision: 1,
      epoch: 1,
      keyVersion: 1,
    });
    const bytes = new TextEncoder().encode(JSON.stringify(envelope)).byteLength;
    console.info("Disband recovery envelope budget", { mode, bytes });
    expect(bytes).toBeLessThan(950000);
  }
});
test("two commanders using one command UUID retain independent fleet identities and forces", () => {
  let state = productionFixture();
  for (const uid of ["p0", "p1"])
    state = orderFleet(
      state,
      {
        kind: "fleet.form",
        expectedRevision: state.revision,
        starId: state.seats.find((s) => s.uid === uid)!.home!,
        fighters: 2,
        infantry: 10,
      },
      uid,
      "shared-command-uuid",
      0,
    );
  state = nextProduction(state);
  expect(Object.keys(state.military!.fleets)).toHaveLength(2);
  for (const uid of ["p0", "p1"]) {
    expect(
      state.military!.fleets[fleetIdentity(uid, "shared-command-uuid")],
    ).toMatchObject({ uid, fighters: 2, infantry: 10 });
    expect(campaignView(state, uid).military!.fleets).toHaveLength(1);
  }
  expect(fleetIdentity("a:b", "c")).not.toBe(fleetIdentity("a", "b:c"));
});
