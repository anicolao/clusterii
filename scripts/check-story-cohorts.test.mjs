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
