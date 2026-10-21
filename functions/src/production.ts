import { randomUUID } from "node:crypto";
import {
  type DocumentReference,
  FieldPath,
  getFirestore,
} from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import type { Campaign } from "../../shared/campaign.js";
import { type Mode, provider } from "../../shared/crypto.js";
import { acquireObservations } from "../../shared/observations.js";
import { produce } from "../../shared/production.js";
import { context, publish, readRecipientKeys } from "./campaigns.js";
import { unprotect } from "./key-protection.js";
import { observationDraw } from "./observation-random.js";

const leaseMillis = 120000;
export async function settleCampaignTicks(
  id: string,
  clock: () => number = Date.now,
) {
  const db = getFirestore(),
    headRef = db.doc(`campaignStates/${id}`),
    leaseRef = db.doc(`campaignTickLeases/${id}`),
    token = randomUUID();
  const claimed = await db.runTransaction(async (tx) => {
    // Read the scheduling boundary and its fence in one transaction request.
    const [head, lease] = await tx.getAll(headRef, leaseRef);
    const now = clock();
    if (
      !head.exists ||
      head.get("phase") !== "active" ||
      head.get("nextTickAt") == null ||
      head.get("nextTickAt") > now ||
      head.get("pausedAt") != null ||
      head.get("migration") ||
      (lease.exists && lease.get("expiresAt") > now)
    )
      return false;
    tx.set(leaseRef, { token, expiresAt: now + leaseMillis });
    return true;
  });
  if (!claimed) return 0;
  let settled = 0;
  try {
    for (; settled < 96; settled++) {
      const prepared = new Map<string, Promise<Record<string, unknown>>>();
      const advanced = await db.runTransaction(async (tx) => {
        const [head, lease] = await tx.getAll(headRef, leaseRef);
        const now = clock();
        if (
          !lease.exists ||
          lease.get("token") !== token ||
          lease.get("expiresAt") <= now
        )
          return false;
        if (
          head.get("phase") !== "active" ||
          head.get("pausedAt") != null ||
          head.get("migration") ||
          head.get("nextTickAt") == null ||
          head.get("nextTickAt") > now
        )
          return false;
        const epoch = Number(head.get("envelope.epoch")),
          revision = Number(head.get("revision")),
          mode = head.get("mode") as Mode;
        const key =
          mode === "real"
            ? await unprotect(
                head.get("protectedKey"),
                `canonical:${id}:${revision}:${epoch}`,
              )
            : head.get("canonicalKey");
        const current = await provider(mode).open<Campaign>(
          head.get("envelope"),
          key,
          context(id, revision, "canonical", epoch),
        );
        if (
          current.schemaVersion !== 2 ||
          !current.economy ||
          current.pausedAt != null ||
          current.economy.nextTickAt > now
        )
          throw new Error("Invalid production schedule");
        const result = produce(current, current.economy),
          next = { ...result.campaign, economy: result.economy };
        acquireObservations(current, next, (uid, starId, tick) =>
          observationDraw(current.seed, id, uid, starId, tick),
        );
        const keys = await readRecipientKeys(
          tx,
          id,
          next.seats.map((s) => s.uid),
          mode,
          epoch,
        );
        // Transactions retry after competing maintenance/migration commits. A stale
        // worker cannot commit after another worker replaces its lease token.
        await publish(tx, next, keys, prepared);
        if (clock() >= lease.get("expiresAt"))
          throw new Error("Production lease expired");
        tx.set(leaseRef, { token, expiresAt: clock() + leaseMillis });
        return true;
      });
      if (!advanced) break;
    }
    return settled;
  } finally {
    await releaseProductionLease(leaseRef, token);
  }
}
export async function releaseProductionLease(
  leaseRef: DocumentReference,
  token: string,
) {
  const lease = await leaseRef.get();
  if (lease.exists && lease.get("token") === token) {
    if (!lease.updateTime) throw new Error("Missing lease update fence");
    try {
      // Compare-and-delete needs no second read/write transaction. The update
      // precondition also fences a replacement claimed after this read.
      await leaseRef.delete({ lastUpdateTime: lease.updateTime });
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 9
        )
      )
        throw error;
    }
  }
}
export async function sweepProduction() {
  const db = getFirestore();
  let after: string | undefined;
  let failed = 0,
    settled = 0;
  for (;;) {
    let query = db
      .collection("campaignStates")
      .where("phase", "==", "active")
      .orderBy(FieldPath.documentId())
      .limit(25);
    if (after) query = query.startAfter(after);
    const page = await query.get();
    for (const head of page.docs) {
      if (
        head.get("nextTickAt") == null ||
        head.get("nextTickAt") > Date.now() ||
        head.get("pausedAt") != null ||
        head.get("migration")
      )
        continue;
      try {
        settled += await settleCampaignTicks(head.id);
      } catch {
        failed++;
      }
    }
    if (page.size < 25) break;
    after = page.docs[page.size - 1].id;
  }
  return { settled, failed };
}
export const runProduction = onSchedule(
  {
    schedule: "every 1 minutes",
    timeoutSeconds: 540,
    retryCount: 3,
    minBackoffSeconds: 10,
    maxBackoffSeconds: 60,
  },
  async () => {
    const result = await sweepProduction();
    if (result.failed)
      throw new Error(
        `Production recovery needed for ${result.failed} campaign(s).`,
      );
  },
);
