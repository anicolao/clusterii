import { getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabaseWithUrl } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { endCredentialSessions } from "./credential-revocation.js";

type Authentication = {
  uid: string;
  token: { auth_time?: number; firebase?: { sign_in_provider?: string } };
};
export interface SessionFence {
  cutoff: number;
  operationId: string;
  status: "pending" | "complete";
  blockedThrough?: number;
  protocol?: 2;
}
export async function requireCurrentSession(auth: Authentication | undefined) {
  if (!auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  const [record, user] = await Promise.all([
    getFirestore().doc(`sessionFences/${auth.uid}`).get(),
    getAuth().getUser(auth.uid),
  ]);
  const time = Number(auth.token.auth_time);
  if (
    !Number.isSafeInteger(time) ||
    user.disabled ||
    (record.exists &&
      (record.get("status") !== "complete" || time <= record.get("cutoff"))) ||
    time <
      Math.floor(Date.parse(user.tokensValidAfterTime ?? "1970-01-01") / 1000)
  )
    throw new HttpsError(
      "unauthenticated",
      "Your session ended. Sign in again.",
    );
}
// Already acknowledged commands remain immutable. Unacknowledged admissions before
// the completed fence (or during recovery) cannot become new effects afterwards.
export function admissionAllowed(
  fence: SessionFence | undefined,
  eventTime: string,
) {
  if (!fence) return true;
  const time = Date.parse(eventTime);
  return (
    fence.status === "complete" &&
    Number.isFinite(time) &&
    time > (fence.blockedThrough ?? Infinity)
  );
}
export const revokeSessions = onCall({ invoker: "public" }, async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  const operationId = request.data?.operationId;
  const authTime = auth.token.auth_time;
  if (
    typeof operationId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(operationId) ||
    Object.keys(request.data).some((key) => key !== "operationId")
  )
    throw new HttpsError("invalid-argument", "Invalid sign-out request.");
  if (
    auth.token.firebase.sign_in_provider !== "google.com" ||
    !Number.isSafeInteger(authTime) ||
    Date.now() / 1000 - authTime > 300
  )
    throw new HttpsError(
      "failed-precondition",
      "Confirm your Google identity again.",
    );
  const user = await getAuth().getUser(auth.uid);
  if (
    user.disabled ||
    authTime <
      Math.floor(Date.parse(user.tokensValidAfterTime ?? "1970-01-01") / 1000)
  )
    throw new HttpsError("unauthenticated", "Sign in again to continue.");
  const db = getFirestore(),
    ref = db.doc(`sessionFences/${auth.uid}`),
    operation = db.doc(
      `sessionRevocations/${auth.uid}/operations/${operationId}`,
    );
  const fence = await db.runTransaction(async (tx) => {
    const [prior, record] = await Promise.all([tx.get(ref), tx.get(operation)]);
    if (record.exists) return record.data() as SessionFence;
    if (
      prior.exists &&
      (prior.get("status") !== "complete" || authTime <= prior.get("cutoff"))
    )
      throw new HttpsError(
        "unauthenticated",
        "Your session ended. Sign in again.",
      );
    const next: SessionFence = {
      operationId,
      cutoff: Math.floor(Date.now() / 1000),
      status: "pending",
    };
    tx.set(ref, next);
    tx.create(operation, next);
    return next;
  });
  if (fence.protocol === 2) return endCredentialSessions(request);
  if (fence.status === "complete") return { status: "complete" };
  // These stores cannot share a transaction. The Firestore pending fence denies
  // reads/key delivery and command effects until every revocation step succeeds.
  const projectId = getApp().options.projectId ?? process.env.GCLOUD_PROJECT;
  if (!projectId)
    throw new HttpsError("internal", "Database identity unavailable.");
  // Match the canonical command database explicitly; the emulator's inferred
  // default namespace does not necessarily use the -default-rtdb suffix.
  const mirror = getDatabaseWithUrl(
    `https://${projectId}-default-rtdb.firebaseio.com`,
  ).ref(`sessionFences/${auth.uid}`);
  for (const status of ["pending", "complete"] as const) {
    await mirror.transaction((current) => {
      if (
        current &&
        (current.cutoff > fence.cutoff ||
          (current.cutoff === fence.cutoff && current.status === "complete"))
      )
        return;
      return { cutoff: fence.cutoff, status };
    });
  }
  await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.get("operationId") !== operationId)
      throw new HttpsError("aborted", "Sign-out request changed.");
    if (current.get("protocol") === 2)
      throw new HttpsError(
        "aborted",
        "Credential sign-out is in progress. Retry this request.",
      );
    if (current.get("status") === "complete") return;
    const completed = { status: "complete", blockedThrough: Date.now() };
    tx.update(ref, completed);
    tx.update(operation, completed);
  });
  return { status: "complete" };
});
