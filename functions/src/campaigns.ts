import { getAuth } from "firebase-admin/auth";
import {
  FieldPath,
  getFirestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  type DatabaseEvent,
  type DataSnapshot,
  onValueCreated,
} from "firebase-functions/v2/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  type Campaign,
  campaignDirectory,
  campaignView,
  createCampaign,
  joinOrLeave,
  maintainCampaign,
  orderConstruction,
  selectMarketFocus,
  selectResearch,
  startCampaign,
} from "../../shared/campaign.js";
import { commandDigest } from "../../shared/command-receipt.js";
import {
  type Context,
  type Envelope,
  type Mode,
  newKey,
  provider,
  unwrap,
  wrap,
} from "../../shared/crypto.js";
import { orderFleet } from "../../shared/fleets.js";
import { assertObservationBudget } from "../../shared/observations.js";
import {
  type Profile,
  type ProfileView,
  profileContext,
} from "../../shared/profile.js";
import {
  canonicalVersions,
  memberVersions,
  recipientKeyPath,
} from "./campaign-paths.js";
import {
  KeyServiceError,
  protect,
  realAvailable,
  unprotect,
} from "./key-protection.js";
import {
  admissionAllowed,
  requireCurrentSession,
  type SessionFence,
} from "./session-security.js";

const db = () => getFirestore();
export const context = (
  gameId: string,
  revision: number,
  objectId: string,
  epoch = 1,
): Context => ({ gameId, revision, objectId, epoch, keyVersion: 1 });
export async function requireDeveloper(uid: string) {
  const user = await getAuth().getUser(uid);
  if (user.disabled || user.customClaims?.developer !== true)
    throw new HttpsError(
      "permission-denied",
      "Development access is required.",
    );
}
export const campaignSecurity = onCall(
  { invoker: "public" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Sign in to continue.");
    await requireCurrentSession(request.auth);
    await requireDeveloper(request.auth.uid);
    return { realAvailable: realAvailable() };
  },
);
export const campaignCommandKey = onCall(
  { invoker: "public" },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Sign in to continue.");
    const uid = request.auth.uid;
    await requireCurrentSession(request.auth);
    await requireDeveloper(uid);
    const ref = db().doc(`campaignCommandKeys/${uid}`),
      purpose = `ingress:${uid}:1`;
    const existing = await ref.get();
    if (existing.exists)
      return {
        kek: await unprotect(existing.get("protectedKey"), purpose),
        mode: "real",
      };
    const key = newKey(),
      protectedKey = await protect(key, purpose);
    const stored = await db().runTransaction(async (tx) => {
      const prior = await tx.get(ref);
      if (prior.exists) return prior.get("protectedKey");
      tx.create(ref, { protectedKey, epoch: 1 });
      return protectedKey;
    });
    return { kek: await unprotect(stored, purpose), mode: "real" };
  },
);
export const campaignKey = onCall({ invoker: "public" }, async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  await requireCurrentSession(request.auth);
  await requireDeveloper(request.auth.uid);
  const id = request.data?.gameId;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
    throw new HttpsError("invalid-argument", "Invalid campaign.");
  const head = await db().doc(`campaignStates/${id}`).get();
  if (!head.exists) throw new HttpsError("not-found", "Campaign not found.");
  if (!head.get("memberUids").includes(request.auth.uid))
    return { joined: false };
  const epoch = Number(head.get("envelope.epoch"));
  const key = await db()
    .doc(recipientKeyPath(id, request.auth.uid, epoch))
    .get();
  if (!key.exists)
    throw new HttpsError(
      "failed-precondition",
      "Campaign access could not be recovered.",
    );
  const mode = head.get("mode") as Mode;
  const kek =
    mode === "real"
      ? await unprotect(
          key.get("protectedKey"),
          `recipient:${id}:${request.auth.uid}:${epoch}`,
        )
      : key.get("kek");
  return { joined: true, kek, mode, epoch };
});
export async function publish(
  tx: Transaction,
  state: Campaign,
  keys: Map<string, string>,
  prepared: Map<string, Promise<Record<string, unknown>>>,
  legacyCanonicalKey?: string,
) {
  // Reuse the complete ciphertext and wrapping result when Firestore retries this transition.
  const signature = JSON.stringify(state);
  let preparation = prepared.get(signature);
  if (!preparation) {
    preparation = (async () => {
      const key = newKey();
      return {
        envelope: await provider(state.mode).seal(
          state,
          key,
          context(state.id, state.revision, "canonical", state.encryptionEpoch),
        ),
        ...(state.mode === "real"
          ? {
              protectedKey: await protect(
                key,
                `canonical:${state.id}:${state.revision}:${state.encryptionEpoch}`,
              ),
            }
          : { canonicalKey: key }),
      };
    })();
    prepared.set(signature, preparation);
  }
  const sealed = await preparation;
  const head = {
    revision: state.revision,
    phase: state.phase,
    pausedAt: state.pausedAt ?? null,
    nextTickAt: state.economy?.nextTickAt ?? null,
    startAt: state.startAt,
    memberUids: state.seats.map((s) => s.uid),
    mode: state.mode,
    encryptionEpoch: state.encryptionEpoch,
    ...sealed,
  };
  tx.set(db().doc(`campaignStates/${state.id}`), head);
  // Keep the prior mock processor's current-key lookup compatible during rollout.
  // Real mode never writes an unprotected key into this record.
  if (state.mode === "mock" && state.encryptionEpoch === 1)
    tx.set(
      db().doc(`campaignKeys/${state.id}`),
      {
        key: sealed.canonicalKey,
        mode: "mock",
        epoch: 1,
        ...(legacyCanonicalKey ? { legacyCanonicalKey } : {}),
      },
      { merge: true },
    );
  tx.create(
    db().doc(
      `${canonicalVersions(state.id, state.encryptionEpoch)}/${state.revision}`,
    ),
    head,
  );
  tx.set(
    db().doc(`developmentCampaigns/${state.id}`),
    campaignDirectory(state),
  );
  for (const seat of state.seats) {
    tx.set(db().doc(`campaignMemberships/${seat.uid}/games/${state.id}`), {
      gameId: state.id,
      phase: state.phase,
      revision: state.revision,
    });
    const kek = keys.get(seat.uid);
    if (!kek) throw new Error("Missing recipient key");
    const ctx = context(
      state.id,
      state.revision,
      `member:${seat.uid}`,
      state.encryptionEpoch,
    );
    const viewSignature = JSON.stringify([signature, seat.uid, kek]);
    let viewPreparation = prepared.get(viewSignature);
    if (!viewPreparation) {
      viewPreparation = (async () => {
        const key = newKey();
        return {
          revision: state.revision,
          envelope: await provider(state.mode).seal(
            campaignView(state, seat.uid),
            key,
            ctx,
          ),
          grant: await wrap(key, kek, seat.uid, ctx, state.mode),
        };
      })();
      prepared.set(viewSignature, viewPreparation);
    }
    const view = await viewPreparation;
    tx.set(db().doc(`campaignViews/${state.id}/members/${seat.uid}`), view);
    if (state.encryptionEpoch > 1)
      tx.set(
        db().doc(
          `campaignViews/${state.id}/members/${seat.uid}/epochs/${state.encryptionEpoch}`,
        ),
        view,
      );
    tx.create(
      db().doc(
        `${memberVersions(state.id, seat.uid, state.encryptionEpoch)}/${state.revision}`,
      ),
      view,
    );
  }
}
export async function readRecipientKeys(
  tx: Transaction,
  id: string,
  uids: string[],
  mode: Mode,
  epoch = 1,
) {
  const keys = new Map<string, string>();
  const records = await Promise.all(
    uids.map((uid) => tx.get(db().doc(recipientKeyPath(id, uid, epoch)))),
  );
  for (let i = 0; i < uids.length; i++)
    if (records[i].exists)
      keys.set(
        uids[i],
        mode === "real"
          ? await unprotect(
              records[i].get("protectedKey"),
              `recipient:${id}:${uids[i]}:${epoch}`,
            )
          : records[i].get("kek"),
      );
  return keys;
}
async function handleCampaign(
  event: DatabaseEvent<DataSnapshot>,
  maintenance: boolean,
) {
  const { gameId, uid, commandId } = event.params;
  const incoming = event.data.val() as { kind: string; envelope: Envelope };
  const requestDigest = await commandDigest(
    `${maintenance ? "maintenanceCommands" : "commands"}/${gameId}/${uid}/${commandId}`,
    incoming,
  );
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
  const prepared = new Map<string, Promise<Record<string, unknown>>>();
  const recipientKey = newKey();
  let protectedRecipient: Awaited<ReturnType<typeof protect>> | undefined;
  await db().runTransaction(async (tx) => {
    const [
      receipt,
      head,
      serverKeyRecord,
      accountKey,
      profileRecord,
      ingressRecord,
      session,
    ] = await Promise.all([
      tx.get(receiptRef),
      tx.get(db().doc(`campaignStates/${gameId}`)),
      tx.get(db().doc(`campaignKeys/${gameId}`)),
      tx.get(db().doc(`profileKeys/${uid}`)),
      tx.get(db().doc(`profiles/${uid}`)),
      tx.get(db().doc(`campaignCommandKeys/${uid}`)),
      tx.get(db().doc(`sessionFences/${uid}`)),
    ]);
    if (receipt.exists) return;
    if (
      !admissionAllowed(session.data() as SessionFence | undefined, event.time)
    ) {
      tx.create(receiptRef, {
        requestDigest,
        gameId,
        revision: head.exists ? Number(head.get("revision")) : 0,
        status: "rejected",
        reason: "session",
      });
      return;
    }
    const revision = head.exists ? Number(head.get("revision")) : 0;
    const epoch = head.exists ? Number(head.get("envelope.epoch")) : 1;
    let next: Campaign;
    const mode = incoming.envelope.mode;
    if (mode !== "mock" && mode !== "real")
      throw new Error("Unsupported command codec");
    const ingressKey =
      developer && mode === "real" && ingressRecord.exists
        ? await unprotect(ingressRecord.get("protectedKey"), `ingress:${uid}:1`)
        : mode === "real"
          ? null
          : accountKey.get("kek");
    const canonicalKey = head.exists
      ? head.get("mode") === "real"
        ? await unprotect(
            head.get("protectedKey"),
            `canonical:${gameId}:${revision}:${epoch}`,
          )
        : (head.get("canonicalKey") ?? serverKeyRecord.get("key"))
      : null;
    try {
      if (!developer) throw new Error("permission");
      if (head.exists && head.get("migration")) throw new Error("migrating");
      if (!accountKey.exists || !profileRecord.exists || !ingressKey)
        throw new Error("profile-required");
      if (
        maintenance !==
        ["campaign.pause", "campaign.resume"].includes(incoming.kind)
      )
        throw new Error("invalid");
      const action = await provider(mode).open<{ kind: string; mode?: Mode }>(
        incoming.envelope,
        ingressKey,
        context(gameId, 0, `command:${commandId}`, epoch),
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
      if ((head.exists ? head.get("mode") : action.mode) !== mode)
        throw new Error("invalid");
      if (!head.exists) next = createCampaign(gameId, action, seed, now);
      else {
        const current = await provider(mode).open<Campaign>(
          head.get("envelope"),
          canonicalKey,
          context(gameId, revision, "canonical", epoch),
        );
        next =
          action.kind === "fleet.form" || action.kind === "fleet.disband"
            ? orderFleet(current, action, uid, commandId, Date.now())
            : maintenance
              ? maintainCampaign(current, action, uid, now)
              : action.kind === "construction.build" ||
                  action.kind === "construction.cancel"
                ? orderConstruction(current, action, uid, commandId, Date.now())
                : action.kind === "market.focus"
                  ? selectMarketFocus(
                      current,
                      action,
                      uid,
                      commandId,
                      Date.now(),
                    )
                  : action.kind === "research.select"
                    ? selectResearch(
                        current,
                        action,
                        uid,
                        commandId,
                        Date.now(),
                      )
                    : joinOrLeave(current, action, uid, profile, now);
      }
      assertObservationBudget(next, action.kind === "fleet.disband");
    } catch (error) {
      if (error instanceof KeyServiceError) throw error;
      const reason =
        error instanceof Error &&
        [
          "pending-work-capacity",
          "fleet-unavailable",
          "fleet-capacity",
          "insufficient-forces",
          "fleet-limit",
          "fleet-order-pending",
          "permission",
          "profile-required",
          "construction-unavailable",
          "construction-capacity",
          "construction-queue-full",
          "insufficient-credits",
          "cancellation-pending",
          "research-unavailable",
          "research-queue-full",
          "focus-unavailable",
          "focus-queue-full",
          "invalid",
          "exists",
          "started",
          "paused",
          "migrating",
          "already-joined",
          "full",
          "conflict",
        ].includes(error.message)
          ? error.message
          : "invalid";
      tx.create(receiptRef, {
        requestDigest,
        gameId,
        revision,
        status: "rejected",
        reason,
      });
      return;
    }
    const keys = await readRecipientKeys(
      tx,
      gameId,
      next.seats.map((s) => s.uid),
      next.mode,
      next.encryptionEpoch,
    );
    if (next.seats.some((s) => s.uid === uid) && !keys.has(uid)) {
      keys.set(uid, recipientKey);
      if (next.mode === "real" && !protectedRecipient)
        protectedRecipient = await protect(
          recipientKey,
          `recipient:${gameId}:${uid}:${epoch}`,
        );
      tx.create(db().doc(recipientKeyPath(gameId, uid, epoch)), {
        ...(next.mode === "real"
          ? {
              protectedKey: protectedRecipient,
            }
          : { kek: recipientKey }),
        mode: next.mode,
        epoch,
      });
    }
    for (const priorUid of (head.exists
      ? head.get("memberUids")
      : []) as string[])
      if (!next.seats.some((seat) => seat.uid === priorUid))
        tx.delete(db().doc(`campaignMemberships/${priorUid}/games/${gameId}`));
    if (next.revision !== revision)
      await publish(
        tx,
        next,
        keys,
        prepared,
        head.exists && !head.get("canonicalKey") && head.get("mode") === "mock"
          ? serverKeyRecord.get("key")
          : undefined,
      );
    tx.create(receiptRef, {
      requestDigest,
      gameId,
      revision: next.revision,
      status: "accepted",
    });
  });
}
export const processCampaign = onValueCreated(
  { ref: "/commands/{gameId}/{uid}/{commandId}", retry: true },
  (event) => handleCampaign(event, false),
);
export const processCampaignMaintenance = onValueCreated(
  { ref: "/maintenanceCommands/{gameId}/{uid}/{commandId}", retry: true },
  (event) => handleCampaign(event, true),
);

export async function startDueCampaign(id: string, now: number) {
  const prepared = new Map<string, Promise<Record<string, unknown>>>();
  await db().runTransaction(async (tx) => {
    const [head, keyRecord] = await Promise.all([
      tx.get(db().doc(`campaignStates/${id}`)),
      tx.get(db().doc(`campaignKeys/${id}`)),
    ]);
    if (
      !head.exists ||
      head.get("phase") !== "scheduled" ||
      head.get("startAt") > now ||
      head.get("migration")
    )
      return;
    const epoch = Number(head.get("envelope.epoch"));
    const revision = Number(head.get("revision"));
    const mode = head.get("mode") as Mode;
    const key =
      mode === "real"
        ? await unprotect(
            head.get("protectedKey"),
            `canonical:${id}:${revision}:${epoch}`,
          )
        : (head.get("canonicalKey") ?? keyRecord.get("key"));
    const current = await provider(mode).open<Campaign>(
      head.get("envelope"),
      key,
      context(id, revision, "canonical", epoch),
    );
    const next = startCampaign(current, now);
    if (next === current) return;
    const keys = await readRecipientKeys(
      tx,
      id,
      next.seats.map((s) => s.uid),
      next.mode,
      next.encryptionEpoch,
    );
    await publish(
      tx,
      next,
      keys,
      prepared,
      !head.get("canonicalKey") && mode === "mock"
        ? keyRecord.get("key")
        : undefined,
    );
  });
}
// A failed campaign must not prevent later campaigns from receiving their start.
// Stable document-ID paging remains valid while successful starts leave the query.
export async function sweepScheduledCampaigns(now: number) {
  const failed: string[] = [];
  let after: string | undefined;
  let inspected = 0;
  for (;;) {
    let query = db()
      .collection("campaignStates")
      .where("phase", "==", "scheduled")
      .orderBy(FieldPath.documentId())
      .limit(25);
    if (after) query = query.startAfter(after);
    const queued = await query.get();
    for (const head of queued.docs) {
      inspected++;
      if (
        head.get("startAt") > now ||
        head.get("pausedAt") != null ||
        head.get("migration")
      )
        continue;
      try {
        await startDueCampaign(head.id, now);
      } catch {
        // Do not log decrypted state, envelopes, keys or provider error payloads.
        failed.push(head.id);
      }
    }
    if (queued.size < 25) break;
    after = queued.docs[queued.size - 1].id;
  }
  return { inspected, failed };
}
export const startScheduledCampaigns = onSchedule(
  {
    schedule: "every 1 minutes",
    retryCount: 3,
    minBackoffSeconds: 10,
    maxBackoffSeconds: 60,
  },
  async () => {
    const result = await sweepScheduledCampaigns(Date.now());
    if (result.failed.length)
      throw new Error(
        `Campaign start failed for ${result.failed.length} campaign(s); retry required.`,
      );
  },
);
