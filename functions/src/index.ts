import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onValueCreated } from "firebase-functions/v2/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { commandDigest } from "../../shared/command-receipt.js";
import {
  type Envelope,
  newKey,
  provider,
  unwrap,
  wrap,
} from "../../shared/crypto.js";
import {
  commandContext,
  type ProfileView,
  profileContext,
  reduceProfile,
} from "../../shared/profile.js";
import {
  admissionAllowed,
  requireCurrentSession,
  type SessionFence,
} from "./session-security.js";

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 3 });
const db = getFirestore();
// Mock key material remains server-only. Real mode requires the reviewed KMS service.
export const profileKey = onCall({ invoker: "public" }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  await requireCurrentSession(request.auth);
  const ref = db.doc(`profileKeys/${request.auth.uid}`);
  const key = newKey();
  const kek = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return existing.get("kek") as string;
    tx.create(ref, { kek: key, mode: "mock", epoch: 1 });
    return key;
  });
  return { kek, mode: "mock", epoch: 1 };
});
export const processProfile = onValueCreated(
  { ref: "/profileCommands/{uid}/{commandId}", retry: true },
  async (event) => {
    const { uid, commandId } = event.params;
    const incoming = event.data.val() as Envelope;
    const requestDigest = await commandDigest(
      `profileCommands/${uid}/${commandId}`,
      event.data.val(),
    );
    const receiptRef = db.doc(`profiles/${uid}/receipts/${commandId}`);
    const headRef = db.doc(`profiles/${uid}`);
    const keyRef = db.doc(`profileKeys/${uid}`);
    // Random inputs are stable across transaction retries; no committed object is re-encrypted.
    const objectKey = newKey();
    await db.runTransaction(async (tx) => {
      const [receipt, head, key, session] = await Promise.all([
        tx.get(receiptRef),
        tx.get(headRef),
        tx.get(keyRef),
        tx.get(db.doc(`sessionFences/${uid}`)),
      ]);
      if (receipt.exists) return;
      const revision = head.exists ? Number(head.get("revision")) : 0;
      let action: unknown;
      let profile: ReturnType<typeof reduceProfile>;
      const kek = key.get("kek") as string;
      try {
        if (
          !admissionAllowed(
            session.data() as SessionFence | undefined,
            event.time,
          )
        )
          throw new Error("session");
        if (!key.exists || key.get("mode") !== "mock")
          throw new Error("invalid");
        action = await provider("mock").open(
          incoming,
          kek,
          commandContext(uid, commandId),
        );
        profile = reduceProfile(revision, action);
      } catch (error) {
        tx.create(receiptRef, {
          requestDigest,
          status: "rejected",
          revision,
          reason:
            error instanceof Error &&
            ["conflict", "session"].includes(error.message)
              ? error.message
              : "invalid",
        });
        return;
      }
      // Validate the prior committed view before replacing it; corrupt history fails closed.
      if (head.exists) {
        const previous = head.data() as ProfileView;
        const context = profileContext(uid, revision);
        const oldKey = await unwrap(previous.grant, kek, uid, context, "mock");
        await provider("mock").open(previous.envelope, oldKey, context);
      }
      const context = profileContext(uid, revision + 1);
      const view: ProfileView = {
        revision: revision + 1,
        envelope: await provider("mock").seal(profile, objectKey, context),
        grant: await wrap(objectKey, kek, uid, context, "mock"),
      };
      tx.create(db.doc(`profiles/${uid}/versions/${revision + 1}`), view);
      tx.set(headRef, view);
      tx.create(receiptRef, {
        requestDigest,
        status: "accepted",
        revision: revision + 1,
      });
    });
  },
);

export {
  processCampaignMigration,
  runCampaignMigration,
} from "./campaign-migration.js";
export {
  campaignCommandKey,
  campaignKey,
  campaignSecurity,
  processCampaign,
  processCampaignMaintenance,
  startScheduledCampaigns,
} from "./campaigns.js";
export { runProduction } from "./production.js";
export { revokeSessions } from "./session-security.js";
