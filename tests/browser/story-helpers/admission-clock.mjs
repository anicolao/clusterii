// Test-only domain inputs, never imported by shipped application/service sources.
export const admissionPrefix = "Scheduled story ";
export const admissionAt = Date.UTC(2026, 0, 1, 12, 1);
export const scheduledAt = Date.UTC(2026, 0, 1, 12, 15);
/** @param {unknown} campaign @param {number} now @param {boolean} starting */
export function admissionTime(campaign, now, starting = false) {
  if (
    !campaign ||
    typeof campaign !== "object" ||
    !("name" in campaign) ||
    typeof campaign.name !== "string" ||
    !campaign.name.startsWith(admissionPrefix)
  )
    return now;
  // Earlier explicit service inputs still exercise the not-due guard.
  return starting ? Math.min(now, scheduledAt) : admissionAt;
}
