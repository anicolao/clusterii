import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { settlementTiming } from "./browser/story-helpers/settlement-timing";

test("settlement timing preserves SDK outcomes, failures and redacts arguments", async () => {
  const enabled = process.env.CLUSTER_SETTLEMENT_TIMING, host = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.CLUSTER_SETTLEMENT_TIMING = "1";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18080";
  try {
    const path = join(mkdtempSync(join(tmpdir(), "cluster-timing-unit-")), "events.jsonl");
    let effect = 0;
    const tx = { get: async (_secret: unknown) => 7, getAll: async () => [7], set: () => { effect++; return tx; }, update: () => tx, delete: () => tx, create: () => tx };
    const db = { projectId: "demo-clusterii", runTransaction: async (fn: any) => fn(tx) };
    const original = db.runTransaction, originalGet = tx.get;
    const timing = settlementTiming(db, path);
    expect(await timing.span("batch", () => db.runTransaction(async (t: typeof tx) => {
      expect(await t.get("private-document-path")).toBe(7);
      expect(t.set()).toBe(tx);
      return 1;
    }))).toBe(1);
    expect(effect).toBe(1);
    expect(db.runTransaction).toBe(original);
    expect(tx.get).toBe(originalGet);
    const failure = new Error("private failure value");
    await expect(timing.span("batch", () => db.runTransaction(async () => { throw failure; }))).rejects.toBe(failure);
    expect(db.runTransaction).toBe(original);
    const text = readFileSync(path, "utf8");
    expect(text).not.toContain("private");
    expect(text).not.toContain("document");
    const events = text.trim().split("\n").map(line => JSON.parse(line));
    expect(events.filter(e => e.event === "transaction")).toHaveLength(2);
    expect(events.find(e => e.event === "transaction")).toMatchObject({ attempts: 1, reads: 1, writes: 1 });
    expect(events.find(e => e.event === "complete")).toMatchObject({ ticks: 1, transactions: 1 });
    expect(events.find(e => e.event === "failed")).toBeDefined();
    expect(() => settlementTiming({projectId:"production"}, path)).toThrow("loopback demo");
    process.env.CLUSTER_SETTLEMENT_TIMING = "0";
    expect(await settlementTiming(db,path).span("batch",async()=>9)).toBe(9);
    expect(readFileSync(path,"utf8")).toBe(text);
  } finally {
    if (enabled === undefined) delete process.env.CLUSTER_SETTLEMENT_TIMING; else process.env.CLUSTER_SETTLEMENT_TIMING = enabled;
    if (host === undefined) delete process.env.FIRESTORE_EMULATOR_HOST; else process.env.FIRESTORE_EMULATOR_HOST = host;
  }
});
