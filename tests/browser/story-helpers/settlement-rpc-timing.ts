import { performance } from "node:perf_hooks";

export type RpcMetrics = {
  rpcCalls: number;
  rpcCallbacks: number;
  rpcFailures: number;
  rpcMs: number;
  serverMarkerSamples: number;
  serverMarkerInvalid: number;
  rpcToServerMarkerMs: number;
  serverMarkerToCallbackMs: number;
};
export const rpcMetrics = (): RpcMetrics => ({
  rpcCalls: 0,
  rpcCallbacks: 0,
  rpcFailures: 0,
  rpcMs: 0,
  serverMarkerSamples: 0,
  serverMarkerInvalid: 0,
  rpcToServerMarkerMs: 0,
  serverMarkerToCallbackMs: 0,
});

// Instrument an already initialized native gRPC stub, never the GAX retry layer.
// Retain the call object, receivers, request/metadata/options and callback values.
// Only response.commitTime contributes to derived durations; no payload is logged.
export function observeCommitRpc(
  stub: any,
  current: () => RpcMetrics | undefined,
) {
  const descriptor = Object.getOwnPropertyDescriptor(stub, "commit");
  const native = stub.commit;
  if (typeof native !== "function")
    throw new Error("Missing native commit RPC");
  stub.commit = function (this: any, ...args: any[]) {
    const metrics = current();
    if (!metrics) return native.apply(this, args);
    const index = args.length - 1;
    const callback = args[index];
    if (typeof callback !== "function")
      throw new Error("Missing native RPC callback");
    metrics.rpcCalls++;
    const begin = performance.now(),
      wall = Date.now();
    args[index] = function (this: any, ...responseArgs: any[]) {
      const elapsed = performance.now() - begin;
      metrics.rpcCallbacks++;
      metrics.rpcMs += elapsed;
      if (responseArgs[0]) metrics.rpcFailures++;
      else {
        const marker = responseArgs[1]?.commitTime;
        // Proto timestamps in this pinned SDK use integer/string/Long seconds.
        const seconds = Number(marker?.seconds),
          nanos = Number(marker?.nanos ?? 0);
        const before = seconds * 1000 + nanos / 1e6 - wall;
        // Shared-host wall clocks are only a coarse anchor. Reject out-of-window
        // values rather than clamp them or mislabel them server processing time.
        if (
          Number.isFinite(before) &&
          Number.isInteger(seconds) &&
          Number.isInteger(nanos) &&
          nanos >= 0 &&
          nanos < 1e9 &&
          before >= 0 &&
          before <= elapsed
        ) {
          metrics.serverMarkerSamples++;
          metrics.rpcToServerMarkerMs += before;
          metrics.serverMarkerToCallbackMs += elapsed - before;
        } else metrics.serverMarkerInvalid++;
      }
      return callback.apply(this, responseArgs);
    };
    try {
      return native.apply(this, args);
    } catch (error) {
      // Preserve synchronous transport setup failures as well as async status.
      metrics.rpcFailures++;
      metrics.rpcMs += performance.now() - begin;
      throw error;
    }
  };
  return () => {
    if (descriptor) Object.defineProperty(stub, "commit", descriptor);
    else delete stub.commit;
  };
}

export async function observeInitializedCommitRpcs(
  db: any,
  current: () => RpcMetrics | undefined,
) {
  const clients = db._clientPool?._activeClients;
  if (!(clients instanceof Map) || clients.size === 0)
    throw new Error("RPC timing requires initialized Firestore clients");
  const restores: (() => void)[] = [];
  try {
    for (const client of clients.keys()) {
      // Do not initialize another transport or change pool/authorization settings.
      if (!client.firestoreStub)
        throw new Error("RPC timing requires a native stub");
      restores.push(observeCommitRpc(await client.firestoreStub, current));
    }
    return () => {
      for (const restore of restores.reverse()) restore();
    };
  } catch (error) {
    for (const restore of restores.reverse()) restore();
    throw error;
  }
}
