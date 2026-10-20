import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Transaction } from "firebase-admin/firestore";
import { onValueCreated } from "firebase-functions/v2/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  type Campaign,
  campaignDirectory,
  campaignView,
  createCampaign,
  joinOrLeave,
  startCampaign,
} from "../../shared/campaign.js";
import {
  type Context,
  type Envelope,
  newKey,
  provider,
  unwrap,
  wrap,
} from "../../shared/crypto.js";
import {
  type Profile,
  type ProfileView,
  profileContext,
} from "../../shared/profile.js";

const db = () => getFirestore();
const context = (
  gameId: string,
  revision: number,
  objectId: string,
): Context => ({ gameId, revision, objectId, epoch: 1, keyVersion: 1 });
async function requireDeveloper(uid: string) {
  const user = await getAuth().getUser(uid);
  if (user.disabled || user.customClaims?.developer !== true)
    throw new HttpsError(
      "permission-denied",
      "Development access is required.",
    );
}
export const campaignKey = onCall({ invoker: "public" }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  await requireDeveloper(request.auth.uid);
  const id = request.data?.gameId;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
    throw new HttpsError("invalid-argument", "Invalid campaign.");
  const head = await db().doc(`campaignStates/${id}`).get();
  if (!head.exists) throw new HttpsError("not-found", "Campaign not found.");
  if (!head.get("memberUids").includes(request.auth.uid))
    return { joined: false };
  const key = await db()
    .doc(`campaignKeys/${id}/members/${request.auth.uid}`)
    .get();
  if (!key.exists)
    throw new HttpsError(
      "failed-precondition",
      "Campaign access could not be recovered.",
    );
  return { joined: true, kek: key.get("kek"), mode: "mock", epoch: 1 };
});
async function publish(
  tx: Transaction,
  state: Campaign,
  serverKey: string,
  keys: Map<string, string>,
) {
  const envelope = await provider("mock").seal(
    state,
    serverKey,
    context(state.id, state.revision, "canonical"),
  );
  const head = {
    revision: state.revision,
    phase: state.phase,
    startAt: state.startAt,
    memberUids: state.seats.map((s) => s.uid),
    mode: "mock",
    envelope,
  };
  tx.set(db().doc(`campaignStates/${state.id}`), head);
  tx.create(
    db().doc(`campaignStates/${state.id}/versions/${state.revision}`),
    head,
  );
  tx.set(
    db().doc(`developmentCampaigns/${state.id}`),
    campaignDirectory(state),
  );
  for (const seat of state.seats) {
    const kek = keys.get(seat.uid);
    if (!kek) throw new Error("Missing recipient key");
    const key = newKey();
    const ctx = context(state.id, state.revision, `member:${seat.uid}`);
    const view = {
      revision: state.revision,
      envelope: await provider("mock").seal(
        campaignView(state, seat.uid),
        key,
        ctx,
      ),
      grant: await wrap(key, kek, seat.uid, ctx, "mock"),
    };
    tx.set(db().doc(`campaignViews/${state.id}/members/${seat.uid}`), view);
    tx.create(
      db().doc(
        `campaignViews/${state.id}/members/${seat.uid}/versions/${state.revision}`,
      ),
      view,
    );
  }
}
async function readRecipientKeys(tx: Transaction, id: string, uids: string[]) {
  const keys = new Map<string, string>();
  const records = await Promise.all(
    uids.map((uid) => tx.get(db().doc(`campaignKeys/${id}/members/${uid}`))),
  );
  for (let i = 0; i < uids.length; i++)
    if (records[i].exists) keys.set(uids[i], records[i].get("kek"));
  return keys;
}
export const processCampaign = onValueCreated(
  { ref: "/commands/{gameId}/{uid}/{commandId}", retry: true },
  async (event) => {
    const { gameId, uid, commandId } = event.params;
    const incoming = event.data.val() as { kind: string; envelope: Envelope };
    const receiptRef = db().doc(`campaignReceipts/${uid}/results/${commandId}`);
    // Authority is rechecked at processing time, independent of client-supplied fields.
    let developer = true;
    try {
      await requireDeveloper(uid);
    } catch (error) {
      if (
        !(error instanceof HttpsError && error.code === "permission-denied") &&
        !(
          error instanceof Error &&
          "code" in error &&
          error.code === "auth/user-not-found"
        )
      )
        throw error;
      developer = false;
    }
    const now = Date.now();
    const seed = newKey();
    const newServerKey = newKey();
    const recipientKey = newKey();
    await db().runTransaction(async (tx) => {
      const [receipt, head, serverKeyRecord, accountKey, profileRecord] =
        await Promise.all([
          tx.get(receiptRef),
          tx.get(db().doc(`campaignStates/${gameId}`)),
          tx.get(db().doc(`campaignKeys/${gameId}`)),
          tx.get(db().doc(`profileKeys/${uid}`)),
          tx.get(db().doc(`profiles/${uid}`)),
        ]);
      if (receipt.exists) return;
      const revision = head.exists ? Number(head.get("revision")) : 0;
      let next: Campaign;
      try {
        if (!developer) throw new Error("permission");
        if (!accountKey.exists || !profileRecord.exists)
          throw new Error("profile-required");
        const action = await provider("mock").open<{ kind: string }>(
          incoming.envelope,
          accountKey.get("kek"),
          context(gameId, 0, `command:${commandId}`),
        );
        if (action.kind !== incoming.kind) throw new Error("invalid");
        const view = profileRecord.data() as ProfileView;
        const ctx = profileContext(uid, view.revision);
        const key = await unwrap(
          view.grant,
          accountKey.get("kek"),
          uid,
          ctx,
          "mock",
        );
        const profile = await provider("mock").open<Profile>(
          view.envelope,
          key,
          ctx,
        );
        if (!head.exists) next = createCampaign(gameId, action, seed, now);
        else {
          const current = await provider("mock").open<Campaign>(
            head.get("envelope"),
            serverKeyRecord.get("key"),
            context(gameId, revision, "canonical"),
          );
          next = joinOrLeave(current, action, uid, profile, now);
        }
      } catch (error) {
        const reason =
          error instanceof Error &&
          [
            "permission",
            "profile-required",
            "invalid",
            "exists",
            "started",
            "already-joined",
            "full",
            "conflict",
          ].includes(error.message)
            ? error.message
            : "invalid";
        tx.create(receiptRef, { gameId, revision, status: "rejected", reason });
        return;
      }
      const keys = await readRecipientKeys(
        tx,
        gameId,
        next.seats.map((s) => s.uid),
      );
      if (next.seats.some((s) => s.uid === uid) && !keys.has(uid)) {
        keys.set(uid, recipientKey);
        tx.create(db().doc(`campaignKeys/${gameId}/members/${uid}`), {
          kek: recipientKey,
          mode: "mock",
          epoch: 1,
        });
      }
      if (!head.exists)
        tx.create(db().doc(`campaignKeys/${gameId}`), {
          key: newServerKey,
          mode: "mock",
          epoch: 1,
        });
      if (next.revision !== revision)
        await publish(
          tx,
          next,
          head.exists ? serverKeyRecord.get("key") : newServerKey,
          keys,
        );
      tx.create(receiptRef, {
        gameId,
        revision: next.revision,
        status: "accepted",
      });
    });
  },
);
export async function startDueCampaign(id: string, now: number) {
  await db().runTransaction(async (tx) => {
    const [head, keyRecord] = await Promise.all([
      tx.get(db().doc(`campaignStates/${id}`)),
      tx.get(db().doc(`campaignKeys/${id}`)),
    ]);
    if (!head.exists) return;
    const revision = Number(head.get("revision"));
    const current = await provider("mock").open<Campaign>(
      head.get("envelope"),
      keyRecord.get("key"),
      context(id, revision, "canonical"),
    );
    const next = startCampaign(current, now);
    if (next === current) return;
    const keys = await readRecipientKeys(
      tx,
      id,
      next.seats.map((s) => s.uid),
    );
    await publish(tx, next, keyRecord.get("key"), keys);
  });
}
export const startScheduledCampaigns = onSchedule(
  "every 1 minutes",
  async () => {
    const now = Date.now();
    const queued = await db()
      .collection("campaignStates")
      .where("phase", "==", "scheduled")
      .get();
    for (const head of queued.docs)
      if (head.get("startAt") <= now) await startDueCampaign(head.id, now);
  },
);
