import type {
  CampaignAction,
  CampaignDirectory,
  CampaignView,
} from "@shared/campaign";
import {
  type Context,
  type Envelope,
  type Grant,
  type Mode,
  provider,
  unwrap,
} from "@shared/crypto";
import { getIdTokenResult } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, firestore, functions, loadKey, submitCommand } from "./session";
export interface CampaignReceipt {
  gameId: string;
  revision: number;
  status: "accepted" | "rejected";
  reason?: string;
}
export interface PendingCampaign {
  id: string;
  gameId: string;
  kind: string;
  envelope: Envelope;
  dispatched?: boolean;
}
const context = (
  gameId: string,
  revision: number,
  objectId: string,
  epoch = 1,
): Context => ({ gameId, revision, objectId, epoch, keyVersion: 1 });
export async function developerAccess() {
  return (
    !!auth.currentUser &&
    (await getIdTokenResult(auth.currentUser, true)).claims.developer === true
  );
}
export function observeDirectory(
  next: (games: CampaignDirectory[]) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    collection(firestore, "developmentCampaigns"),
    (snapshot) =>
      next(
        snapshot.docs
          .map((d) => d.data() as CampaignDirectory)
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    fail,
  );
}
export function observeMemberships(
  uid: string,
  next: (ids: string[]) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    collection(firestore, "campaignMemberships", uid, "games"),
    (snapshot) => next(snapshot.docs.map((doc) => doc.id)),
    fail,
  );
}
export async function encryptionAvailable() {
  const result = await httpsCallable<undefined, { realAvailable: boolean }>(
    functions,
    "campaignSecurity",
  )();
  return result.data.realAvailable;
}
export async function prepareCampaign(
  gameId: string,
  action: CampaignAction,
  mode: Mode,
  epoch = 1,
): Promise<PendingCampaign> {
  const id = crypto.randomUUID();
  const kek =
    mode === "real"
      ? (
          await httpsCallable<undefined, { kek: string }>(
            functions,
            "campaignCommandKey",
          )()
        ).data.kek
      : await loadKey();
  return {
    id,
    gameId,
    kind: action.kind,
    envelope: await provider(mode).seal(
      action,
      kek,
      context(gameId, 0, `command:${id}`, epoch),
    ),
  };
}
export function sendCampaign(
  uid: string,
  pending: PendingCampaign,
  next: (receipt: CampaignReceipt) => void,
  fail: (error: Error) => void,
) {
  return submitCommand(
    pending,
    { kind: pending.kind, envelope: pending.envelope },
    `${pending.kind === "campaign.migrate" ? "migrationCommands" : ["campaign.pause", "campaign.resume"].includes(pending.kind) ? "maintenanceCommands" : "commands"}/${pending.gameId}/${uid}/${pending.id}`,
    ["campaignReceipts", uid, "results", pending.id],
    next,
    fail,
  );
}
export async function observeCampaign(
  gameId: string,
  uid: string,
  next: (view: CampaignView | null) => void,
  fail: (error: Error) => void,
) {
  const result = await httpsCallable<
    { gameId: string },
    | { joined: false }
    | { joined: true; kek: string; mode: string; epoch: number }
  >(
    functions,
    "campaignKey",
  )({ gameId });
  if (!result.data.joined) {
    next(null);
    return () => {};
  }
  let access = result.data;
  if (access.mode !== "mock" && access.mode !== "real")
    throw new Error("Unsupported campaign encryption");

  let active = true;
  let serial = 0;
  const stop = onSnapshot(
    doc(firestore, "campaignViews", gameId, "members", uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      const version = ++serial;
      if (!snapshot.exists()) return;
      const data = snapshot.data() as {
        revision: number;
        grant: Grant;
        envelope: Envelope;
      };
      // An initial cached version can precede the freshly recovered server epoch.
      // Wait for its server snapshot instead of attempting to decrypt across epochs.
      if (
        snapshot.metadata.fromCache &&
        (data.envelope.epoch !== access.epoch ||
          data.envelope.mode !== access.mode)
      )
        return;
      void (async () => {
        if (
          data.envelope.epoch !== access.epoch ||
          data.envelope.mode !== access.mode
        ) {
          const refreshed = await httpsCallable<
            { gameId: string },
            | { joined: false }
            | { joined: true; kek: string; mode: string; epoch: number }
          >(
            functions,
            "campaignKey",
          )({ gameId });
          if (!refreshed.data.joined) {
            if (active && serial === version) next(null);
            return;
          }
          if (!active || serial !== version) return;
          access = refreshed.data;
        }
        if (access.mode !== "mock" && access.mode !== "real")
          throw new Error("Unsupported campaign encryption");
        if (
          data.envelope.epoch !== access.epoch ||
          data.envelope.mode !== access.mode
        )
          throw new Error(
            "Campaign encryption changed; reconnect to recover its current keys.",
          );
        const ctx = context(
          gameId,
          data.revision,
          `member:${uid}`,
          access.epoch,
        );
        const key = await unwrap(data.grant, access.kek, uid, ctx, access.mode);
        const view = await provider(access.mode).open<CampaignView>(
          data.envelope,
          key,
          ctx,
        );
        if (active && serial === version) next(view);
      })().catch((error) => {
        if (active && serial === version) fail(error);
      });
    },
    (error) => {
      if (active) {
        if (error.code === "permission-denied") next(null);
        else fail(error);
      }
    },
  );
  return () => {
    active = false;
    stop();
  };
}
