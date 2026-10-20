import type {
  CampaignAction,
  CampaignDirectory,
  CampaignView,
} from "@shared/campaign";
import {
  type Context,
  type Envelope,
  type Grant,
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
): Context => ({ gameId, revision, objectId, epoch: 1, keyVersion: 1 });
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
export async function prepareCampaign(
  gameId: string,
  action: CampaignAction,
): Promise<PendingCampaign> {
  const id = crypto.randomUUID();
  const kek = await loadKey();
  return {
    id,
    gameId,
    kind: action.kind,
    envelope: await provider("mock").seal(
      action,
      kek,
      context(gameId, 0, `command:${id}`),
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
    `commands/${pending.gameId}/${uid}/${pending.id}`,
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
    { joined: false } | { joined: true; kek: string; mode: string }
  >(
    functions,
    "campaignKey",
  )({ gameId });
  if (!result.data.joined) {
    next(null);
    return () => {};
  }
  const access = result.data;
  if (access.mode !== "mock")
    throw new Error("Unsupported campaign encryption");
  let active = true;
  let serial = 0;
  const stop = onSnapshot(
    doc(firestore, "campaignViews", gameId, "members", uid),
    (snapshot) => {
      const version = ++serial;
      if (!snapshot.exists()) return;
      const data = snapshot.data() as {
        revision: number;
        grant: Grant;
        envelope: Envelope;
      };
      const ctx = context(gameId, data.revision, `member:${uid}`);
      void unwrap(data.grant, access.kek, uid, ctx, "mock")
        .then((key) =>
          provider("mock").open<CampaignView>(data.envelope, key, ctx),
        )
        .then((view) => {
          if (active && serial === version) next(view);
        })
        .catch((error) => {
          if (active) fail(error);
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
