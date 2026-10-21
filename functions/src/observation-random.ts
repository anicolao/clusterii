import { createHmac } from "node:crypto";
// Domain-separated deterministic draws remain server-private. The seed is the
// original 256-bit canonical campaign secret, never the public map's PRNG state.
export function observationDraw(
  seed: string,
  gameId: string,
  uid: string,
  starId: string,
  tick: number,
) {
  if (!/^[a-f0-9]{64}$/.test(seed) || !Number.isSafeInteger(tick) || tick < 1)
    throw new Error("Invalid observation context");
  return createHmac("sha256", Buffer.from(seed, "hex"))
    .update(
      JSON.stringify(["cluster-observation-v1", gameId, uid, starId, tick]),
    )
    .digest()
    .readUIntBE(0, 6);
}
