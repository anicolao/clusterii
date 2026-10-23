import { appendFileSync } from "node:fs";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { AsyncLocalStorage } from "node:async_hooks";
import { requestEmulatorProfile } from "../../../scripts/emulator-post-marker.mjs";
import {
  observeInitializedCommitRpcs,
  rpcMetrics,
  type RpcMetrics,
} from "./settlement-rpc-timing";

type CommitMetrics = RpcMetrics & {
  commitCalls: number;
  commitMs: number;
  commitFailures: number;
  commitRequestCalls: number;
  commitRequestMs: number;
  commitRequestFailures: number;
};

// Restore the exact own/prototype boundary as well as the method value.
function replaceMethod(target: any, name: string, replacement: any) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  target[name] = replacement;
  return () => {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else delete target[name];
  };
}

// Opt-in test instrumentation only. Never records document paths, values, keys,
// identities, envelopes or errors; delegates every operation to the original SDK.
export function settlementTiming(db: any, output: string) {
  if (process.env.CLUSTER_SETTLEMENT_TIMING !== "1")
    return { span: async <T>(_label: string, run: () => Promise<T>) => run() };
  if (
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" ||
    db.projectId !== "demo-clusterii"
  )
    throw new Error("Settlement timing requires the loopback demo emulator");
  const transactionContext = new AsyncLocalStorage<CommitMetrics>();
  let count = 0,
    sequence = 0;
  const emit = (event: Record<string, string | number | boolean>) => {
    if (count++ < 512)
      appendFileSync(
        output,
        JSON.stringify({ at: performance.now(), ...event }) + "\n",
      );
  };
  return {
    async span<T>(
      label: "clock" | "canonical" | "batch" | "repeat",
      run: () => Promise<T>,
    ): Promise<T> {
      const span = ++sequence,
        start = performance.now();
      emit({ event: "start", label, span });
      const original = db.runTransaction;
      let transactions = 0;
      const restoreSpan: (() => void)[] = [];
      const rpcEnabled =
        process.env.CLUSTER_SETTLEMENT_RPC_TIMING === "1" &&
        (label === "batch" || label === "repeat");
      const loop = rpcEnabled
        ? monitorEventLoopDelay({ resolution: 20 })
        : undefined;
      try {
        if (label === "batch" || label === "repeat") {
          if (label === "batch") requestEmulatorProfile();
          if (rpcEnabled) {
            restoreSpan.push(
              await observeInitializedCommitRpcs(db, () =>
                transactionContext.getStore(),
              ),
            );
            loop!.enable();
          }
          const nativeRequest = db.request;
          if (typeof nativeRequest !== "function")
            throw new Error(
              "Settlement timing requires the SDK request boundary",
            );
          restoreSpan.push(
            replaceMethod(
              db,
              "request",
              async function (this: any, ...args: any[]) {
                const metrics = transactionContext.getStore();
                if (!metrics || args[0] !== "commit")
                  return nativeRequest.apply(this, args);
                metrics.commitRequestCalls++;
                const begin = performance.now();
                try {
                  return await nativeRequest.apply(this, args);
                } catch (error) {
                  metrics.commitRequestFailures++;
                  throw error;
                } finally {
                  metrics.commitRequestMs += performance.now() - begin;
                }
              },
            ),
          );
          restoreSpan.push(
            replaceMethod(
              db,
              "runTransaction",
              function (this: any, callback: any, ...options: any[]) {
                const txNumber = ++transactions,
                  txStart = performance.now();
                let attempts = 0,
                  reads = 0,
                  writes = 0,
                  readMs = 0,
                  callbackMs = 0;
                const metrics: CommitMetrics = {
                  ...rpcMetrics(),
                  commitCalls: 0,
                  commitMs: 0,
                  commitFailures: 0,
                  commitRequestCalls: 0,
                  commitRequestMs: 0,
                  commitRequestFailures: 0,
                };
                const commitRestores = new Map<any, () => void>();
                // Keep context through the SDK continuation after the callback returns.
                // Concurrent transaction requests cannot borrow another call's metrics.
                return transactionContext
                  .run(metrics, async () =>
                    original.call(
                      this,
                      async (tx: any) => {
                        attempts++;
                        if (!commitRestores.has(tx)) {
                          const nativeCommit = tx.commit;
                          if (typeof nativeCommit !== "function")
                            throw new Error(
                              "Settlement timing requires the SDK transaction commit boundary",
                            );
                          commitRestores.set(
                            tx,
                            replaceMethod(
                              tx,
                              "commit",
                              async function (this: any, ...args: any[]) {
                                metrics.commitCalls++;
                                const begin = performance.now();
                                try {
                                  return await nativeCommit.apply(this, args);
                                } catch (error) {
                                  metrics.commitFailures++;
                                  throw error;
                                } finally {
                                  metrics.commitMs += performance.now() - begin;
                                }
                              },
                            ),
                          );
                        }
                        const begin = performance.now(),
                          restore: (() => void)[] = [];
                        for (const name of ["get", "getAll"] as const) {
                          const native = tx[name];
                          tx[name] = async function (...args: any[]) {
                            reads++;
                            const readStart = performance.now();
                            try {
                              return await native.apply(this, args);
                            } finally {
                              readMs += performance.now() - readStart;
                            }
                          };
                          restore.push(() => {
                            tx[name] = native;
                          });
                        }
                        for (const name of [
                          "set",
                          "update",
                          "delete",
                          "create",
                        ] as const) {
                          const native = tx[name];
                          tx[name] = function (...args: any[]) {
                            writes++;
                            return native.apply(this, args);
                          };
                          restore.push(() => {
                            tx[name] = native;
                          });
                        }
                        try {
                          return await callback(tx);
                        } finally {
                          callbackMs += performance.now() - begin;
                          for (const reset of restore) reset();
                        }
                      },
                      ...options,
                    ),
                  )
                  .finally(() => {
                    for (const restore of commitRestores.values()) restore();
                    emit({
                      event: "transaction",
                      span,
                      txNumber,
                      attempts,
                      reads,
                      writes,
                      readMs,
                      callbackMs,
                      ...metrics,
                      totalMs: performance.now() - txStart,
                    });
                  });
              },
            ),
          );
        }
        const result = await run();
        emit({
          event: "complete",
          label,
          span,
          elapsedMs: performance.now() - start,
          transactions,
          ...(typeof result === "number" ? { ticks: result } : {}),
        });
        return result;
      } catch (error) {
        emit({
          event: "failed",
          label,
          span,
          elapsedMs: performance.now() - start,
          transactions,
        });
        throw error;
      } finally {
        if (loop) {
          loop.disable();
          emit({
            event: "event-loop",
            span,
            samples: loop.count,
            maxMs: loop.count ? loop.max / 1e6 : 0,
            meanMs: loop.count ? loop.mean / 1e6 : 0,
          });
        }
        for (const restore of restoreSpan.reverse()) restore();
      }
    },
  };
}
