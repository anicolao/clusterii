import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settlementTiming } from "./browser/story-helpers/settlement-timing";

test("settlement timing preserves SDK outcomes, failures and redacts arguments", async () => {
  const enabled = process.env.CLUSTER_SETTLEMENT_TIMING,
    host = process.env.FIRESTORE_EMULATOR_HOST,
    rpc = process.env.CLUSTER_SETTLEMENT_RPC_TIMING;
  process.env.CLUSTER_SETTLEMENT_TIMING = "1";
  process.env.CLUSTER_SETTLEMENT_RPC_TIMING = "0";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18080";
  try {
    const path = join(
      mkdtempSync(join(tmpdir(), "cluster-timing-unit-")),
      "events.jsonl",
    );
    let effect = 0;
    const tx = {
      commit: async () => db.request("commit", "private-wire-body"),
      get: async (_secret: unknown) => 7,
      getAll: async () => [7],
      set: () => {
        effect++;
        return tx;
      },
      update: () => tx,
      delete: () => tx,
      create: () => tx,
    };
    const db: any = {
      projectId: "demo-clusterii",
      request: async (_method: string, _body: unknown) => 7,
      runTransaction: async (fn: any) => {
        const result = await fn(tx);
        await tx.commit();
        return result;
      },
    };
    const original = db.runTransaction,
      originalGet = tx.get,
      originalRequest = db.request,
      originalCommit = tx.commit;
    const timing = settlementTiming(db, path);
    expect(
      await timing.span<number>("batch", () =>
        db.runTransaction(async (t: typeof tx) => {
          expect(await t.get("private-document-path")).toBe(7);
          expect(t.set()).toBe(tx);
          return 1;
        }),
      ),
    ).toBe(1);
    expect(effect).toBe(1);
    expect(db.runTransaction).toBe(original);
    expect(tx.get).toBe(originalGet);
    expect(tx.commit).toBe(originalCommit);
    expect(db.request).toBe(originalRequest);
    const failure = new Error("private failure value");
    await expect(
      timing.span("batch", () =>
        db.runTransaction(async () => {
          throw failure;
        }),
      ),
    ).rejects.toBe(failure);
    expect(db.runTransaction).toBe(original);
    const text = readFileSync(path, "utf8");
    expect(text).not.toContain("private");
    expect(text).not.toContain("document");
    const events = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.filter((e) => e.event === "transaction")).toHaveLength(2);
    expect(events.find((e) => e.event === "transaction")).toMatchObject({
      attempts: 1,
      reads: 1,
      writes: 1,
      commitCalls: 1,
      commitRequestCalls: 1,
      commitFailures: 0,
      commitRequestFailures: 0,
    });
    expect(events.find((e) => e.event === "complete")).toMatchObject({
      ticks: 1,
      transactions: 1,
    });
    expect(events.find((e) => e.event === "failed")).toBeDefined();
    expect(() => settlementTiming({ projectId: "production" }, path)).toThrow(
      "loopback demo",
    );
    process.env.CLUSTER_SETTLEMENT_TIMING = "0";
    expect(await settlementTiming(db, path).span("batch", async () => 9)).toBe(
      9,
    );
    expect(readFileSync(path, "utf8")).toBe(text);
  } finally {
    if (rpc === undefined) delete process.env.CLUSTER_SETTLEMENT_RPC_TIMING;
    else process.env.CLUSTER_SETTLEMENT_RPC_TIMING = rpc;
    if (enabled === undefined) delete process.env.CLUSTER_SETTLEMENT_TIMING;
    else process.env.CLUSTER_SETTLEMENT_TIMING = enabled;
    if (host === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = host;
  }
});

test("commit timing preserves receivers, arguments and errors across concurrent SDK continuations", async () => {
  const enabled = process.env.CLUSTER_SETTLEMENT_TIMING;
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const rpc = process.env.CLUSTER_SETTLEMENT_RPC_TIMING;
  process.env.CLUSTER_SETTLEMENT_TIMING = "1";
  process.env.CLUSTER_SETTLEMENT_RPC_TIMING = "0";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18080";
  const path = join(
    mkdtempSync(join(tmpdir(), "cluster-commit-unit-")),
    "events.jsonl",
  );
  const firstBody = { secret: "private first envelope" };
  const secondBody = { secret: "private second envelope" };
  const failedBody = { secret: "private rejected envelope" };
  const requestTag = { secret: "private request tag" };
  const retryCodes = [10];
  const failure = new Error("private rejected transaction");
  const firstResult = { secret: "private first result" };
  const secondResult = { secret: "private second result" };
  const transactions: Transaction[] = [];
  let releaseFirst!: () => void;
  const waitFirst = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  class Transaction {
    constructor(
      readonly db: Database,
      readonly body: object,
    ) {}
    async get(_path: string) {
      return 7;
    }
    async getAll() {
      return [7];
    }
    set() {
      return this;
    }
    update() {
      return this;
    }
    delete() {
      return this;
    }
    create() {
      return this;
    }
    async commit(marker: object) {
      expect(this).toBeInstanceOf(Transaction);
      expect(marker).toBe(requestTag);
      return this.db.request("commit", this.body, requestTag, retryCodes);
    }
  }
  class Database {
    projectId = "demo-clusterii";
    async request(method: string, body: object, tag: object, codes: number[]) {
      expect(this === db).toBe(true);
      expect(method).toBe("commit");
      expect(tag).toBe(requestTag);
      expect(codes).toBe(retryCodes);
      if (body === failedBody) throw failure;
      if (body === firstBody) await waitFirst;
      else {
        expect(body).toBe(secondBody);
        releaseFirst();
      }
      return body === firstBody ? firstResult : secondResult;
    }
    async runTransaction(
      fn: (tx: Transaction) => Promise<object>,
      options: { body: object },
    ) {
      expect(this === db).toBe(true);
      const tx = new Transaction(this, options.body);
      transactions.push(tx);
      const result = await fn(tx);
      const committed = await tx.commit(requestTag);
      expect(committed).toBe(
        options.body === firstBody ? firstResult : secondResult,
      );
      return result;
    }
  }
  const db = new Database();
  try {
    const timing = settlementTiming(db, path);
    const results = await timing.span("batch", () =>
      Promise.all([
        db.runTransaction(
          async (tx) => {
            await tx.get("private path");
            return firstResult;
          },
          { body: firstBody },
        ),
        db.runTransaction(
          async (tx) => {
            await tx.getAll();
            await tx.getAll();
            return secondResult;
          },
          { body: secondBody },
        ),
      ]),
    );
    expect(results[0]).toBe(firstResult);
    expect(results[1]).toBe(secondResult);
    await expect(
      timing.span("batch", () =>
        db.runTransaction(async () => firstResult, { body: failedBody }),
      ),
    ).rejects.toBe(failure);
    expect(Object.hasOwn(db, "request")).toBe(false);
    expect(Object.hasOwn(db, "runTransaction")).toBe(false);
    for (const tx of transactions) {
      expect(Object.hasOwn(tx, "commit")).toBe(false);
      expect(tx.commit).toBe(Transaction.prototype.commit);
    }
    const text = readFileSync(path, "utf8");
    expect(text).not.toContain("private");
    expect(text).not.toContain("secret");
    const events = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const tx = events.filter((e) => e.event === "transaction");
    expect(tx).toHaveLength(3);
    expect(
      tx
        .filter((e) => e.span === 1)
        .sort((a, b) => a.txNumber - b.txNumber)
        .map((e) => e.reads),
    ).toEqual([1, 2]);
    for (const entry of tx) {
      expect(entry.commitCalls).toBe(1);
      expect(entry.commitRequestCalls).toBe(1);
      expect(entry.commitMs).toBeGreaterThanOrEqual(entry.commitRequestMs);
      expect(entry.totalMs).toBeGreaterThanOrEqual(
        entry.callbackMs + entry.commitMs,
      );
    }
    expect(tx.find((e) => e.span === 2)).toMatchObject({
      commitFailures: 1,
      commitRequestFailures: 1,
      attempts: 1,
    });
  } finally {
    if (rpc === undefined) delete process.env.CLUSTER_SETTLEMENT_RPC_TIMING;
    else process.env.CLUSTER_SETTLEMENT_RPC_TIMING = rpc;
    if (enabled === undefined) delete process.env.CLUSTER_SETTLEMENT_TIMING;
    else process.env.CLUSTER_SETTLEMENT_TIMING = enabled;
    if (host === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = host;
  }
});
