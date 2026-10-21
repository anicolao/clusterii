import { orderFleet } from "@shared/fleets";
import { campaignView, orderConstruction, type Campaign } from "@shared/campaign";
import { converse } from "@shared/conversations";
import { produce } from "@shared/production";
import { orderRoute } from "@shared/travel";
import { distance } from "@shared/galaxy";

/** Complete, ordered production-reducer history for report presentation review. */
export function mixedBriefing(initial: Campaign) {
  let state = structuredClone(initial);
  const commander = state.seats[0].uid, sender = state.seats[1].uid;
  const records = [campaignView(state, commander)];
  const record = (next: Campaign) => {
    state = next;
    records.push(campaignView(state, commander));
  };
  const advance = () => {
    const next = produce(state, state.economy!, () => 0);
    record({ ...next.campaign, economy: next.economy });
  };
  record(orderConstruction(state, {kind:"construction.build", expectedRevision:state.revision, starId:state.seats[0].home!, type:"market"}, commander, "briefing-market", state.economy!.nextTickAt-1));
  record(orderFleet(state, {kind:"fleet.form", expectedRevision:state.revision, starId:state.seats[0].home!, fighters:2, infantry:1}, commander, "briefing-fleet", state.economy!.nextTickAt-1));
  advance();
  const fleet = Object.values(state.military!.fleets).find(fleet => fleet.uid === commander)!;
  const origin = state.galaxy.stars.find(star => star.id === fleet.starId)!;
  const destination = state.galaxy.stars.filter(star => !state.systems[star.id].orbit && star.id !== origin.id).sort((a,b) => distance(a,origin)-distance(b,origin))[0];
  record(orderRoute(state, {kind:"fleet.route", expectedRevision:state.revision, fleetId:fleet.id, waypoints:[destination.id]}, commander, "briefing-route", state.economy!.nextTickAt-1));
  do { advance(); } while(state.military!.orders.length || state.military!.fleets[fleet.id].travel);
  while(state.construction!.orders.length) advance();
  record(converse(state, {kind:"conversation.create", expectedRevision:state.revision, title:"Border talks"}, sender, "briefing-room", 1000));
  const roomId = "room:briefing-room";
  record(converse(state, {kind:"conversation.invite", expectedRevision:state.revision, roomId, roomRevision:state.diplomacy!.rooms[roomId].revision, seat:0, scope:"future"}, sender, "briefing-invite", 2000));
  record(converse(state, {kind:"conversation.accept", expectedRevision:state.revision, roomId, roomRevision:state.diplomacy!.rooms[roomId].revision}, commander, "briefing-accept", 3000));
  record(converse(state, {kind:"conversation.send", expectedRevision:state.revision, roomId, keyVersion:state.diplomacy!.rooms[roomId].keyVersion, body:"Let us discuss the border."}, sender, "briefing-message", 4000));
  record(orderConstruction(state, {kind:"construction.build", expectedRevision:state.revision, starId:state.seats[0].home!, type:"camp"}, commander, "briefing-next-build", state.economy!.nextTickAt-1));
  return {snapshot:campaignView(state,commander),records};
}
