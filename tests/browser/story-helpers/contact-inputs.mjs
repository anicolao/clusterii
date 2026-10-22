// Explicit illustrated-story entropy domains, not injected scan outcomes.
export const contactPrefix = "Scheduled story fleet contacts ";
/**
 * @param {import("../../../shared/campaign.js").Campaign} current
 * @param {import("../../../shared/campaign.js").Campaign} next
 * @param {string} id
 * @param {string} uid
 * @param {string} target
 * @param {number} tick
 * @returns {[string, string, string, string, number]}
 */
export function contactInputs(current, next, id, uid, target, tick) {
  if (!current.name.startsWith(contactPrefix))
    return [current.seed, id, uid, target, tick];
  const seat = next.seats.findIndex((s) => s.uid === uid);
  const fleet = target.startsWith("fleet:")
    ? next.military?.fleets[target.slice(6)]
    : undefined;
  const owner = next.seats.findIndex((s) => s.uid === fleet?.uid);
  if (
    current.id !== id ||
    next.id !== id ||
    seat < 0 ||
    owner < 0 ||
    current.seed !== "0123456789abcdef".repeat(4) ||
    next.seed !== current.seed ||
    !fleet ||
    !Number.isSafeInteger(fleet.number) ||
    fleet.number < 1 ||
    next.economy?.tick !== tick
  )
    throw new Error("Invalid illustrated fleet-contact entropy context");
  return [
    current.seed,
    "illustrated-fleet-contacts",
    `seat-${seat}`,
    `fleet-seat-${owner}-number-${fleet.number}`,
    tick,
  ];
}
/** @param {string} source @param {NodeJS.ProcessEnv} env */
export function instrumentContactSource(source, env) {
  if (
    env.GCLOUD_PROJECT !== "demo-clusterii" ||
    env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080"
  )
    throw new Error(
      "Fleet-contact entropy fixture requires the isolated demo Firestore Emulator",
    );
  const signature = "observationDraw(current.seed, id, uid, target, tick)";
  if (source.split(signature).length !== 2)
    throw new Error(
      "Fleet-contact service signature changed; review the entropy boundary",
    );
  return (
    `import { contactInputs as __contactInputs } from ${JSON.stringify(import.meta.url)};\n` +
    source.replace(
      signature,
      "observationDraw(...__contactInputs(current, next, id, uid, target, tick))",
    )
  );
}
