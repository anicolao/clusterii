import { expect, test } from "bun:test";
import { createCampaign, joinOrLeave, startCampaign, campaignView, campaignDirectory } from "../shared/campaign";
import { scienceProduction, produce, powerMilli } from "../shared/production";
function game() {
 let c=createCampaign('rate',{kind:'campaign.create',expectedRevision:0,name:'Rate ledger',capacity:4,mode:'mock',development:true},'e'.repeat(64),0);
 for(const [i,faction] of (['heliac','pelagic','vesper','dracon'] as const).entries())c=joinOrLeave(c,{kind:'campaign.join',expectedRevision:c.revision,faction},`p${i}`,{alias:`Envoy ${i}`,portrait:'G1'},0);
 return startCampaign(c,900000);
}
test('current rate is available before first output and equals unchanged next settlement',()=>{
 let c=game();
 for(let tick=0;tick<16;tick++) {
  const rate=scienceProduction(c,'p0')!;
  expect(rate.sources.map(s=>s.starId)).toEqual([c.seats[0].home!]);
  expect(rate.sources[0].stations).toBe(1);
  expect(rate.scienceMilli).toBe(1400);
  expect(campaignView(c,'p0').economy!.science).toEqual(rate);
  const next=produce(c,c.economy!);
  expect(next.economy.ledger.p0.scienceMilli).toBe(rate.scienceMilli);
  c=next.campaign;
 }
});
test('current earned Innovation differs from previous delivered output without changing settlement timing',()=>{
 let c=game(); c.economy!.research.p0.target='innovation';
 for(let i=0;i<15;i++)c=produce(c,c.economy!).campaign;
 expect(c.economy!.ledger.p0.scienceMilli).toBe(1400);
 const rate=scienceProduction(c,'p0')!;
 expect(rate.innovationLevel).toBe(1);
 expect(rate.scienceMilli).toBe(1404);
 expect(produce(c,c.economy!).economy.ledger.p0.scienceMilli).toBe(rate.scienceMilli);
});
test('science sources follow orbital entitlement, omit opposing fields and sum before Innovation',()=>{
 const c=game(), own=c.seats[0].home!, peer=c.seats[1].home!;
 c.systems[own].surface='p1'; c.economy!.research.p0.levels.terraforming=3;c.economy!.research.p0.levels.innovation=2;
 const rate=scienceProduction(c,'p0')!;
 expect(rate.sources[0].scienceMilli).toBe(powerMilli(1400,3));
 expect(rate.scienceMilli).toBe(powerMilli(rate.orbitalScienceMilli,2));
 const hidden=structuredClone(c);hidden.systems[peer].stations=912345;hidden.systems[own].bases=912346;hidden.economy!.research.p1.levels.innovation=77;
 expect(scienceProduction(hidden,'p0')).toEqual(rate);
 expect(JSON.stringify(campaignDirectory(hidden))).not.toContain('science');
 expect(()=>scienceProduction(c,'outsider')).toThrow('not-member');
 c.systems[own].orbit='p1';
 expect(scienceProduction(c,'p0')!.sources).toEqual([]);
 expect(scienceProduction(c,'p0')!.scienceMilli).toBe(0);
 expect(produce(c,c.economy!).economy.ledger.p0.scienceMilli).toBe(0);
 const legacy=game(); delete legacy.economy;
 expect(scienceProduction(legacy,'p0')).toBeNull();
});
