import { admissionPrefix } from "./admission-clock.mjs";
export const fleetStoryPrefix = `${admissionPrefix}fleet `;
// Explicit story clock: admission is one millisecond after the latest confirmed
// boundary. Tick advancement remains an explicitly labelled real-service call.
/**
 * @param {{name?: string, economy?: {nextTickAt?: number}} | null | undefined} campaign
 * @param {number} now
 */
export function fleetTime(campaign, now) {
  if (!campaign?.name?.startsWith(fleetStoryPrefix)) return now;
  const boundary = campaign.economy?.nextTickAt;
  if (typeof boundary !== "number" || !Number.isSafeInteger(boundary))
    return now;
  return boundary - 900000 + 1;
}
