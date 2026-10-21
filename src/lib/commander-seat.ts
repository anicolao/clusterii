import type { CampaignView } from "@shared/campaign";
/** Faction, alias and portrait are not commander identities. Older immutable
 * views have no seat field; callers must use neutral labels and no inferred
 * identity-dependent controls until a current authoritative view is available. */
export function commanderSeat(view: CampaignView | undefined): number | null {
  const seat = view?.own.seat;
  return view &&
    Number.isInteger(seat) &&
    seat !== undefined &&
    seat >= 0 &&
    seat < view.roster.length
    ? seat
    : null;
}
