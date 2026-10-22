import { admissionPrefix } from "./admission-clock.mjs";
export const constructionStoryPrefix = `${admissionPrefix}construction `;
// Explicit story clock: admission is one millisecond after the latest confirmed
// boundary. Tick advancement remains an explicitly labelled real-service call.
/**
 * @param {{name?: string, economy?: {nextTickAt?: number}} | null | undefined} campaign
 * @param {number} now
 */
export function constructionTime(campaign, now) {
  if (!campaign?.name?.startsWith(constructionStoryPrefix)) return now;
  const boundary = campaign.economy?.nextTickAt;
  if (typeof boundary !== "number" || !Number.isSafeInteger(boundary))
    return now;
  return boundary - 900000 + 1;
}
