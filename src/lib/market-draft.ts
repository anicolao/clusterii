import { type Development, developments } from "@shared/construction";
import {
  type Allocation,
  initialFocus,
  type MarketFocus,
} from "@shared/market-focus";
export type MarketAllocationDraft = Record<Development, number | undefined>;
export interface MarketDraft {
  allocation: MarketAllocationDraft;
  baseline: Allocation;
}
export interface MarketDraftScope {
  account: string | null;
  campaigns: Record<string, MarketDraft>;
}
// This state belongs to the campaign route instance, never browser storage.
export function scopeMarketDrafts(
  previous: MarketDraftScope,
  account: string | null,
  memberships?: string[],
): MarketDraftScope {
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
export function refreshMarketDraft(
  previous: MarketDraft | undefined,
  focus: MarketFocus = initialFocus(),
): MarketDraft {
  const baseline = { ...(focus.orders.at(-1)?.allocation ?? focus.allocation) };
  const edited =
    previous &&
    developments.some(
      (type) => previous.allocation[type] !== previous.baseline[type],
    );
  return {
    baseline,
    allocation: edited ? { ...previous.allocation } : { ...baseline },
  };
}
