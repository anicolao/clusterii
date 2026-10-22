import type { ResearchState, Technology } from "@shared/production";

export interface ResearchDraft {
  target: Technology;
  baseline: Technology;
  restoredCommandId?: string;
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
    ...(previous?.restoredCommandId
      ? { restoredCommandId: previous.restoredCommandId }
      : {}),
    target:
      previous && previous.target !== previous.baseline
        ? previous.target
        : baseline,
  };
}

export interface RecoveredResearch {
  id: string;
  gameId: string;
  accountId: string;
  target: Technology;
}
// Only authenticated outbox recovery supplies this target. A newer unsent edit
// remains the player's intent; recovery never changes the original command.
export function restoreResearchDraft(
  previous: ResearchDraft | undefined,
  research: ResearchState,
  recovered: RecoveredResearch | null,
  accountId: string,
  gameId: string,
): ResearchDraft {
  const current = refreshResearchDraft(previous, research);
  if (
    !recovered ||
    recovered.accountId !== accountId ||
    recovered.gameId !== gameId
  )
    return current;
  if (previous?.restoredCommandId === recovered.id) return current;
  return {
    ...current,
    restoredCommandId: recovered.id,
    target:
      previous && previous.target !== previous.baseline
        ? current.target
        : recovered.target,
  };
}
