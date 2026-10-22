import { appendFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

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
      if (label === "batch" || label === "repeat")
        db.runTransaction = function (callback: any, ...options: any[]) {
          const txNumber = ++transactions,
            txStart = performance.now();
          let attempts = 0,
            reads = 0,
            writes = 0,
            readMs = 0,
            callbackMs = 0;
          return original
            .call(
              this,
              async (tx: any) => {
                attempts++;
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
            )
            .finally(() =>
              emit({
                event: "transaction",
                span,
                txNumber,
                attempts,
                reads,
                writes,
                readMs,
                callbackMs,
                totalMs: performance.now() - txStart,
              }),
            );
        };
      try {
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
        db.runTransaction = original;
      }
    },
  };
}
