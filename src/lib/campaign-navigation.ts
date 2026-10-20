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
