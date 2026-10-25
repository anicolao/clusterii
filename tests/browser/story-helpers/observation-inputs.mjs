// Test-only entropy identities. Actual accounts, campaign IDs, grants, commands,
// and observation acquisition remain production behavior. No draw is supplied.
export const observationPrefix = "Scheduled story observation ";
/**
 * @param {import("../../../shared/campaign.js").Campaign} current
 * @param {string} id
 * @param {string} uid
 * @param {string} starId
 * @param {number} tick
 */
export function observationInputs(current, id, uid, starId, tick) {
  if (!current.name.startsWith(observationPrefix))
    return [current.seed, id, uid, starId, tick];
  const seat = current.seats.findIndex((seat) => seat.uid === uid);
  if (
    current.id !== id ||
    seat < 0 ||
    current.seed !== "0123456789abcdef".repeat(4)
  )
    throw new Error("Invalid illustrated observation entropy context");
  return [
    current.seed,
    "illustrated-observation",
    `seat-${seat}`,
    starId,
    tick,
  ];
}
/** @param {string} source @param {NodeJS.ProcessEnv} env */
export function instrumentObservationSource(source, env) {
  if (
    env.GCLOUD_PROJECT !== "demo-clusterii" ||
    env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080"
  )
    throw new Error(
      "Observation entropy fixture requires the isolated demo Firestore Emulator",
    );
  const signature = "observationDraw(current.seed, id, uid, starId, tick)";
  if (source.split(signature).length !== 2)
    throw new Error(
      "Observation service signature changed; review the entropy boundary",
    );
  return (
    `import { observationInputs as __observationInputs } from ${JSON.stringify(import.meta.url)};\n` +
    source.replace(
      signature,
      "observationDraw(...__observationInputs(current, id, uid, starId, tick))",
    )
  );
}
