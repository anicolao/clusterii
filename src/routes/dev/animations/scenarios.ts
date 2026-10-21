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
import { createCampaign, joinOrLeave, maintainCampaign, activateEncryptionEpoch, startCampaign, campaignDirectory, campaignView } from '@shared/campaign';
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
export const scenarios = [
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
export const duration = 3600;
