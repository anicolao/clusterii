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
import {createCampaign,joinOrLeave,startCampaign,campaignView} from '../shared/campaign';
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
