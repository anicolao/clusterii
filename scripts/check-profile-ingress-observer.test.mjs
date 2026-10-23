import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request, Server } from "node:http";
import { once } from "node:events";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installProfileIngressObserver,
  profileIngressTags,
} from "./profile-ingress-observer.mjs";

const path =
  "/functions/projects/demo-clusterii/triggers/us-central1-processProfile-0";
const headers = {
  "ce-id": "private-event",
  "ce-ref": "/profileCommands/private-user/private-command",
  authorization: "private-token",
};
test("binary metadata correlation is bounded and never returns source identifiers or secrets", () => {
  const tags = profileIngressTags(headers);
  assert.match(tags.eventTag, /^[a-f0-9]{64}$/);
  assert.match(tags.commandTag, /^[a-f0-9]{64}$/);
  assert.equal(
    tags.commandTag,
    profileIngressTags({
      ...headers,
      "ce-ref": "profileCommands/private-user/private-command/",
    }).commandTag,
  );
  assert.notEqual(
    tags.eventTag,
    profileIngressTags({ ...headers, "ce-id": "another" }).eventTag,
  );
  assert.deepEqual(
    profileIngressTags({
      "ce-id": "x".repeat(1025),
      "ce-ref": "/campaignCommands/private",
    }),
    {},
  );
  assert.ok(!JSON.stringify(tags).includes("private"));
});

test("native HTTP observer preserves body, headers, status and response while separating arrival/close", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-ingress-observer-"));
  const output = join(dir, "events.jsonl"),
    original = Server.prototype.emit;
  let abortedResponse;
  let announce;
  const abortArrived = new Promise((resolve) => {
    announce = resolve;
  });
  const server = createServer((req, res) => {
    assert.equal(req.headers.authorization, headers.authorization);
    assert.equal(
      req.listenerCount("data"),
      0,
      "observer never consumes or copies body",
    );
    const bytes = [];
    req.on("data", (chunk) => bytes.push(chunk));
    req.on("end", () => {
      assert.equal(Buffer.concat(bytes).toString(), "private-ciphertext");
      if (req.headers["x-fixture-abort"]) {
        abortedResponse = res;
        announce();
        return;
      }
      res.statusCode = 202;
      res.end("original-response");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  const restore = installProfileIngressObserver({ output, port });
  const send = (url, extra = {}) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port,
          path: url,
          method: "POST",
          headers: { ...headers, ...extra },
        },
        (res) => {
          const bytes = [];
          res.on("data", (chunk) => bytes.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(bytes).toString(),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end("private-ciphertext");
    });
  try {
    assert.deepEqual(
      await send(path.replace("demo-clusterii", "other-project")),
      { status: 202, body: "original-response" },
    );
    assert.equal(existsSync(output), false);
    assert.deepEqual(await send(path), {
      status: 202,
      body: "original-response",
    });
    const aborted = request({
      host: "127.0.0.1",
      port,
      path,
      method: "POST",
      headers: { ...headers, "x-fixture-abort": "1" },
    });
    aborted.on("error", () => {});
    aborted.end("private-ciphertext");
    await abortArrived;
    const closed = once(abortedResponse, "close");
    aborted.destroy();
    await closed;
    const text = readFileSync(output, "utf8"),
      events = text.trim().split("\n").map(JSON.parse);
    assert.deepEqual(
      events.map((e) => e.event),
      ["http-arrived", "http-finished", "http-arrived", "http-closed"],
    );
    assert.equal(events[1].status, 202);
    assert.equal(events[0].commandTag, events[1].commandTag);
    assert.equal(events[2].sequence, events[3].sequence);
    assert.ok(events[1].elapsedMs >= 0 && events[3].elapsedMs >= 0);
    assert.ok(!text.includes("private") && !text.includes("original-response"));
  } finally {
    restore();
    server.close();
    await once(server, "close");
    rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(Server.prototype.emit, original);
});

test("diagnostic cap is explicit and does not prevent subsequent HTTP responses", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cluster-ingress-cap-")),
    output = join(dir, "events.jsonl");
  const server = createServer((_req, res) => res.end("unchanged"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port,
    restore = installProfileIngressObserver({ output, port, limit: 1 });
  try {
    for (let n = 0; n < 3; n++) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers,
      });
      assert.equal(await response.text(), "unchanged");
    }
    const events = readFileSync(output, "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(events.length, 2);
    assert.deepEqual(events[1], { event: "limit" });
  } finally {
    restore();
    server.close();
    server.closeAllConnections();
    await once(server, "close");
    rmSync(dir, { recursive: true, force: true });
  }
});
