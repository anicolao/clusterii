import { orderRoute } from "@shared/travel";
import { distance } from "@shared/galaxy";
import { cancelFleet } from "@shared/fleets";
import {orderFleet} from "@shared/fleets";
import { acquireObservations, drawRange } from "@shared/observations";
import { produce } from "@shared/production";
import {sessionEndedMessage} from "$lib/session-feedback";
import { verifyReceipt } from "@shared/command-receipt";
import { reduceProfile, type Receipt } from '@shared/profile';
import { receiptFeedback, pendingMessage, networkMessage } from '$lib/identity-feedback';
// Deterministic presentation fixtures, using the production validation/reducer and receipt copy.
// This route never creates Firebase users, commands or games.
function receipt(expectedRevision: number, currentRevision: number, alias: string): Receipt {
  try {
    reduceProfile(currentRevision, { kind: 'profile.set', expectedRevision, profile: { alias, portrait: 'M2' } });
    return { status: 'accepted', revision: currentRevision + 1 };
  } catch (error) {
    return { status: 'rejected', revision: currentRevision, reason: error instanceof Error && error.message === 'conflict' ? 'conflict' : 'invalid' };
  }
}
const accepted = receiptFeedback(receipt(1, 1, 'The envoy'));
const conflict = receiptFeedback(receipt(1, 2, 'Preserved draft'));
const invalid = receiptFeedback(receipt(1, 1, 'A'.repeat(25)));
const pending = { message: pendingMessage, error: '', remedy: 'none' };
const reconnect = { message: '', error: networkMessage, remedy: 'network' };
import { campaignFeedback, campaignPendingMessage, campaignNetworkMessage } from '$lib/campaign-feedback';
import { selectMarketFocus, orderConstruction, selectResearch, createCampaign, joinOrLeave, maintainCampaign, activateEncryptionEpoch, startCampaign, campaignDirectory, campaignView } from '@shared/campaign';
const campaign = createCampaign('lab', {kind:'campaign.create',expectedRevision:0,name:'Lab scenario',capacity:4,mode:'mock',development:true},'d'.repeat(64),0);
function joinReceipt(revision:number) {
  try {joinOrLeave(campaign,{kind:'campaign.join',expectedRevision:revision,faction:'heliac'},'lab',{alias:'Envoy',portrait:'G1'},0);return campaignFeedback('campaign.join',{status:'accepted'});}
  catch(error) {return campaignFeedback('campaign.join',{status:'rejected',reason:error instanceof Error ? error.message : 'invalid'});}
}
const campaignPending={message:campaignPendingMessage,error:'',remedy:'none'};
const seated=joinOrLeave(campaign,{kind:'campaign.join',expectedRevision:1,faction:'heliac'},'lab',{alias:'Envoy',portrait:'G1'},0);
function maintenanceReceipt(kind:'campaign.pause'|'campaign.resume', revision:number) {
  const paused=maintainCampaign(seated,{kind:'campaign.pause',expectedRevision:2},'lab',100);
  try { maintainCampaign(kind==='campaign.pause'?seated:paused,{kind,expectedRevision:revision},'lab',200);return campaignFeedback(kind,{status:'accepted'}); }
  catch(error){return campaignFeedback(kind,{status:'rejected',reason:error instanceof Error?error.message:'invalid'});}
}
const migrationSource=maintainCampaign(seated,{kind:'campaign.pause',expectedRevision:2},'lab',100);
const migrationResult=activateEncryptionEpoch(migrationSource,'real',2,'lab',200);
const migrationAccepted=campaignFeedback('campaign.migrate',{status:migrationResult.encryptionEpoch===2&&migrationResult.pausedAt===null?'accepted':'rejected'});
const mismatchedReceipt = (()=>{try {verifyReceipt({requestDigest:"original"},"different");throw new Error("Expected mismatch");} catch(error) {return {message:"",error:(error as Error).message,remedy:"receipt"};}})();
let fullRoster=campaign;
for (const [index,faction] of (['heliac','pelagic','vesper','dracon'] as const).entries()) fullRoster=joinOrLeave(fullRoster,{kind:'campaign.join',expectedRevision:fullRoster.revision,faction},`scheduled-${index}`,{alias:`Envoy ${index+1}`,portrait:'G1'},0);
export function scheduledFrame(time:number) {
  const clock=fullRoster.startAt! - 1000 + time;
  return {game:campaignDirectory(time>=3200?startCampaign(fullRoster,clock):fullRoster),clock};
}
export const historyRecords = [campaignView(migrationSource,"lab"), campaignView(seated,"lab")];
const productionStart = startCampaign(fullRoster,fullRoster.startAt!);
const firstProduction = produce(productionStart,productionStart.economy!);
export function productionFrame(time:number) {return {view:campaignView(time>=2200?{...firstProduction.campaign,economy:firstProduction.economy}:productionStart,"scheduled-0"),clock:productionStart.economy!.nextTickAt-1000+time};}
export const legacyProductionView = campaignView({...productionStart,schemaVersion:1,economy:undefined},"scheduled-0");
const researchQueued=selectResearch(productionStart,{kind:"research.select",expectedRevision:productionStart.revision,target:"investing"},"scheduled-0","lab-research",productionStart.economy!.nextTickAt-1);
const researchSettled=produce(researchQueued,researchQueued.economy!);
export function researchFrame(time:number) {return campaignView(time>=3200?{...researchSettled.campaign,economy:researchSettled.economy}:time>=2200?researchQueued:productionStart,"scheduled-0").economy!.research;}
const constructionQueued=orderConstruction(productionStart,{kind:"construction.build",expectedRevision:productionStart.revision,starId:productionStart.seats[0].home!,type:"market"},"scheduled-0","00000000-0000-0000-0000-000000000001",productionStart.economy!.nextTickAt-1);
let constructionCompleted=constructionQueued;
for(let tick=0;tick<5;tick++){const result=produce(constructionCompleted,constructionCompleted.economy!);constructionCompleted={...result.campaign,economy:result.economy};}
export function constructionFrame(time:number){return campaignView(time>=3200?constructionCompleted:time>=2200?constructionQueued:productionStart,"scheduled-0");}
const focusQueued=selectMarketFocus(productionStart,{kind:"market.focus",expectedRevision:productionStart.revision,allocation:{market:40,camp:20,base:20,station:20}},"scheduled-0","focus-demo",productionStart.economy!.nextTickAt-1);
const focusSettled=produce(focusQueued,focusQueued.economy!);
export function focusFrame(time:number){return campaignView(time>=3200?{...focusSettled.campaign,economy:focusSettled.economy}:time>=2200?focusQueued:productionStart,"scheduled-0").economy!.marketFocus;}
const observationCurrent={...firstProduction.campaign,economy:firstProduction.economy};acquireObservations(productionStart,observationCurrent,()=>0);
const observationNext=produce(observationCurrent,observationCurrent.economy!);const observationStale={...observationNext.campaign,economy:observationNext.economy};acquireObservations(observationCurrent,observationStale,()=>drawRange-1);
export const observedTarget=productionStart.seats[1].home!;
export function observationFrame(time:number){return campaignView(time>=3200?observationStale:time>=1200?observationCurrent:productionStart,"scheduled-0");}
const fleetQueued=orderFleet(productionStart,{kind:'fleet.form',expectedRevision:productionStart.revision,starId:productionStart.seats[0].home!,fighters:2,infantry:10},'scheduled-0','fleet-demo',productionStart.economy!.nextTickAt-1);
const fleetFormed=produce(fleetQueued,fleetQueued.economy!);
export function fleetFrame(time:number){return campaignView(time>=3200?{...fleetFormed.campaign,economy:fleetFormed.economy}:time>=2200?fleetQueued:productionStart,'scheduled-0');}
const cargoSource={...fleetFormed.campaign,economy:fleetFormed.economy};
const cargoQueued=orderFleet(cargoSource,{kind:"fleet.load",expectedRevision:cargoSource.revision,fleetId:Object.keys(cargoSource.military!.fleets)[0],infantry:3},"scheduled-0","cargo-demo",cargoSource.economy!.nextTickAt-1);
const cargoLoaded=produce(cargoQueued,cargoQueued.economy!);
export function cargoFrame(time:number){return campaignView(time>=3200?{...cargoLoaded.campaign,economy:cargoLoaded.economy}:time>=2200?cargoQueued:cargoSource,"scheduled-0");}
const splitQueued=orderFleet(cargoSource,{kind:"fleet.split",expectedRevision:cargoSource.revision,fleetId:Object.keys(cargoSource.military!.fleets)[0],fighters:1,infantry:5},"scheduled-0","split-demo",cargoSource.economy!.nextTickAt-1);
const splitResult=produce(splitQueued,splitQueued.economy!);const splitDone={...splitResult.campaign,economy:splitResult.economy};
const splitChild=Object.keys(splitDone.military!.fleets).find(id=>!cargoSource.military!.fleets[id])!;
const mergeQueued=orderFleet(splitDone,{kind:"fleet.merge",expectedRevision:splitDone.revision,fleetId:splitChild,targetFleetId:Object.keys(cargoSource.military!.fleets)[0]},"scheduled-0","merge-demo",splitDone.economy!.nextTickAt-1);
const mergeResult=produce(mergeQueued,mergeQueued.economy!);
export function reorganizationFrame(time:number, merge=false){return campaignView(merge ? time>=3200?{...mergeResult.campaign,economy:mergeResult.economy}:time>=2200?mergeQueued:splitDone : time>=3200?splitDone:time>=2200?splitQueued:cargoSource,"scheduled-0");}
const cancellationDone=cancelFleet(fleetQueued,{kind:"fleet.cancel",expectedRevision:fleetQueued.revision,orderId:"fleet-demo"},"scheduled-0",fleetQueued.economy!.nextTickAt-1);
export function cancellationFrame(time:number){return campaignView(time>=2200?cancellationDone:fleetQueued,"scheduled-0");}
const travelOrigin=cargoSource.galaxy.stars.find(s=>s.id===cargoSource.seats[0].home)!;
export const travelDestination=cargoSource.galaxy.stars.filter(s=>!cargoSource.systems[s.id].orbit&&s.id!==travelOrigin.id).sort((a,b)=>distance(a,travelOrigin)-distance(b,travelOrigin))[0].id;
export const travelFleetId=Object.keys(cargoSource.military!.fleets)[0];
const travelQueued=orderRoute(cargoSource,{kind:"fleet.route",expectedRevision:cargoSource.revision,fleetId:travelFleetId,waypoints:[travelDestination]},"scheduled-0","travel-demo",cargoSource.economy!.nextTickAt-1);
const travelDeparture=produce(travelQueued,travelQueued.economy!);const travelMoving={...travelDeparture.campaign,economy:travelDeparture.economy};
let travelArrived=travelMoving;
while(travelArrived.military!.fleets[travelFleetId].travel){const next=produce(travelArrived,travelArrived.economy!,()=>0);travelArrived={...next.campaign,economy:next.economy};}
export function travelFrame(time:number){return campaignView(time>=4800?travelArrived:time>=3200?travelMoving:time>=2200?travelQueued:cargoSource,"scheduled-0");}
export const scenarios = [
 {id:"travel",label:"Fleet route: pending → reconnect → accepted → traveling → arrived",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback("fleet.route",{status:"accepted"})},{at:3200,feedback:{message:"Fleet departed. Arrival tick confirmed.",error:"",remedy:"none"}},{at:4800,feedback:{message:"Fleet arrived. Review forces and ownership.",error:"",remedy:"none"}}]},
 {id:"fleet-cancel",label:"Fleet cancellation: pending → reconnect → released",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback("fleet.cancel",{status:"accepted"})}]},
 ...(["split","merge"] as const).map(kind=>({id:kind,label:`Fleet ${kind}: pending → reconnect → accepted → complete`,frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback(`fleet.${kind}`,{status:"accepted"})},{at:3200,feedback:{message:kind === "split" ? "Fleet split. Both complements remain stationed here." : "Fleets merged. The receiving identity is preserved.",error:"",remedy:"none"}}]})),
 {id:"cargo",label:"Fleet cargo: pending → reconnect → reserved → loaded",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback("fleet.load",{status:"accepted"})},{at:3200,feedback:{message:"Infantry loaded. Forces remain conserved.",error:"",remedy:"none"}}]},
 {id:'fleet',label:'Fleet: pending → reconnect → reserved → formed',frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:'',error:campaignNetworkMessage,remedy:'network'}},{at:2200,feedback:campaignFeedback('fleet.form',{status:'accepted'})},{at:3200,feedback:{message:'Fleet formed. Forces remain conserved.',error:'',remedy:'none'}}]},
 {id:"observation",label:"Observation: unknown → current → stale",frames:[{at:0,feedback:{message:"No observation acquired.",error:"",remedy:"none"}},{at:1200,feedback:{message:"Observation acquired at tick 1.",error:"",remedy:"none"}},{at:3200,feedback:{message:"Scan missed. Prior observation remains historical.",error:"",remedy:"none"}}]},
 {id:"market-focus",label:"Market focus: pending → reconnect → accepted → applied",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback("market.focus",{status:"accepted"})},{at:3200,feedback:{message:"Focus applied. New dividend weights begin next tick.",error:"",remedy:"none"}}]},
 {id:"construction",label:"Construction: pending → reconnect → reserved → completed",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback("construction.build",{status:"accepted"})},{at:3200,feedback:{message:"Market completed. Production and dividends settled.",error:"",remedy:"none"}}]},
 {id:"research",label:"Research: pending → reconnect → scheduled → applied",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:2200,feedback:campaignFeedback("research.select",{status:"accepted"})},{at:3200,feedback:{message:"Research applied at tick 1.",error:"",remedy:"none"}}]},
 {id:"production",label:"Production: due → confirmed ledger",frames:[{at:0,feedback:campaignPending},{at:2200,feedback:{message:"Production confirmed.",error:"",remedy:"none"}}]},
 {id:"history-recovery",label:"History: loading → reconnect → recovered",frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:"",error:"History could not be recovered. Retry keeps your place.",remedy:"network"}},{at:2200,feedback:campaignPending},{at:3200,feedback:{message:"Campaign records recovered.",error:"",remedy:"none"}}]},
 {id:"session-ended",label:"Account: ending → signed out",frames:[{at:0,feedback:{message:"Keep this window open while your sessions end.",error:"",remedy:"none"}},{at:1200,feedback:{message:sessionEndedMessage,error:"",remedy:"none"}}]},
 {id:'campaign-start',label:'Scheduled start: delayed → assigned',frames:[{at:0,feedback:campaignPending}]},
 {id:"receipt-mismatch",label:"Order: mismatched acknowledgement",frames:[{at:0,feedback:pending},{at:1200,feedback:mismatchedReceipt}]},
  {id:'campaign-migrated',label:'Encryption: verified → resumed',frames:[{at:0,feedback:campaignPending},{at:1200,feedback:migrationAccepted}]},

  {id:'campaign-paused',label:'Maintenance: pending → paused',frames:[{at:0,feedback:campaignPending},{at:1200,feedback:maintenanceReceipt('campaign.pause',2)}]},
  {id:'campaign-resumed',label:'Maintenance: reconnect → resumed',frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:'',error:campaignNetworkMessage,remedy:'network'}},{at:2200,feedback:campaignPending},{at:3200,feedback:maintenanceReceipt('campaign.resume',3)}]},

  {id:'campaign-joined',label:'Campaign: pending → seat confirmed',frames:[{at:0,feedback:campaignPending},{at:1200,feedback:joinReceipt(1)}]},
  {id:'campaign-conflict',label:'Campaign: stale roster → rejected',frames:[{at:0,feedback:campaignPending},{at:1200,feedback:joinReceipt(0)}]},
  {id:'campaign-reconnect',label:'Campaign: reconnect → seat confirmed',frames:[{at:0,feedback:campaignPending},{at:1000,feedback:{message:'',error:campaignNetworkMessage,remedy:'network'}},{at:2200,feedback:campaignPending},{at:3200,feedback:joinReceipt(1)}]},
  { id: 'accepted', label: 'Pending → accepted', frames: [{ at: 0, feedback: pending }, { at: 1200, feedback: accepted }] },
  { id: 'conflict', label: 'Pending → conflict', frames: [{ at: 0, feedback: pending }, { at: 1200, feedback: conflict }] },
  { id: 'invalid', label: 'Validation rejected', frames: [{ at: 0, feedback: invalid }] },
  { id: 'reconnect', label: 'Pending → reconnect → accepted', frames: [{ at: 0, feedback: pending }, { at: 1000, feedback: reconnect }, { at: 2200, feedback: pending }, { at: 3200, feedback: accepted }] },
] as const;
export const duration = 5600;
