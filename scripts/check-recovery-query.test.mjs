import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { queryArgs, prepareQuery } from "./recovery-query.mjs";
import { singleCase } from "./recovery-settlement.mjs";
test("query observation retains exact strict feature010 phone arguments", () => {
  assert.deepEqual(
    queryArgs(["feature010-query-phone"]),
    singleCase(["feature010-phone"]),
  );
  for (const args of [
    [],
    ["all"],
    ["feature010-query-phone", "generate"],
    ["feature010-phone"],
  ])
    assert.throws(() => queryArgs(args));
});
test("serial compilation precedes real emulator; original failure exits without fallback", async () => {
  const calls = [],
    env = { fixed: "preserved" };
  const result = await prepareQuery(
    async (bin, args, actual) => {
      assert.equal(actual, env);
      calls.push([bin, args]);
      return calls.length === 3 ? 7 : 0;
    },
    env,
    "/owned/output",
  );
  assert.equal(result, 7);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], ["bun", ["x", "svelte-kit", "sync"]]);
  assert.deepEqual(calls[1], ["bun", ["run", "--cwd", "functions", "build"]]);
  assert.equal(
    calls[2][1].at(-1),
    'bun x playwright test --config playwright.stories.config.ts tests/e2e/010-zero-science/zero-science.spec.ts --project=phone --max-failures=1 --retries=0 --update-snapshots=none --output="/owned/output/playwright"',
  );
  let count = 0;
  assert.equal(
    await prepareQuery(
      async () => {
        count++;
        return 4;
      },
      env,
      "/owned/output",
    ),
    4,
  );
  assert.equal(count, 1);
});
test("observer remains identical to locally executed source and no original budgets change", () => {
  // sha from source82e32854, validated real run. Wrapper/script orchestration may differ.
  const source = readFileSync("scripts/query-observer/QueryObserver.java");
  return import("node:crypto").then(({ createHash }) => {
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      "f198e05b3d26daed54530bd2e9bc532daacbcb149f3d96daaf2ef8453f95f053",
    );
  });
});
