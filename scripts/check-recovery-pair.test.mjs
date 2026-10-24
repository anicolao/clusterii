import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  pairArgs,
  preparePair,
  runPair,
  predecessor,
} from "./recovery-pair.mjs";
import { feature, singleCase, childExit } from "./recovery-settlement.mjs";
test("exact ordered pair is allowlisted, with one emulator lifecycle after serialized compilation", async () => {
  assert.deepEqual(pairArgs(["feature009-010-pair"]), [predecessor, feature]);
  for (const args of [[], ["all"], ["feature009-010-pair", "generate"]])
    assert.throws(() => pairArgs(args));
  const calls = [];
  const env = { identity: "same" };
  assert.equal(
    await preparePair(
      async (bin, args, e) => {
        assert.equal(e, env);
        calls.push([bin, args]);
        return calls.length === 3 ? 1 : 0;
      },
      env,
      "/owned",
    ),
    1,
  );
  assert.deepEqual(calls.slice(0, 2), [
    ["bun", ["x", "svelte-kit", "sync"]],
    ["bun", ["run", "--cwd", "functions", "build"]],
  ]);
  assert.equal(calls.filter((x) => x[1].includes("emulators:exec")).length, 1);
  assert.equal(
    calls[2][1].at(-1),
    "node scripts/recovery-pair.mjs inside-pair",
  );
});
test("real failed subprocess retires before second starts; both exits survive without success laundering", async () => {
  const folder = mkdtempSync(join(tmpdir(), "cluster-pair-fixture-"));
  const calls = [];
  const result = await runPair(
    async (bin, args, env) => {
      assert.equal(bin, "bun");
      const index = calls.length;
      const expected = singleCase(["feature010-phone"]).map((x) =>
        x === feature ? (index === 0 ? predecessor : feature) : x,
      );
      assert.deepEqual(args.slice(0, -1), expected);
      assert.equal(env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18080");
      if (index === 1) {
        const prior = JSON.parse(readFileSync(join(folder, "pair-exits.json")));
        assert.equal(prior[0].exit, 1);
        assert.ok(prior[0].finishedAt >= prior[0].startedAt);
      }
      calls.push(args);
      return childExit(
        process.execPath,
        ["-e", `process.exitCode=${index === 0 ? 1 : 0}`],
        process.env,
      );
    },
    { FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080" },
    folder,
  );
  assert.equal(result, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    JSON.parse(readFileSync(join(folder, "pair-exits.json"))).map(
      (x) => x.exit,
    ),
    [1, 0],
  );
  assert.notEqual(calls[0].at(-1), calls[1].at(-1));
});
test("infrastructure exit is retained and does not launch a partial-state successor", async () => {
  const folder = mkdtempSync(join(tmpdir(), "cluster-pair-stop-"));
  let calls = 0;
  assert.equal(
    await runPair(
      async () => {
        calls++;
        return 127;
      },
      {},
      folder,
    ),
    127,
  );
  assert.equal(calls, 1);
});
