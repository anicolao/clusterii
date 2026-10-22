import { expect, test } from "bun:test";
import {
  refreshResearchDraft,
  scopeResearchDrafts,
} from "../src/lib/research-draft";
import { rules } from "../shared/rules";
import { technologies, type ResearchState } from "../shared/production";

function state(): ResearchState {
  return {
    target: "navigation",
    levels: { ...rules.startingResearch },
    progressMilli: Object.fromEntries(
      technologies.map((t) => [t, 0]),
    ) as ResearchState["progressMilli"],
  };
}

test("research intent survives authority refresh without replacing a newer local choice", () => {
  const research = state();
  const initial = refreshResearchDraft(undefined, research);
  const draft = { ...initial, target: "investing" as const };
  const accepted = {
    ...research,
    orders: [
      {
        id: "order",
        sequence: 7,
        effectiveTick: 2,
        target: "investing" as const,
      },
    ],
  };
  expect(refreshResearchDraft(draft, research)).toEqual(draft);
  const acknowledged = refreshResearchDraft(draft, accepted);
  expect(acknowledged).toEqual({ target: "investing", baseline: "investing" });
  const newerEdit = { ...draft, target: "recruiting" as const };
  const refreshed = refreshResearchDraft(newerEdit, accepted);
  expect(refreshed).toEqual({ target: "recruiting", baseline: "investing" });
  expect(
    refreshResearchDraft(refreshed, { ...research, target: "investing" }),
  ).toEqual(refreshed);
  expect(refreshResearchDraft(initial, accepted)).toEqual(acknowledged);
  expect(research.orders).toBeUndefined();
  expect(accepted.orders).toHaveLength(1);
});

test("research memory isolates campaigns/accounts and cannot restore revoked intent", () => {
  const first = {
    ...refreshResearchDraft(undefined, state()),
    target: "innovation" as const,
  };
  const second = refreshResearchDraft(undefined, state());
  const scope = { account: "alice", campaigns: { one: first, two: second } };
  expect(scopeResearchDrafts(scope, "alice").campaigns.one).toBe(first);
  expect(scopeResearchDrafts(scope, "alice").campaigns.two.target).toBe(
    "navigation",
  );
  const revoked = scopeResearchDrafts(scope, "alice", ["two"]);
  expect(revoked.campaigns).toEqual({ two: second });
  expect(
    scopeResearchDrafts(revoked, "alice", ["one", "two"]).campaigns.one,
  ).toBeUndefined();
  expect(scopeResearchDrafts(scope, "bob").campaigns).toEqual({});
  expect(scopeResearchDrafts(scope, null).campaigns).toEqual({});
  expect(scope.campaigns.one.target).toBe("innovation");
});
