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
import { createCampaign, joinOrLeave, maintainCampaign } from '@shared/campaign';
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
export const scenarios = [
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
