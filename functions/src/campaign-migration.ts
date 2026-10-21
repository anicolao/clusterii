import {
  type DocumentReference,
  FieldPath,
  FieldValue,
  getFirestore,
  type Transaction,
} from "firebase-admin/firestore";
import { onValueCreated } from "firebase-functions/v2/database";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import {
  activateEncryptionEpoch,
  type Campaign,
  campaignDirectory,
} from "../../shared/campaign.js";
import { commandDigest } from "../../shared/command-receipt.js";
import {
  type Envelope,
  type Grant,
  type Mode,
  newKey,
  provider,
  unwrap,
  wrap,
} from "../../shared/crypto.js";
import {
  canonicalVersions,
  memberVersions,
  recipientKeyPath,
} from "./campaign-paths.js";
import {
  context,
  publish,
  readRecipientKeys,
  requireDeveloper,
} from "./campaigns.js";
import {
  KeyServiceError,
  protect,
  realAvailable,
  unprotect,
} from "./key-protection.js";
import { admissionAllowed, type SessionFence } from "./session-security.js";

const db = () => getFirestore();
const pageSize = 10;
interface Job {
  requestDigest?: string;
  id: string;
  gameId: string;
  uid: string;
  revision: number;
  sourceEpoch: number;
  targetEpoch: number;
  sourceMode: Mode;
  targetMode: Mode;
  phase:
    | "canonical"
    | "members"
    | "activate"
    | "cleanup"
    | "complete"
    | "failed";
  sequence: number;
  verified: number;
  cursor: string | null;
  member: string | null;
  memberCursor: string | null;
  lease: { id: string; until: number } | null;
}
const jobRef = (id: string) => db().doc(`campaignMigrations/${id}`);
const taskRef = (job: Job) =>
  db().doc(`campaignMigrationTasks/${job.id}-${job.sequence}`);
function enqueue(tx: Transaction, job: Job) {
  tx.create(taskRef(job), { jobId: job.id, sequence: job.sequence });
}
function progress(job: Job) {
  return {
    state: job.phase,
    verified: job.verified,
    targetMode: job.targetMode,
  };
}
async function canonicalKey(
  gameId: string,
  epoch: number,
  record: Record<string, unknown>,
) {
  const envelope = record.envelope as Envelope;
  if (envelope.mode === "real")
    return unprotect(
      record.protectedKey as Parameters<typeof unprotect>[0],
      `canonical:${gameId}:${envelope.revision}:${epoch}`,
    );
  if (typeof record.canonicalKey === "string") return record.canonicalKey;
  const legacy = await db().doc(`campaignKeys/${gameId}`).get();
  const key = legacy.get("legacyCanonicalKey") ?? legacy.get("key");
  if (typeof key !== "string")
    throw new Error("Missing retained canonical key");
  return key;
}
async function openCanonical(
  gameId: string,
  epoch: number,
  record: Record<string, unknown>,
) {
  const envelope = record.envelope as Envelope;
  return provider(envelope.mode).open<Campaign>(
    envelope,
    await canonicalKey(gameId, epoch, record),
    context(gameId, envelope.revision, "canonical", epoch),
  );
}
async function sealedCanonical(state: Campaign) {
  const key = newKey(),
    ctx = context(state.id, state.revision, "canonical", state.encryptionEpoch);
  const envelope = await provider(state.mode).seal(state, key, ctx);
  const verified = await provider(state.mode).open<Campaign>(
    envelope,
    key,
    ctx,
  );
  if (JSON.stringify(verified) !== JSON.stringify(state))
    throw new Error("Canonical equivalence failed");
  return {
    revision: state.revision,
    phase: state.phase,
    startAt: state.startAt,
    memberUids: state.seats.map((s) => s.uid),
    mode: state.mode,
    encryptionEpoch: state.encryptionEpoch,
    envelope,
    ...(state.mode === "real"
      ? {
          protectedKey: await protect(
            key,
            `canonical:${state.id}:${state.revision}:${state.encryptionEpoch}`,
          ),
        }
      : { canonicalKey: key }),
  };
}
export const processCampaignMigration = onValueCreated(
  { ref: "/migrationCommands/{gameId}/{uid}/{commandId}", retry: true },
  async (event) => {
    const { gameId, uid, commandId } = event.params;
    const requestDigest = await commandDigest(
      `migrationCommands/${gameId}/${uid}/${commandId}`,
      event.data.val(),
    );
    const receipt = db().doc(`campaignReceipts/${uid}/results/${commandId}`);
    if ((await receipt.get()).exists) return;
    try {
      await requireDeveloper(uid);
      const head = await db().doc(`campaignStates/${gameId}`).get();
      if (!head.exists) throw new Error("invalid");
      const sourceEpoch = Number(head.get("envelope.epoch")),
        sourceMode = head.get("mode") as Mode;
      const incoming = event.data.val() as { kind: string; envelope: Envelope };
      if (
        incoming.kind !== "campaign.migrate" ||
        incoming.envelope.mode !== sourceMode
      )
        throw new Error("invalid");
      const account = await db()
        .doc(
          sourceMode === "real"
            ? `campaignCommandKeys/${uid}`
            : `profileKeys/${uid}`,
        )
        .get();
      const key =
        sourceMode === "real"
          ? await unprotect(account.get("protectedKey"), `ingress:${uid}:1`)
          : account.get("kek");
      const action = await provider(sourceMode).open<{
        kind: string;
        expectedRevision: number;
        targetMode: Mode;
      }>(
        incoming.envelope,
        key,
        context(gameId, 0, `command:${commandId}`, sourceEpoch),
      );
      if (
        action.kind !== incoming.kind ||
        !["mock", "real"].includes(action.targetMode) ||
        action.targetMode === sourceMode ||
        Object.keys(action).some(
          (k) => !["kind", "expectedRevision", "targetMode"].includes(k),
        )
      )
        throw new Error("invalid");
      if (action.targetMode === "real" && !realAvailable())
        throw new Error("unavailable");
      const state = await openCanonical(gameId, sourceEpoch, head.data() ?? {});
      if (!state.development || !state.seats.some((s) => s.uid === uid))
        throw new Error("permission");
      if (state.pausedAt == null) throw new Error("pause-required");
      await db().runTransaction(async (tx) => {
        const [current, prior, counter, existingJob, session] =
          await Promise.all([
            tx.get(head.ref),
            tx.get(receipt),
            tx.get(db().doc(`campaignEpochCounters/${gameId}`)),
            tx.get(jobRef(commandId)),
            tx.get(db().doc(`sessionFences/${uid}`)),
          ]);
        if (prior.exists) return;
        if (existingJob.exists) {
          if (
            existingJob.get("uid") !== uid ||
            existingJob.get("gameId") !== gameId
          )
            throw new Error("invalid");
          return;
        }
        if (
          !admissionAllowed(
            session.data() as SessionFence | undefined,
            event.time,
          )
        )
          throw new Error("session");
        if (
          current.get("revision") !== action.expectedRevision ||
          current.get("revision") !== state.revision ||
          current.get("migration")
        )
          throw new Error("conflict");
        const targetEpoch =
          Math.max(sourceEpoch, Number(counter.get("allocated") ?? 0)) + 1;
        const job: Job = {
          requestDigest,
          id: commandId,
          gameId,
          uid,
          revision: state.revision,
          sourceEpoch,
          targetEpoch,
          sourceMode,
          targetMode: action.targetMode,
          phase: "canonical",
          sequence: 0,
          verified: 0,
          cursor: null,
          member: null,
          memberCursor: null,
          lease: null,
        };
        tx.set(db().doc(`campaignEpochCounters/${gameId}`), {
          allocated: targetEpoch,
        });
        tx.create(jobRef(commandId), job);
        tx.update(head.ref, { migration: commandId });
        tx.update(db().doc(`developmentCampaigns/${gameId}`), {
          migration: progress(job),
        });
        enqueue(tx, job);
      });
    } catch (error) {
      if (error instanceof KeyServiceError) throw error;
      const reason =
        error instanceof Error &&
        [
          "permission",
          "conflict",
          "pause-required",
          "unavailable",
          "session",
        ].includes(error.message)
          ? error.message
          : "invalid";
      await db().runTransaction(async (tx) => {
        if (!(await tx.get(receipt)).exists)
          tx.create(receipt, {
            requestDigest,
            gameId,
            status: "rejected",
            reason,
            revision: 0,
          });
      });
    }
  },
);
export async function claim(id: string, sequence: number) {
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(jobRef(id));
    if (!snapshot.exists) return null;
    const job = snapshot.data() as Job;
    if (job.sequence !== sequence || ["complete", "failed"].includes(job.phase))
      return null;
    if (job.lease && job.lease.until > Date.now())
      throw new Error("Migration step is already running");
    job.lease = { id: newKey(), until: Date.now() + 120000 };
    tx.update(snapshot.ref, { lease: job.lease });
    return job;
  });
}
interface Write {
  ref: DocumentReference;
  data: Record<string, unknown>;
}
async function advance(job: Job, next: Job, writes: Write[]) {
  await db().runTransaction(async (tx) => {
    const [current, head] = await Promise.all([
      tx.get(jobRef(job.id)),
      tx.get(db().doc(`campaignStates/${job.gameId}`)),
    ]);
    if (
      current.get("sequence") !== job.sequence ||
      current.get("lease.id") !== job.lease?.id
    )
      throw new Error("Lost migration fence");
    if (
      job.phase !== "cleanup" &&
      (head.get("migration") !== job.id ||
        head.get("revision") !== job.revision)
    )
      throw new Error("Campaign changed during migration");
    for (const write of writes) tx.set(write.ref, write.data);
    next.sequence = job.sequence + 1;
    next.lease = null;
    tx.set(jobRef(job.id), next);
    enqueue(tx, next);
    if (next.phase !== "cleanup")
      tx.update(db().doc(`developmentCampaigns/${job.gameId}`), {
        migration: progress(next),
      });
  });
}
export async function canonicalPage(job: Job) {
  let query = db()
    .collection(canonicalVersions(job.gameId, job.sourceEpoch))
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (job.cursor) query = query.startAfter(job.cursor);
  const page = await query.get(),
    writes: Write[] = [];
  for (const record of page.docs) {
    const previous = await openCanonical(
      job.gameId,
      job.sourceEpoch,
      record.data(),
    );
    const state = {
      ...previous,
      mode: job.targetMode,
      encryptionEpoch: job.targetEpoch,
      mockExposed: previous.mockExposed || job.targetMode === "mock",
    };
    writes.push({
      ref: db().doc(
        `${canonicalVersions(job.gameId, job.targetEpoch)}/${record.id}`,
      ),
      data: await sealedCanonical(state),
    });
  }
  await advance(
    job,
    {
      ...job,
      verified: job.verified + page.size,
      cursor:
        page.size < pageSize ? null : (page.docs.at(-1)?.id ?? job.cursor),
      phase: page.size < pageSize ? "members" : "canonical",
    },
    writes,
  );
}
async function memberKey(job: Job, uid: string, epoch: number, mode: Mode) {
  const record = await db()
    .doc(recipientKeyPath(job.gameId, uid, epoch))
    .get();
  if (!record.exists) throw new Error("Missing retained recipient key");
  return mode === "real"
    ? unprotect(
        record.get("protectedKey"),
        `recipient:${job.gameId}:${uid}:${epoch}`,
      )
    : (record.get("kek") as string);
}
async function convertedView(
  job: Job,
  uid: string,
  source: Record<string, unknown>,
  oldKek: string,
  newKek: string,
) {
  const revision = Number(source.revision),
    oldContext = context(
      job.gameId,
      revision,
      `member:${uid}`,
      job.sourceEpoch,
    );
  const oldKey = await unwrap(
    source.grant as Grant,
    oldKek,
    uid,
    oldContext,
    job.sourceMode,
  );
  const previous = await provider(job.sourceMode).open<Record<string, unknown>>(
    source.envelope as Envelope,
    oldKey,
    oldContext,
  );
  const value = {
    ...previous,
    mode: job.targetMode,
    encryptionEpoch: job.targetEpoch,
    mockExposed:
      previous.mockExposed === true ||
      job.sourceMode === "mock" ||
      job.targetMode === "mock",
  };
  const key = newKey(),
    ctx = context(job.gameId, revision, `member:${uid}`, job.targetEpoch);
  const envelope = await provider(job.targetMode).seal(value, key, ctx),
    grant = await wrap(key, newKek, uid, ctx, job.targetMode);
  const recovered = await unwrap(grant, newKek, uid, ctx, job.targetMode);
  const verified = await provider(job.targetMode).open(
    envelope,
    recovered,
    ctx,
  );
  if (JSON.stringify(verified) !== JSON.stringify(value))
    throw new Error("Recipient equivalence failed");
  return { revision, envelope, grant };
}
async function memberPage(job: Job) {
  let uid = job.member;
  if (!uid) {
    let query = db()
      .collection(`campaignViews/${job.gameId}/members`)
      .orderBy(FieldPath.documentId())
      .limit(1);
    if (job.cursor) query = query.startAfter(job.cursor);
    const page = await query.get();
    if (page.empty) {
      await advance(job, { ...job, phase: "activate" }, []);
      return;
    }
    uid = page.docs[0].id;
  }
  const keyRef = db().doc(recipientKeyPath(job.gameId, uid, job.targetEpoch)),
    existingKey = await keyRef.get();
  const oldKek = await memberKey(job, uid, job.sourceEpoch, job.sourceMode);
  const kek = existingKey.exists
    ? await memberKey(job, uid, job.targetEpoch, job.targetMode)
    : newKey();
  const writes: Write[] = [];
  if (!existingKey.exists)
    writes.push({
      ref: keyRef,
      data: {
        mode: job.targetMode,
        epoch: job.targetEpoch,
        ...(job.targetMode === "real"
          ? {
              protectedKey: await protect(
                kek,
                `recipient:${job.gameId}:${uid}:${job.targetEpoch}`,
              ),
            }
          : { kek }),
      },
    });
  let query = db()
    .collection(memberVersions(job.gameId, uid, job.sourceEpoch))
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (job.memberCursor) query = query.startAfter(job.memberCursor);
  const page = await query.get();
  for (const record of page.docs)
    writes.push({
      ref: db().doc(
        `${memberVersions(job.gameId, uid, job.targetEpoch)}/${record.id}`,
      ),
      data: await convertedView(job, uid, record.data(), oldKek, kek),
    });
  const next: Job = {
    ...job,
    verified: job.verified + page.size,
    member: uid,
    memberCursor: page.docs.at(-1)?.id ?? job.memberCursor,
  };
  if (page.size < pageSize) {
    const head = await db()
      .doc(
        job.sourceEpoch === 1
          ? `campaignViews/${job.gameId}/members/${uid}`
          : `campaignViews/${job.gameId}/members/${uid}/epochs/${job.sourceEpoch}`,
      )
      .get();
    if (!head.exists) throw new Error("Missing retained member head");
    writes.push({
      ref: db().doc(
        `campaignViews/${job.gameId}/members/${uid}/epochs/${job.targetEpoch}`,
      ),
      data: await convertedView(job, uid, head.data() ?? {}, oldKek, kek),
    });
    next.cursor = uid;
    next.member = null;
    next.memberCursor = null;
  }
  await advance(job, next, writes);
}
export async function activate(job: Job) {
  const activatedAt = Date.now();
  const prepared = new Map<string, Promise<Record<string, unknown>>>();
  await db().runTransaction(async (tx) => {
    const [current, head, receipt] = await Promise.all([
      tx.get(jobRef(job.id)),
      tx.get(db().doc(`campaignStates/${job.gameId}`)),
      tx.get(db().doc(`campaignReceipts/${job.uid}/results/${job.id}`)),
    ]);
    if (receipt.exists && current.get("phase") === "complete") return;
    if (
      current.get("sequence") !== job.sequence ||
      current.get("lease.id") !== job.lease?.id ||
      head.get("migration") !== job.id ||
      head.get("revision") !== job.revision
    )
      throw new Error("Lost activation fence");
    const source = await openCanonical(
      job.gameId,
      job.sourceEpoch,
      head.data() ?? {},
    );
    const next = activateEncryptionEpoch(
      source,
      job.targetMode,
      job.targetEpoch,
      job.uid,
      activatedAt,
    );
    const keys = await readRecipientKeys(
      tx,
      job.gameId,
      next.seats.map((s) => s.uid),
      job.targetMode,
      job.targetEpoch,
    );
    if (keys.size !== next.seats.length)
      throw new Error("Incomplete recipient migration");
    const checks = await Promise.all(
      next.seats.map((seat) =>
        tx.get(
          db().doc(
            `campaignViews/${job.gameId}/members/${seat.uid}/epochs/${job.targetEpoch}`,
          ),
        ),
      ),
    );
    if (checks.some((check) => !check.exists))
      throw new Error("Unverified member migration");
    await publish(tx, next, keys, prepared);
    tx.update(jobRef(job.id), {
      phase: "complete",
      lease: null,
      completedAt: activatedAt,
    });
    tx.create(db().doc(`campaignReceipts/${job.uid}/results/${job.id}`), {
      ...(job.requestDigest ? { requestDigest: job.requestDigest } : {}),
      gameId: job.gameId,
      revision: next.revision,
      status: "accepted",
      epoch: job.targetEpoch,
    });
  });
}
export async function abort(job: Job) {
  await db().runTransaction(async (tx) => {
    const [current, head, receipt] = await Promise.all([
      tx.get(jobRef(job.id)),
      tx.get(db().doc(`campaignStates/${job.gameId}`)),
      tx.get(db().doc(`campaignReceipts/${job.uid}/results/${job.id}`)),
    ]);
    if (
      current.get("lease.id") !== job.lease?.id ||
      head.get("migration") !== job.id
    )
      return;
    const source = await openCanonical(
      job.gameId,
      job.sourceEpoch,
      head.data() ?? {},
    );
    tx.update(head.ref, { migration: FieldValue.delete() });
    tx.set(
      db().doc(`developmentCampaigns/${job.gameId}`),
      campaignDirectory(source),
    );
    if (!receipt.exists)
      tx.create(receipt.ref, {
        ...(job.requestDigest ? { requestDigest: job.requestDigest } : {}),
        gameId: job.gameId,
        revision: job.revision,
        status: "rejected",
        reason: "migration-failed",
      });
    const next: Job = {
      ...job,
      phase: "cleanup",
      sequence: job.sequence + 1,
      lease: null,
      cursor: null,
      member: null,
      memberCursor: null,
    };
    tx.set(jobRef(job.id), next);
    enqueue(tx, next);
  });
}
async function cleanup(job: Job) {
  // Every path belongs to this attempt's reserved, never-activated epoch.
  await db().recursiveDelete(
    db().doc(`campaignStates/${job.gameId}/epochs/${job.targetEpoch}`),
  );
  await db().recursiveDelete(
    db().doc(`campaignKeys/${job.gameId}/epochs/${job.targetEpoch}`),
  );
  let query = db()
    .collection(`campaignViews/${job.gameId}/members`)
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (job.cursor) query = query.startAfter(job.cursor);
  const members = await query.get();
  for (const member of members.docs)
    await db().recursiveDelete(
      db().doc(
        `campaignViews/${job.gameId}/members/${member.id}/epochs/${job.targetEpoch}`,
      ),
    );
  if (members.size === pageSize) {
    await advance(job, { ...job, cursor: members.docs[pageSize - 1].id }, []);
    return;
  }
  await db().runTransaction(async (tx) => {
    const current = await tx.get(jobRef(job.id));
    if (current.get("lease.id") === job.lease?.id)
      tx.update(current.ref, {
        phase: "failed",
        lease: null,
        cleanedAt: Date.now(),
      });
  });
}
export const runCampaignMigration = onDocumentCreated(
  {
    document: "campaignMigrationTasks/{taskId}",
    retry: true,
    timeoutSeconds: 180,
  },
  async (event) => {
    const task = event.data?.data();
    if (!task) return;
    const job = await claim(task.jobId, task.sequence);
    if (!job) return;
    await executeClaimedMigration(job);
  },
);

export async function executeClaimedMigration(job: Job) {
  if (job.phase === "cleanup") {
    await cleanup(job);
    return;
  }
  try {
    await requireDeveloper(job.uid);
    if (job.phase === "canonical") await canonicalPage(job);
    else if (job.phase === "members") await memberPage(job);
    else if (job.phase === "activate") await activate(job);
  } catch {
    await abort(job);
  }
}
