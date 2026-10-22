import { test, expect } from "bun:test";
import { refreshRouteDrafts, scopeRouteDrafts, type RouteDraftScope } from "../src/lib/route-draft";
test("route memory retains exact unsent edits and fences account, membership and retired fleets", () => {
  const draft = ["out-of-range", "out-of-range"], empty: string[] = [];
  const scope: RouteDraftScope = { account: "owner", campaigns: { a: { one: draft, two: empty }, b: { retired: ["star"] } } };
  expect(scopeRouteDrafts(scope, "owner")).toBe(scope);
  const refreshed = refreshRouteDrafts(scope.campaigns.a, ["one", "two"]);
  expect(refreshed.one).toBe(draft);
  expect(refreshed.two).toBe(empty);
  expect(refreshRouteDrafts(scope.campaigns.b, [])).toEqual({});
  expect(scopeRouteDrafts(scope, "owner", ["a"]).campaigns).toEqual({ a: scope.campaigns.a });
  expect(scopeRouteDrafts(scope, "other").campaigns).toEqual({});
  expect(scopeRouteDrafts(scope, null).campaigns).toEqual({});
  expect(scope.campaigns.b.retired).toEqual(["star"]);
});
