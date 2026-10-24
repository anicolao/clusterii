import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  singleCase,
  runtimeGuard,
  pinned,
  childExit,
  finishObservation,
  executeSingle,
  feature,
  prepareSingle,
} from "./recovery-settlement.mjs";
test("entry permits exactly the frozen feature010 phone verification", () => {
  const a = singleCase(["feature010-phone"]);
  assert.deepEqual(a, [
    "x",
    "playwright",
    "test",
    "--config",
    "playwright.stories.config.ts",
    feature,
    "--project=phone",
    "--max-failures=1",
    "--retries=0",
    "--update-snapshots=none",
  ]);
  for (const args of [
    [],
    ["all"],
    ["feature010-phone", "--update-snapshots"],
    ["feature010-desktop"],
  ])
    assert.throws(() => singleCase(args));
  const env = {
    CLUSTER_PINNED_RENDERER: pinned,
    CLUSTER_NIX_RENDERER_DIGEST: pinned.split("@")[1],
  };
  runtimeGuard("linux", env);
  for (const bad of [
    { CLUSTER_STORY_FILTER: ".*" },
    { CLUSTER_STORY_COHORTS: "viewport" },
    { CLUSTER_STORY_MODE: "generate" },
    { CLUSTER_NIX_RENDERER_DIGEST: "wrong" },
  ])
    assert.throws(() => runtimeGuard("linux", { ...env, ...bad }));
  assert.throws(() => runtimeGuard("darwin", env));
});
test("actual subprocess exit is preserved and observer wait begins only afterward", async () => {
  const events = [];
  let recorded;
  const code = await executeSingle({
    args: ["feature010-phone"],
    run: async (args) => {
      assert.equal(args.includes(feature), true);
      events.push("test-start");
      const result = await childExit(
        process.execPath,
        ["-e", "process.exitCode=7"],
        process.env,
      );
      events.push("test-exit");
      return result;
    },
    observe: async () => {
      events.push("observer");
      return { status: "complete" };
    },
    record: (r) => {
      recorded = r;
    },
  });
  assert.equal(code, 7);
  assert.equal(recorded.testExit, 7);
  assert.deepEqual(events, ["test-start", "test-exit", "observer"]);
});
test("bounded observation waits preserve terminal errors and cannot manufacture success", async () => {
  let elapsed = 0,
    reads = 0;
  const state = await finishObservation({
    read: () => ({ status: ++reads === 3 ? "complete" : "recording" }),
    sleep: async (ms) => {
      elapsed += ms;
    },
    now: () => elapsed,
  });
  assert.equal(state.status, "complete");
  assert.equal(elapsed, 500);
  elapsed = 0;
  const expired = await finishObservation({
    read: () => ({ status: "pending" }),
    sleep: async (ms) => {
      elapsed += ms;
    },
    now: () => elapsed,
  });
  assert.equal(elapsed, 60000);
  assert.equal(expired.reason, "completion-deadline");
  for (const status of ["not-requested", "unavailable"]) {
    let r;
    assert.equal(
      await executeSingle({
        args: ["feature010-phone"],
        run: async () => 0,
        observe: async () => ({ status }),
        record: (value) => (r = value),
      }),
      2,
    );
    assert.equal(r.observation.status, status);
  }
  assert.equal(
    await executeSingle({
      args: ["feature010-phone"],
      run: async () => 9,
      observe: async () => {
        throw Error("fixture");
      },
      record: () => {},
    }),
    9,
  );
  assert.equal(
    await executeSingle({
      args: ["feature010-phone"],
      run: async () => 0,
      observe: async () => ({ status: "complete" }),
      record: () => {},
    }),
    0,
  );
});
test("renderer recovery dispatch uses the same pinned launcher with no suite fallback", () => {
  const outer = readFileSync("nix/ci-renderer.sh", "utf8"),
    inner = readFileSync("scripts/ci-in-renderer.sh", "utf8"),
    runner = readFileSync("scripts/recovery-settlement.mjs", "utf8");
  assert.match(outer, /recovery:feature010-phone/);
  const arm = inner.split("  recovery)\n")[1].split("    ;;", 1)[0];
  assert.equal(
    arm.trim(),
    '[ "$#" -eq 2 ] || exit 2\n    case "$2" in\n      feature010-phone) node scripts/recovery-settlement.mjs "$2" ;;\n      gallery-large) node scripts/recovery-gallery.mjs "$2" ;;\n      *) exit 2 ;;\n    esac',
  );
  assert.doesNotMatch(arm, /test:stories|generate|application/);
  assert.match(outer, /Artifact ownership restoration failed/);
  assert.match(runner, /Existing profile evidence must be preserved/);
  assert.match(runner, /Clean exact-source checkout required/);
  assert.match(runner, /inside-feature010-phone/);
});

test("preparation serializes sync/build and preserves failure without starting emulators", async () => {
  const expected = [
    ["x", "svelte-kit", "sync"],
    ["run", "--cwd", "functions", "build"],
    [
      "x",
      "firebase",
      "emulators:exec",
      "--project",
      "demo-clusterii",
      "--only",
      "auth,database,firestore,functions",
      "node scripts/recovery-settlement.mjs inside-feature010-phone",
    ],
  ];
  for (const failureAt of [0, 1, 2, -1]) {
    const calls = [];
    const env = { fixture: "redacted" };
    const result = await prepareSingle(async (a, e) => {
      assert.equal(e, env);
      calls.push(a);
      return calls.length - 1 === failureAt ? 17 : 0;
    }, env);
    assert.equal(result, failureAt < 0 ? 0 : 17);
    assert.deepEqual(
      calls,
      expected.slice(0, failureAt < 0 ? 3 : failureAt + 1),
    );
  }
});

test("actual launcher rejects non-allowlisted commands before touching renderer ownership", async () => {
  const env = {
    ...process.env,
    ...Object.fromEntries(
      [
        "containerd",
        "rootShell",
        "engine",
        "imageArchive",
        "imageTag",
        "imageConfig",
        "imageDigest",
        "nixCommand",
      ].map((k) => [k, "must-not-execute"]),
    ),
  };
  for (const args of [
    ["recovery", "feature010-desktop"],
    ["recovery", "feature010-phone", "--update-snapshots"],
    ["recovery", "all"],
  ])
    assert.equal(
      await childExit("bash", ["nix/ci-renderer.sh", ...args], env),
      2,
    );
});
