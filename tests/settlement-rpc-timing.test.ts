import { test, expect } from "bun:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { settlementTiming } from "./browser/story-helpers/settlement-timing";
import {
  observeCommitRpc,
  observeInitializedCommitRpcs,
  rpcMetrics,
  type RpcMetrics,
} from "./browser/story-helpers/settlement-rpc-timing";

test("native commit observation preserves concurrent argument/result identity and restoration", async () => {
  const context = new AsyncLocalStorage<RpcMetrics>();
  const calls: any[] = [];
  const token = { private: "call handle" };
  const request = { private: "document and key" },
    metadata = { private: "identity" },
    options = { private: "authorization" };
  const response = {
    private: "response",
    commitTime: { seconds: 0, nanos: 0 },
  };
  const failure = new Error("private failure");
  const callbackThis = { private: "callback receiver" };
  const prototype = {
    commit(this: any, ...args: any[]) {
      expect(this).toBe(stub);
      expect(args.slice(0, 3)).toEqual([request, metadata, options]);
      expect(args[0]).toBe(request);
      expect(args[1]).toBe(metadata);
      expect(args[2]).toBe(options);
      calls.push(args);
      return token;
    },
  };
  const stub = Object.create(prototype);
  const restore = observeCommitRpc(stub, () => context.getStore());
  const a = rpcMetrics(),
    b = rpcMetrics();
  const callback = function (this: any, error: any, value: any) {
    expect(this).toBe(callbackThis);
    if (error) expect(error).toBe(failure);
    else expect(value).toBe(response);
    return token;
  };
  try {
    expect(
      context.run(a, () => stub.commit(request, metadata, options, callback)),
    ).toBe(token);
    expect(
      context.run(b, () => stub.commit(request, metadata, options, callback)),
    ).toBe(token);
    expect(calls[1][3].call(callbackThis, failure, undefined)).toBe(token);
    expect(calls[0][3].call(callbackThis, null, response)).toBe(token);
    expect(a).toMatchObject({
      rpcCalls: 1,
      rpcCallbacks: 1,
      rpcFailures: 0,
      serverMarkerInvalid: 1,
    });
    expect(b).toMatchObject({
      rpcCalls: 1,
      rpcCallbacks: 1,
      rpcFailures: 1,
      serverMarkerSamples: 0,
    });
    stub.commit(request, metadata, options, callback);
    expect(calls[2][3]).toBe(callback); // unrelated SDK traffic unchanged
    expect(JSON.stringify([a, b])).not.toContain("private");
  } finally {
    restore();
  }
  expect(Object.hasOwn(stub, "commit")).toBe(false);
  expect(stub.commit).toBe(prototype.commit);
});

test("pinned native gRPC transport preserves real response and correlates server marker", async () => {
  const require = createRequire(
    new URL("../functions/package.json", import.meta.url),
  );
  const grpc = require("google-gax").grpc;
  const service = {
    commit: {
      path: "/fixture/Commit",
      requestStream: false,
      responseStream: false,
      requestSerialize: (v: any) => Buffer.from(JSON.stringify(v)),
      requestDeserialize: (v: Buffer) => JSON.parse(v.toString()),
      responseSerialize: (v: any) => Buffer.from(JSON.stringify(v)),
      responseDeserialize: (v: Buffer) => JSON.parse(v.toString()),
    },
  };
  const server = new grpc.Server();
  server.addService(service, {
    commit(call: any, done: any) {
      expect(call.request).toEqual({ private: "unchanged envelope" });
      const now = Date.now();
      const response = {
        private: "unchanged result",
        commitTime: {
          seconds: String(Math.floor(now / 1000)),
          nanos: (now % 1000) * 1e6,
        },
      };
      setTimeout(() => done(null, response), 15);
    },
  });
  const port = await new Promise<number>((resolve, reject) =>
    server.bindAsync(
      "127.0.0.1:0",
      grpc.ServerCredentials.createInsecure(),
      (e: any, port: number) => (e ? reject(e) : resolve(port)),
    ),
  );
  const Client = grpc.makeGenericClientConstructor(service, "fixture");
  const client = new Client(
    `127.0.0.1:${port}`,
    grpc.credentials.createInsecure(),
  );
  const keys = [
    "CLUSTER_SETTLEMENT_TIMING",
    "CLUSTER_SETTLEMENT_RPC_TIMING",
    "FIRESTORE_EMULATOR_HOST",
  ];
  const previous = keys.map((key) => process.env[key]);
  process.env.CLUSTER_SETTLEMENT_TIMING = "1";
  process.env.CLUSTER_SETTLEMENT_RPC_TIMING = "1";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18080";
  const output = join(
    mkdtempSync(join(tmpdir(), "cluster-rpc-test-")),
    "timing.jsonl",
  );
  const native = client.commit;
  const tx: any = {
    commit: () => db.request("commit"),
    get() {},
    getAll() {},
    set() {},
    update() {},
    create() {},
    delete() {},
  };
  const db: any = {
    projectId: "demo-clusterii",
    _clientPool: {
      _activeClients: new Map([
        [{ firestoreStub: Promise.resolve(client) }, {}],
      ]),
    },
    async request() {
      return new Promise<any>((resolve, reject) =>
        client.commit(
          { private: "unchanged envelope" },
          (error: any, result: any) =>
            error ? reject(error) : resolve(result),
        ),
      );
    },
    async runTransaction(callback: any) {
      await callback(tx);
      return tx.commit();
    },
  };
  try {
    const value: any = await settlementTiming(db, output).span("batch", () =>
      db.runTransaction(async () => {}),
    );
    const text = readFileSync(output, "utf8");
    const events = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const metrics = events.find((event) => event.event === "transaction");
    expect(value.private).toBe("unchanged result");
    expect(metrics).toMatchObject({
      commitRequestCalls: 1,
      rpcCalls: 1,
      rpcCallbacks: 1,
      rpcFailures: 0,
      serverMarkerSamples: 1,
      serverMarkerInvalid: 0,
    });
    expect(metrics.rpcToServerMarkerMs).toBeGreaterThanOrEqual(0);
    expect(metrics.serverMarkerToCallbackMs).toBeGreaterThanOrEqual(0);
    expect(
      metrics.rpcToServerMarkerMs + metrics.serverMarkerToCallbackMs,
    ).toBeCloseTo(metrics.rpcMs, 5);
    expect(text).not.toContain("private");
    expect(events.some((event) => event.event === "event-loop")).toBe(true);
    expect(metrics.commitRequestMs).toBeGreaterThanOrEqual(metrics.rpcMs);
    expect(client.commit).toBe(native);
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
    client.close();
    await new Promise<void>((resolve) => server.tryShutdown(() => resolve()));
  }
});

test("partial native-stub installation failure restores earlier clients without initializing replacements", async () => {
  const native = () => {
    throw new Error("must not invoke");
  };
  const stub = { commit: native };
  const db = {
    _clientPool: {
      _activeClients: new Map<any, any>([
        [{ firestoreStub: Promise.resolve(stub) }, {}],
        [{}, {}],
      ]),
    },
  };
  await expect(
    observeInitializedCommitRpcs(db, () => undefined),
  ).rejects.toThrow("native stub");
  expect(stub.commit).toBe(native);
});

test("synchronous transport rejection retains the exact failure and no false server marker", () => {
  const failure = new Error("private transport error");
  const stub = {
    commit(..._args: any[]) {
      throw failure;
    },
  };
  const native = stub.commit,
    metrics = rpcMetrics();
  const restore = observeCommitRpc(stub, () => metrics);
  try {
    let caught;
    try {
      stub.commit({ private: "payload" }, () => {});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
    expect(metrics).toMatchObject({
      rpcCalls: 1,
      rpcCallbacks: 0,
      rpcFailures: 1,
      serverMarkerSamples: 0,
    });
    expect(JSON.stringify(metrics)).not.toContain("private");
  } finally {
    restore();
  }
  expect(stub.commit).toBe(native);
});
