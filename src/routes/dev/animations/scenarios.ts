import { exchange } from "@shared/trades";
import { mixedBriefing } from "./briefing-scenario";
import { RecoveryConflict } from "$lib/recovery-store";
import {historyRecoveryMessage} from "$lib/campaign-history";
import { acquireFleetScans, lastFleetContacts } from "@shared/fleet-contacts";
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
const tradeIssued = exchange(productionStart,{kind:"trade.offer",expectedRevision:productionStart.revision,seat:1,giveMilli:10001,requestMilli:2002},"scheduled-0","lab-credit",productionStart.economy!.nextTickAt-1);
const tradeAccepted = exchange(tradeIssued,{kind:"trade.accept",expectedRevision:tradeIssued.revision,offerId:tradeIssued.trades!.offers[0].id},"scheduled-1","lab-credit-accept",productionStart.economy!.nextTickAt-1);
const tradeSettled = produce(tradeAccepted,tradeAccepted.economy!);
export function creditFrame(time:number) {
 const state=time>=4800?tradeSettled.campaign:time>=3200?tradeAccepted:time>=2200?tradeIssued:productionStart;
 return {view:campaignView(state,"scheduled-0"),draft:{seat:"1",give:"10.001",request:"2.002"},commandId:"lab-credit",commandKind:"trade.offer",selected:time>=2200?tradeIssued.trades!.offers[0].id:"",pending:time>=500&&time<1200,busy:false,message:time>=2200?campaignFeedback("trade.offer",{status:"accepted"}).message:time>=500&&time<1200?campaignPendingMessage:"",error:time>=1200&&time<2200?campaignNetworkMessage:""};
}

const mixedBriefingPeriod = mixedBriefing(productionStart);
const legacyBriefingPeriod = structuredClone(mixedBriefingPeriod);
for(const record of [legacyBriefingPeriod.snapshot,...legacyBriefingPeriod.records]) delete (record.own as {seat?:number}).seat;
export function briefingFrame(time:number){if(time>=5300)return legacyBriefingPeriod;if(time>=4800)return mixedBriefingPeriod;const snapshot=campaignView(firstProduction.campaign,"scheduled-0");return {snapshot,records:time<1200?[]:[campaignView(productionStart,"scheduled-0"),snapshot],earlier:time<1200,loading:time>=500&&time<1200,pending:(time>=2200&&time<3200)||time>=4200,preparing:time>=1800&&time<2200,blocked:time>=1600&&time<1800,recovering:time>=4200,message:time>=3200&&time<3800?campaignFeedback("campaign.visit",{status:"accepted"}).message:"",error:time>=3800&&time<4200?"Connection interrupted. Your visit has not changed. Retry when connected.":""};}
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
const contactsCurrent=structuredClone(cargoSource);acquireFleetScans(fleetQueued,contactsCurrent,()=>0);
const contactTick=produce(contactsCurrent,contactsCurrent.economy!);const contactsStale={...contactTick.campaign,economy:contactTick.economy};acquireFleetScans(contactsCurrent,contactsStale,()=>drawRange-1);
export function contactsFrame(time:number){const view=campaignView(time>=3200?contactsStale:time>=1200?contactsCurrent:productionStart,"scheduled-1");return {view,contacts:lastFleetContacts(time>=1200?[view,campaignView(contactsCurrent,"scheduled-1")]:[view]),loading:time>=500&&time<1200,error:time>=2200&&time<3200?historyRecoveryMessage:""};}
import { arrivalRecords } from "$lib/arrival-reports";
const occupationStart=structuredClone(cargoSource);
occupationStart.military!.fleets[travelFleetId].infantry=0;
Object.assign(occupationStart.systems[travelDestination],{orbit:"scheduled-1",surface:"scheduled-1",fighters:1,infantry:2,markets:1,camps:0,bases:0,stations:1,escrowMilli:0});
let occupation=orderRoute(occupationStart,{kind:"fleet.route",expectedRevision:occupationStart.revision,fleetId:travelFleetId,waypoints:[travelDestination]},"scheduled-0","occupation-route",occupationStart.economy!.nextTickAt-1);
do {const next=produce(occupation,occupation.economy!,()=>0);occupation={...next.campaign,economy:next.economy};} while(occupation.military!.orders.length||occupation.military!.fleets[travelFleetId].travel);
const occupationView=campaignView(occupation,"scheduled-0");
let conquest=orderFleet(occupation,{kind:"fleet.form",expectedRevision:occupation.revision,starId:occupation.seats[0].home!,fighters:2,infantry:6},"scheduled-0","conquest-fleet",occupation.economy!.nextTickAt-1);
{const next=produce(conquest,conquest.economy!,()=>0);conquest={...next.campaign,economy:next.economy};}
const conquestFleet=Object.keys(conquest.military!.fleets).find(id=>id!==travelFleetId)!;
conquest=orderRoute(conquest,{kind:"fleet.route",expectedRevision:conquest.revision,fleetId:conquestFleet,waypoints:[travelDestination]},"scheduled-0","conquest-route",conquest.economy!.nextTickAt-1);
do {const next=produce(conquest,conquest.economy!,()=>0);conquest={...next.campaign,economy:next.economy};} while(conquest.military!.orders.length||conquest.military!.fleets[conquestFleet].travel);
export function arrivalFrame(time:number) {return {records:arrivalRecords(time>=3200?[campaignView(conquest,"scheduled-0"),occupationView]:time>=1200?[occupationView]:[]),loading:time>=500&&time<1200,error:time>=2200&&time<3200?historyRecoveryMessage:""};}
import {converse} from "@shared/conversations";
import {conversationMessages} from "$lib/conversation-history";
let conversationCreated=converse(productionStart,{kind:"conversation.create",expectedRevision:productionStart.revision,title:"Nacre talks"},"scheduled-0","lab-room",1000);
const conversationId="room:lab-room";
conversationCreated=converse(conversationCreated,{kind:"conversation.send",expectedRevision:conversationCreated.revision,roomId:conversationId,keyVersion:1,body:"Creator's earlier private note."},"scheduled-0","lab-private-note",2000);
const conversationInvited=converse(conversationCreated,{kind:"conversation.invite",expectedRevision:conversationCreated.revision,roomId:conversationId,roomRevision:conversationCreated.diplomacy!.rooms[conversationId].revision,seat:1,scope:"future"},"scheduled-0","lab-invite",3000);
const conversationJoined=converse(conversationInvited,{kind:"conversation.accept",expectedRevision:conversationInvited.revision,roomId:conversationId,roomRevision:conversationInvited.diplomacy!.rooms[conversationId].revision},"scheduled-1","lab-accept",4000);
const conversationGreeting=converse(conversationJoined,{kind:"conversation.send",expectedRevision:conversationJoined.revision,roomId:conversationId,keyVersion:2,body:"Can we discuss the systems near Nacre?"},"scheduled-0","lab-greeting",5000);
const conversationReply=converse(conversationGreeting,{kind:"conversation.send",expectedRevision:conversationGreeting.revision,roomId:conversationId,keyVersion:2,body:"Yes. Let’s discuss our plans before making an agreement."},"scheduled-1","lab-reply",6000);
const sharingMessage = {...conversationCreated.diplomacy!.rooms[conversationId].message!, sourceRevision:conversationCreated.revision};
const sharingInvited=converse(conversationCreated,{kind:"conversation.invite",expectedRevision:conversationCreated.revision,roomId:conversationId,roomRevision:conversationCreated.diplomacy!.rooms[conversationId].revision,seat:1,scope:"selected",history:[{id:sharingMessage.id,revision:sharingMessage.sourceRevision}]},"scheduled-0","lab-selected-invite",3000,[sharingMessage]);
const sharingAccepted=converse(sharingInvited,{kind:"conversation.accept",expectedRevision:sharingInvited.revision,roomId:conversationId,roomRevision:sharingInvited.diplomacy!.rooms[conversationId].revision,historyConsent:"lab-selected-invite"},"scheduled-1","lab-selected-accept",4000);
export function sharingFrame(time:number){const view=campaignView(time<0?conversationCreated:time>=1200?sharingAccepted:sharingInvited,time<0?"scheduled-0":"scheduled-1");return {view,selected:conversationId,messages:conversationMessages([view],conversationId)};}
export function conversationFrame(time:number){const state=time>=4800?conversationReply:time>=2200?conversationGreeting:time>=1200?conversationJoined:conversationInvited;const view=campaignView(state,"scheduled-1");return {view,selected:conversationId,messages:conversationMessages([campaignView(conversationGreeting,"scheduled-1"),view].filter(v=>v.revision<=view.revision),conversationId),drafts:{[conversationId]:time>=3200&&time<4800?"Yes. Let’s discuss our plans before making an agreement.":""}};}
export function draftRecoveryFrame(time: number) {
  const conflict = time >= 2200 && time < 3200;
  return { ...conversationFrame(2200), drafts: {[conversationId]: "My text remains available while the saved draft is reviewed."}, draftReady: time >= 1200, draftSaving: time >= 3200 && time < 4800, draftSaved: time >= 1200 && !conflict && !(time >= 3200 && time < 4800), draftConflict: conflict, draftError: conflict ? new RecoveryConflict("draft").message : "" };
}
export const scenarios = [
 {id:"credit-offers",label:"Credit offers: exact terms → pending → reconnect → reserved → settled",frames:[0,500,1200,2200,3200,4800].map(at=>({at,feedback:{message:"",error:"",remedy:at===1200?"network":"none"}}))},
 {id:"invalid-recovery",label:"Invalid order: review → explicit local discard confirmation",frames:[0,1200].map(at=>({at,feedback:{message:"",error:"",remedy:"validation"}}))},
 {id:"draft-recovery",label:"Draft recovery: reload → saved → other tab conflict → saved",frames:[0,1200,2200,3200,4800].map(at=>({at,feedback:{message:"",error:"",remedy:"none"}}))},
 {id:"conversation-sharing",label:"Selected history: scope review → acceptance → authorized messages",frames:[{at:0,feedback:{message:"",error:"",remedy:"none"}},{at:500,feedback:campaignPending},{at:1200,feedback:campaignFeedback("conversation.accept",{status:"accepted"})}]},
 {id:"return-briefing",label:"Return briefing: recover period → review → pending → visit saved",frames:[{at:0,feedback:{message:"",error:"",remedy:"none"}},{at:500,feedback:campaignPending},{at:1200,feedback:{message:"",error:"",remedy:"none"}},{at:1600,feedback:{message:"",error:"",remedy:"none"}},{at:1800,feedback:campaignPending},{at:2200,feedback:campaignPending},{at:3200,feedback:campaignFeedback("campaign.visit",{status:"accepted"})},{at:3800,feedback:{message:"",error:"Connection interrupted. Your visit has not changed. Retry when connected.",remedy:"retry"}},{at:4200,feedback:campaignPending},{at:4800,feedback:{message:"",error:"",remedy:"none"}},{at:5300,feedback:{message:"",error:"",remedy:"none"}}]},
 {id:"conversations",label:"Conversation: invitation → accepted → message → reconnect → sent",frames:[{at:0,feedback:{message:"",error:"",remedy:"none"}},{at:500,feedback:campaignPending},{at:1200,feedback:campaignFeedback("conversation.accept",{status:"accepted"})},{at:2200,feedback:{message:"",error:"",remedy:"none"}},{at:3200,feedback:{message:"",error:campaignNetworkMessage,remedy:"network"}},{at:4800,feedback:campaignFeedback("conversation.send",{status:"accepted"})}]},
 {id:"arrivals",label:"Arrivals: loading → orbit secured → reconnect → conquest",frames:[{at:0,feedback:{message:"No reports loaded.",error:"",remedy:"none"}},{at:500,feedback:campaignPending},{at:1200,feedback:{message:"Orbit secured; surface remains rival-held.",error:"",remedy:"none"}},{at:2200,feedback:{message:"",error:historyRecoveryMessage,remedy:"network"}},{at:3200,feedback:{message:"System secured; held credits released.",error:"",remedy:"none"}}]},
 {id:"contacts",label:"Fleet contacts: unknown → loading → acquired → retry → last seen",frames:[{at:0,feedback:{message:"No fleet observation acquired.",error:"",remedy:"none"}},{at:500,feedback:{message:"Loading authorized contact records…",error:"",remedy:"none"}},{at:1200,feedback:{message:"Fleet observation acquired.",error:"",remedy:"none"}},{at:2200,feedback:{message:"",error:historyRecoveryMessage,remedy:"network"}},{at:3200,feedback:{message:"Current position unknown; last acquired position retained in history.",error:"",remedy:"none"}}]},
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
