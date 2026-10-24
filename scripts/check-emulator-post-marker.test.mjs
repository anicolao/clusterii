import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  emulatorArguments,
  aggregateProfile,
  phaseOf,
  startRecording,
  readRecording,
  ProfileDecoder,
  readProfileProcess,
} from "./emulator-post-marker.mjs";
test("emulator selection is exact and exported categories cannot include document or identity metadata", () => {
  const args = [
    "java",
    "-jar",
    "/cache/cloud-firestore-emulator-v1.22.0.jar",
    "--project_id",
    "demo-clusterii",
    "--port",
    "18080",
    "--host",
    "127.0.0.1",
  ];
  assert.equal(emulatorArguments(args), true);
  for (const [from, to] of [
    ["demo-clusterii", "production"],
    ["18080", "8080"],
    ["127.0.0.1", "0.0.0.0"],
    ["v1.22.0", "v1.21.0"],
  ])
    assert.equal(
      emulatorArguments(args.map((v) => v.replace(from, to))),
      false,
    );
  const frame = (type, name) => ({ method: { type: { name: type }, name } });
  const frames = [
    frame(
      "com.google.cloud.datastore.emulator.impl.watch.ListenStreamManager",
      "notifyQueryListeners",
    ),
  ];
  assert.equal(phaseOf(frames), "listener-query");
  assert.equal(
    phaseOf([
      frame(
        "com.google.cloud.datastore.emulator.impl.events.EventManager",
        "reportEvents",
      ),
    ]),
    "event-evaluation-and-payload",
  );
  assert.equal(
    phaseOf([
      frame(
        "com.google.cloud.datastore.emulator.impl.events.FunctionsEmulatorEventPublisher",
        "lambda$publishV2Event$0",
      ),
    ]),
    "async-event-delivery",
  );
  const result = aggregateProfile({
    recording: {
      events: [
        {
          type: "jdk.JavaMonitorEnter",
          values: {
            duration: "PT0.125S",
            stackTrace: { frames },
            eventThread: { javaName: "SECRET_IDENTITY" },
            address: "SECRET_DOCUMENT",
          },
        },
        { type: "jdk.SystemProperty", values: { key: "SECRET_KEY" } },
      ],
    },
  });
  assert.deepEqual(result, {
    buckets: [
      {
        event: "jdk.JavaMonitorEnter",
        phase: "listener-query",
        count: 1,
        durationMs: 125,
      },
    ],
    ignoredEvents: 1,
  });
  assert.ok(!JSON.stringify(result).includes("SECRET"));
});
test("unsafe invocation reports only a fixed guard category and unit tooling cannot claim the story observation", () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-profile-guard-"));
  try {
    execFileSync(
      process.execPath,
      [resolve("scripts/emulator-post-marker.mjs"), "observe"],
      {
        cwd: dir,
        env: {
          ...process.env,
          CLUSTER_EMULATOR_POST_MARKER: "1",
          FIRESTORE_EMULATOR_HOST: "private-unrelated-host",
        },
      },
    );
    const result = JSON.parse(
      readFileSync(join(dir, "ci-evidence/settlement-profile/result.json")),
    );
    assert.equal(result.status, "unavailable");
    assert.equal(result.reason, "guard");
    assert.ok(!JSON.stringify(result).includes("private-unrelated-host"));
    const wiring = readFileSync("scripts/ci-in-renderer.sh", "utf8");
    assert.ok(
      wiring.indexOf("unset CLUSTER_EMULATOR_POST_MARKER") <
        wiring.indexOf("bun run test:story-policy"),
    );
    assert.match(
      wiring,
      /CLUSTER_EMULATOR_POST_MARKER="\$post_marker" bun run test:stories/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("actual jcmd acquisition uses the checked-in JFC and completes a parseable recording", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-jcmd-check-"));
  let child;
  try {
    const source = join(dir, "AttachFixture.java"),
      file = join(dir, "attached.jfr");
    writeFileSync(
      source,
      `import java.util.concurrent.locks.LockSupport;
class AttachFixture { public static void main(String[] args) throws Exception { System.out.println("ready"); long end=System.nanoTime()+10000000000L; while(System.nanoTime()<end) LockSupport.parkNanos(30000000); } }`,
    );
    child = spawn("java", [source], { stdio: ["ignore", "pipe", "pipe"] });
    const ready = await Promise.race([
      once(child.stdout, "data"),
      new Promise((_, reject) => {
        const t = setTimeout(() => reject(Error("fixture startup")), 10000);
        t.unref();
      }),
    ]);
    assert.match(ready[0].toString(), /ready/);
    startRecording(child.pid, file, 2);
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const summary = await readRecording(file);
    assert.ok(
      summary.buckets.some(
        (b) => b.event === "jdk.ThreadPark" && b.count > 0 && b.durationMs > 0,
      ),
    );
    assert.ok(!JSON.stringify(summary).includes("AttachFixture"));
  } finally {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
test("real Nix JDK recording exports bounded wait evidence without JVM metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-jfr-check-"));
  try {
    const source = join(dir, "ProfileFixture.java"),
      recording = join(dir, "fixture.jfr");
    writeFileSync(
      source,
      `import java.nio.file.*; import java.time.*; import java.util.concurrent.locks.LockSupport; import jdk.jfr.*;
class ProfileFixture { public static void main(String[] args) throws Exception { try (Recording r=new Recording()) { r.enable("jdk.ThreadPark").withThreshold(Duration.ZERO).withStackTrace(); r.start(); for(int i=0;i<3;i++) LockSupport.parkNanos(30000000); r.stop(); r.dump(Path.of(args[0])); } } }`,
    );
    execFileSync("java", [source, recording], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    const json = JSON.parse(
      execFileSync(
        "jfr",
        ["print", "--json", "--events", "jdk.ThreadPark", recording],
        { timeout: 10000, maxBuffer: 4 * 1024 * 1024 },
      ).toString(),
    );
    const summary = aggregateProfile(json);
    assert.ok(summary.buckets.reduce((n, b) => n + b.count, 0) >= 3);
    assert.ok(summary.buckets.reduce((n, b) => n + b.durationMs, 0) > 0);
    assert.ok(!JSON.stringify(summary).includes("ProfileFixture"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("streamed JFR events preserve aggregation across escaped strings and chunk boundaries", () => {
  const event = {
    type: "jdk.ThreadPark",
    values: {
      duration: "PT0.02S",
      stackTrace: { frames: [] },
      privateMetadata: 'é } [ \" hidden',
    },
  };
  const document = { recording: { events: [event, event] } };
  const decoder = new ProfileDecoder();
  for (const character of JSON.stringify(document)) decoder.write(character);
  assert.deepEqual(decoder.finish(), aggregateProfile(document));
  for (const value of [
    {},
    { recording: { events: [{ type: "jdk.ThreadPark" }] } },
  ]) {
    const bad = new ProfileDecoder();
    assert.throws(
      () => {
        bad.write(JSON.stringify(value));
        bad.finish();
      },
      (error) => error.category === "schema",
    );
  }
});
test("export failures retain classified process facts without output or exception contents", async () => {
  await assert.rejects(
    readProfileProcess("/nonexistent/SECRET_EXECUTABLE", []),
    (error) => {
      assert.equal(error.diagnostic.category, "spawn");
      assert.equal(error.message, "profile-export");
      assert.ok(!JSON.stringify(error).includes("SECRET"));
      return true;
    },
  );
  const cases = [
    ["exit", 'process.stderr.write("SECRET_METADATA");process.exit(7)', 10000],
    ["signal", 'process.kill(process.pid,"SIGTERM")', 10000],
    ["timeout", "setInterval(()=>{},1000)", 100],
    ["json", `process.stdout.write('{"recording":{"events":[{bad}]}}')`, 10000],
    ["schema", 'process.stdout.write("{}")', 10000],
    [
      "buffer",
      'process.stdout.write(JSON.stringify({recording:{events:[{type:"jdk.ThreadPark",values:{private:"x".repeat(5*1024*1024)}}]}}))',
      10000,
    ],
  ];
  for (const [category, code, timeout] of cases) {
    await assert.rejects(
      readProfileProcess(process.execPath, ["-e", code], timeout),
      (error) => {
        assert.equal(error.diagnostic.category, category);
        assert.ok(Number.isInteger(error.diagnostic.stdoutBytes));
        assert.ok(Number.isInteger(error.diagnostic.stderrBytes));
        assert.ok(!JSON.stringify(error).includes("SECRET"));
        assert.ok(!("stdout" in error) && !("stderr" in error));
        if (category === "exit") assert.equal(error.diagnostic.exitCode, 7);
        return true;
      },
    );
  }
});
