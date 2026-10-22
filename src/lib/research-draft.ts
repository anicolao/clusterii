import type { ResearchState, Technology } from "@shared/production";

export interface ResearchDraft {
  target: Technology;
  baseline: Technology;
}
export interface ResearchDraftScope {
  account: string | null;
  campaigns: Record<string, ResearchDraft>;
}
// Unsent intent lives only in the campaign route, never durable command storage.
export function scopeResearchDrafts(
  previous: ResearchDraftScope,
  account: string | null,
  memberships?: string[],
): ResearchDraftScope {
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
export function refreshResearchDraft(
  previous: ResearchDraft | undefined,
  research: ResearchState,
): ResearchDraft {
  const baseline = research.orders?.at(-1)?.target ?? research.target;
  return {
    baseline,
    target:
      previous && previous.target !== previous.baseline
        ? previous.target
        : baseline,
  };
}
