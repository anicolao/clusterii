import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runViewportCohorts, storyViewports } from "./story-cohorts.mjs";

async function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), "cluster-cohort-test-"));
  try {
    await run(dir, join(dir, "stories"), join(dir, "firestore.log"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function capture(output, viewport) {
  const dir = join(output, "real-story", viewport);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "capture.png"), `unchanged pixels ${viewport}`);
  writeFileSync(join(output, ".last-run.json"), viewport);
}
test("fresh sequential viewport cohorts retain every capture, failed trace, log and status", async () => {
  await fixture(async (dir, output, firestoreLog) => {
    mkdirSync(output);
    writeFileSync(join(output, "old-failure.zip"), "retain me");
    writeFileSync(firestoreLog, "previous failure log");
    let active = 0,
      guards = 0;
    const visits = [];
    await assert.rejects(
      runViewportCohorts({
        output,
        firestoreLog,
        beforeEach: async () => {
          guards++;
          assert.equal(active, 0);
        },
        run: async (viewport) => {
          assert.equal(active++, 0);
          assert.equal(existsSync(output), false);
          visits.push(viewport);
          capture(output, viewport);
          writeFileSync(firestoreLog, `log ${viewport}`);
          await Promise.resolve();
          active--;
          if (viewport === "desktop") {
            writeFileSync(
              join(output, "real-story", viewport, "trace.zip"),
              "retain failure",
            );
            throw new Error("exact comparison failed");
          }
        },
      }),
      /Story cohorts failed: desktop/,
    );
    assert.deepEqual(visits, storyViewports);
    assert.equal(guards, 4);
    for (const viewport of storyViewports) {
      assert.equal(
        readFileSync(
          join(output, "real-story", viewport, "capture.png"),
          "utf8",
        ),
        `unchanged pixels ${viewport}`,
      );
      assert.equal(
        readFileSync(
          join(output, "_cohorts", viewport, "firestore-debug.log"),
          "utf8",
        ),
        `log ${viewport}`,
      );
      assert.equal(
        readFileSync(
          join(output, "_cohorts", viewport, "playwright.json"),
          "utf8",
        ),
        viewport,
      );
      assert.equal(
        JSON.parse(
          readFileSync(join(output, "_cohorts", viewport, "result.json")),
        ).status,
        viewport === "desktop" ? "failed" : "passed",
      );
    }
    assert.equal(
      readFileSync(join(output, "real-story", "desktop", "trace.zip"), "utf8"),
      "retain failure",
    );
    const staging = readdirSync(dir).find((n) =>
      n.startsWith(".story-cohorts-"),
    );
    assert.equal(
      readFileSync(
        join(dir, staging, "previous-root-logs", "firestore-debug.log"),
        "utf8",
      ),
      "previous failure log",
    );
    assert.equal(
      readFileSync(join(dir, staging, "previous", "old-failure.zip"), "utf8"),
      "retain me",
    );
  });
});
test("occupied services abort before moving prior evidence or launching a cohort", async () => {
  await fixture(async (_dir, output, firestoreLog) => {
    mkdirSync(output);
    writeFileSync(join(output, "keep.txt"), "untouched");
    await assert.rejects(
      runViewportCohorts({
        output,
        firestoreLog,
        beforeEach: async () => {
          throw new Error("occupied by another worktree");
        },
        run: async () => assert.fail("must not launch"),
      }),
      /occupied/,
    );
    assert.equal(readFileSync(join(output, "keep.txt"), "utf8"), "untouched");
  });
});
test("interruption retains current artifacts and launches no successor", async () => {
  await fixture(async (_dir, output, firestoreLog) => {
    let stopped = false;
    const visits = [];
    await assert.rejects(
      runViewportCohorts({
        output,
        firestoreLog,
        beforeEach: async () => {},
        shouldStop: () => stopped,
        run: async (viewport) => {
          visits.push(viewport);
          capture(output, viewport);
          stopped = true;
          throw new Error("interrupted child");
        },
      }),
      /interrupted/,
    );
    assert.deepEqual(visits, ["phone"]);
    assert.equal(
      readFileSync(join(output, "real-story", "phone", "capture.png"), "utf8"),
      "unchanged pixels phone",
    );
  });
});
test("an artifact path collision fails rather than overwriting either result", async () => {
  await fixture(async (dir, output, firestoreLog) => {
    await assert.rejects(
      runViewportCohorts({
        output,
        firestoreLog,
        beforeEach: async () => {},
        run: async (viewport) => {
          mkdirSync(output);
          writeFileSync(join(output, "collision.png"), viewport);
        },
      }),
      /artifact collision/,
    );
    assert.equal(readFileSync(join(output, "collision.png"), "utf8"), "phone");
    const staging = readdirSync(dir).find((n) =>
      n.startsWith(".story-cohorts-"),
    );
    assert.equal(
      readFileSync(join(dir, staging, "desktop", "collision.png"), "utf8"),
      "desktop",
    );
  });
});

test("a later ownership guard failure retains completed evidence without launching another process", async () => {
  await fixture(async (_dir, output, firestoreLog) => {
    let guards = 0;
    const visits = [];
    await assert.rejects(
      runViewportCohorts({
        output,
        firestoreLog,
        beforeEach: async () => {
          if (++guards === 2)
            throw new Error("port acquired by another worktree");
        },
        run: async (viewport) => {
          visits.push(viewport);
          capture(output, viewport);
        },
      }),
      /port acquired/,
    );
    assert.deepEqual(visits, ["phone"]);
    assert.equal(
      readFileSync(join(output, "real-story", "phone", "capture.png"), "utf8"),
      "unchanged pixels phone",
    );
  });
});

test("independent service groups retain all failures and never overlap active emulators", async () => {
  await fixture(async (_dir, output, firestoreLog) => {
    let guards = 0,
      active = false;
    const visits = [];
    await assert.rejects(
      runViewportCohorts({
        output,
        firestoreLog,
        groups: ["ordinary", "leased-ticks"],
        beforeEach: async () => {
          assert.equal(active, false);
          guards++;
        },
        run: async (viewport, group) => {
          assert.equal(active, false);
          active = true;
          assert.equal(existsSync(output), false);
          visits.push(`${viewport}/${group}`);
          const dest = join(output, group, viewport);
          mkdirSync(dest, { recursive: true });
          writeFileSync(join(dest, "original.png"), `${viewport}/${group}`);
          writeFileSync(firestoreLog, `${viewport}/${group} original log`);
          active = false;
          if (viewport === "phone" && group === "ordinary")
            throw new Error("first failure retained");
        },
      }),
      /phone\/ordinary/,
    );
    assert.deepEqual(
      visits,
      storyViewports.flatMap((v) => [`${v}/ordinary`, `${v}/leased-ticks`]),
    );
    assert.equal(guards, 8);
    for (const viewport of storyViewports)
      for (const group of ["ordinary", "leased-ticks"]) {
        assert.equal(
          readFileSync(join(output, group, viewport, "original.png"), "utf8"),
          `${viewport}/${group}`,
        );
        const metadata = join(output, "_cohorts", viewport, group);
        assert.equal(
          readFileSync(join(metadata, "firestore-debug.log"), "utf8"),
          `${viewport}/${group} original log`,
        );
        assert.equal(
          JSON.parse(readFileSync(join(metadata, "result.json"))).status,
          viewport === "phone" && group === "ordinary" ? "failed" : "passed",
        );
      }
  });
});

import {
  storyServiceGroups,
  verifyServicePartition,
} from "./story-service-groups.mjs";
test("an explicitly scoped candidate viewport cannot expand or silently accept invalid selections", async () => {
  await fixture(async (_dir, output, firestoreLog) => {
    const visits = [];
    const options = {
      output,
      firestoreLog,
      beforeEach: async () => {},
      run: async (viewport, group) => {
        visits.push([viewport, group]);
      },
      groups: ["ordinary", "leased-ticks"],
    };
    for (const viewports of [[], ["phone", "phone"], ["unknown"]])
      await assert.rejects(
        runViewportCohorts({ ...options, viewports }),
        /Invalid or duplicate viewports/,
      );
    assert.deepEqual(visits, []);
    await runViewportCohorts({ ...options, viewports: ["short"] });
    assert.deepEqual(visits, [
      ["short", "ordinary"],
      ["short", "leased-ticks"],
    ]);
  });
});
function collectionFixture(files) {
  return {
    suites: files.map((file) => ({
      title: file,
      specs: [
        {
          file,
          line: 1,
          column: 1,
          title: "complete original journey",
          tests: [{ projectName: "phone" }],
        },
      ],
    })),
  };
}
test("service grouping keeps every actual test identity once and rejects omitted or duplicated journeys", () => {
  const files = [
    "/repo/tests/browser/identity.story.spec.ts",
    ...[
      "010-zero-science",
      "011-contextual-aftermath",
      "012-fleet-contacts",
    ].map((f) => `/repo/tests/e2e/${f}/complete.spec.ts`),
  ];
  const complete = collectionFixture(files);
  const groups = Object.fromEntries(
    storyServiceGroups.map(({ id, filter }) => [
      id,
      collectionFixture(files.filter((f) => new RegExp(filter).test(f))),
    ]),
  );
  assert.equal(verifyServicePartition(complete, groups), 4);
  const omitted = structuredClone(groups);
  omitted.ordinary.suites = [];
  assert.throws(
    () => verifyServicePartition(complete, omitted),
    /Empty story selection/,
  );
  const duplicated = structuredClone(groups);
  duplicated.ordinary.suites.push(groups["010-zero-science"].suites[0]);
  assert.throws(
    () => verifyServicePartition(complete, duplicated),
    /multiple service groups/,
  );
  const changed = structuredClone(groups);
  changed.ordinary.suites[0].specs[0].title = "different journey";
  assert.throws(
    () => verifyServicePartition(complete, changed),
    /every original test/,
  );
});
