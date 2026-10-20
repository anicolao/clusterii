import type { CampaignDirectory } from "@shared/campaign";
/** Only canonical campaign IDs survive sign-in return; arbitrary redirects do not. */
export function requestedCampaign(search: string): string | null {
  const id = new URLSearchParams(search).get("campaign");
  return id &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)
    ? id
    : null;
}
export function campaignHref(base: string, id: string | null = null) {
  return `${base}/campaigns/${id ? `?campaign=${encodeURIComponent(id)}` : ""}`;
}

export function resumableCampaign(
  games: CampaignDirectory[],
  memberships: string[],
  last: string | null,
) {
  const active = games.filter(
    (game) => game.phase === "active" && memberships.includes(game.id),
  );
  return (
    active.find((game) => game.id === last) ??
    (active.length === 1 ? active[0] : null)
  );
}
export function lastCampaign(uid: string) {
  try {
    return requestedCampaign(
      `?campaign=${encodeURIComponent(localStorage.getItem(`cluster:last-campaign:${uid}`) ?? "")}`,
    );
  } catch {
    return null;
  }
}
export function rememberCampaign(uid: string, id: string) {
  try {
    localStorage.setItem(`cluster:last-campaign:${uid}`, id);
  } catch {
    /* Navigation remains usable when browser storage is unavailable. */
  }
}
