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
import {createCampaign,joinOrLeave,startCampaign,campaignView,maintainCampaign} from '../shared/campaign';
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
