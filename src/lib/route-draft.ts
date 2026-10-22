export interface RouteDraftScope {
  account: string | null;
  campaigns: Record<string, Record<string, string[]>>;
}
// Unsent waypoints belong to this campaign-route lifetime, never browser storage.
export function scopeRouteDrafts(
  previous: RouteDraftScope,
  account: string | null,
  memberships?: string[],
): RouteDraftScope {
  if (!account || previous.account !== account)
    return { account, campaigns: {} };
  if (!memberships) return previous;
  return {
    account,
    campaigns: Object.fromEntries(
      Object.entries(previous.campaigns).filter(([id]) =>
        memberships.includes(id),
      ),
    ),
  };
}
export function refreshRouteDrafts(
  previous: Record<string, string[]> = {},
  ownedFleetIds: string[],
): Record<string, string[]> {
  // Preserve exact intent, including invalid/empty edits; retired fleets cannot recover drafts.
  return Object.fromEntries(
    Object.entries(previous).filter(([id]) => ownedFleetIds.includes(id)),
  );
}
