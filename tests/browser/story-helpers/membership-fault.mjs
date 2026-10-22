import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** @typedef {{phase: string, mode: string, encryptionEpoch: number, revision: number, memberUids: string[], envelope: {gameId: string, mode: string}, [key: string]: unknown}} Head */
/** @typedef {{gameId: string, phase: string, revision: number}} Membership */
/** @typedef {{name: string, phase: string, [key: string]: unknown}} Directory */
export const faultSources = {
  "shared/crypto.ts":
    "78b59d29c94bc4aaacedb580ab884dd87d63de2bf26ffb7a118852f878a9da70",
  "src/lib/campaign-session.ts":
    "ec6fbae152e7da1b1b17dc482cd80be6e57e496a3b54a0089dfcbdf2b2d77f7a",
};
/** @param {{project: string, host: string | undefined, origin: string, sources: Record<string,string>}} scope */
export function validateFaultScope({ project, host, origin, sources }) {
  if (
    project !== "demo-clusterii" ||
    !["127.0.0.1:18080", "localhost:18080"].includes(host ?? "") ||
    origin !== "http://127.0.0.1:4173" ||
    !isDeepStrictEqual(sources, faultSources)
  )
    throw new Error(
      "Membership fault is confined to the reviewed demo loopback runtime and exact sources",
    );
}
/** @param {{gameId: string, uid: string, head: Head, membership: Membership, directory: Directory}} target */
export function faultPlan({ gameId, uid, head, membership, directory }) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(gameId) ||
    !/^[a-zA-Z0-9_-]+$/.test(uid) ||
    !directory?.name?.startsWith("Scheduled story membership fault ") ||
    directory.phase !== "active" ||
    head?.phase !== "active" ||
    head.mode !== "mock" ||
    head.encryptionEpoch !== 1 ||
    head.envelope?.gameId !== gameId ||
    head.envelope?.mode !== "mock" ||
    head.memberUids?.length !== 4 ||
    new Set(head.memberUids).size !== 4 ||
    !head.memberUids.includes(uid) ||
    membership?.gameId !== gameId ||
    membership.phase !== "active" ||
    membership.revision !== head.revision
  )
    throw new Error("Invalid membership fault target");
  return {
    gameId,
    uid,
    before: structuredClone(head),
    membership: structuredClone(membership),
    directory: structuredClone(directory),
    during: {
      ...structuredClone(head),
      memberUids: head.memberUids.filter((id) => id !== uid),
    },
  };
}
/** @param {ReturnType<typeof faultPlan>} plan
 * @param {unknown} head
 * @param {unknown} membership
 * @param {unknown} directory */
export function assertRestorable(plan, head, membership, directory) {
  if (
    !isDeepStrictEqual(head, plan.during) ||
    membership !== undefined ||
    !isDeepStrictEqual(directory, plan.directory)
  )
    throw new Error(
      "Refuse restoration over a concurrent campaign or membership change",
    );
}
/** @param {import("../../../functions/node_modules/firebase-admin/lib/firestore/index").Firestore & {projectId: string}} db
 * @param {string} gameId
 * @param {string} uid
 * @param {string} origin */
export async function revokeMembership(db, gameId, uid, origin) {
  const sources = Object.fromEntries(
    Object.keys(faultSources).map((path) => [
      path,
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    ]),
  );
  const scope = () =>
    validateFaultScope({
      project: db.projectId,
      host: process.env.FIRESTORE_EMULATOR_HOST,
      origin,
      sources,
    });
  scope();
  const headRef = db.doc(`campaignStates/${gameId}`),
    memberRef = db.doc(`campaignMemberships/${uid}/games/${gameId}`),
    directoryRef = db.doc(`developmentCampaigns/${gameId}`);
  const plan = await db.runTransaction(async (tx) => {
    scope();
    const [head, member, directory] = await Promise.all([
      tx.get(headRef),
      tx.get(memberRef),
      tx.get(directoryRef),
    ]);
    const plan = faultPlan({
      gameId,
      uid,
      head: /** @type {Head} */ (head.data()),
      membership: /** @type {Membership} */ (member.data()),
      directory: /** @type {Directory} */ (directory.data()),
    });
    tx.update(headRef, { memberUids: plan.during.memberUids });
    tx.delete(memberRef);
    return plan;
  });
  let restored = false;
  return {
    async restore() {
      if (restored) return;
      scope();
      await db.runTransaction(async (tx) => {
        const [head, member, directory] = await Promise.all([
          tx.get(headRef),
          tx.get(memberRef),
          tx.get(directoryRef),
        ]);
        assertRestorable(plan, head.data(), member.data(), directory.data());
        tx.update(headRef, { memberUids: plan.before.memberUids });
        tx.create(memberRef, plan.membership);
      });
      restored = true;
    },
  };
}
