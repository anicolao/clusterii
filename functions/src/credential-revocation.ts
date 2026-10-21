import { randomUUID } from "node:crypto";
import { getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabaseWithUrl } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import {
  type CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

// Application fences remain authoritative while the external Auth operation is
// pending. The worker's 60-second runtime is shorter than its 120-second lease.
export async function endCredentialSessions(request: CallableRequest) {
  const auth = request.auth,
    operationId = request.data?.operationId;
  if (!auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  if (
    typeof operationId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(operationId) ||
    Object.keys(request.data).some((key) => key !== "operationId")
  )
    throw new HttpsError("invalid-argument", "Invalid sign-out request.");
  const authTime = Number(auth.token.auth_time);
  if (
    auth.token.firebase.sign_in_provider !== "google.com" ||
    !Number.isSafeInteger(authTime) ||
    Date.now() / 1000 - authTime > 300
  )
    throw new HttpsError(
      "failed-precondition",
      "Confirm your Google identity again.",
    );
  const identity = getAuth(),
    user = await identity.getUser(auth.uid);
  if (
    user.disabled ||
    authTime <
      Math.floor(Date.parse(user.tokensValidAfterTime ?? "1970-01-01") / 1000)
  )
    throw new HttpsError("unauthenticated", "Sign in again to continue.");
  const db = getFirestore(),
    fenceRef = db.doc(`sessionFences/${auth.uid}`),
    operation = db.doc(
      `sessionRevocations/${auth.uid}/operations/${operationId}`,
    ),
    token = randomUUID();
  const claim = await db.runTransaction(async (tx) => {
    const [fence, record] = await tx.getAll(fenceRef, operation);
    if (record.get("status") === "complete")
      return { status: "complete" as const };
    if (
      !record.exists &&
      fence.exists &&
      (fence.get("status") !== "complete" || authTime <= fence.get("cutoff"))
    )
      throw new HttpsError(
        "unauthenticated",
        "Your session ended. Sign in again.",
      );
    if (record.exists && fence.get("operationId") !== operationId)
      throw new HttpsError("aborted", "Sign-out request changed.");
    if (record.exists && record.get("leaseUntil") > Date.now())
      return { status: "pending" as const };
    const cutoff = record.exists
      ? Number(record.get("cutoff"))
      : Math.floor(Date.now() / 1000);
    const target = record.get("requestedCutoff") ?? cutoff;
    const next = {
      operationId,
      cutoff,
      status: "pending",
      protocol: 2,
      requestedCutoff: target,
    };
    tx.set(fenceRef, next, { merge: true });
    tx.set(
      operation,
      { ...next, leaseToken: token, leaseUntil: Date.now() + 120000 },
      { merge: true },
    );
    return { status: "claimed" as const, cutoff, target };
  });
  if (claim.status !== "claimed") return { status: claim.status };
  const currentLease = async () => {
    const record = await operation.get();
    if (
      record.get("leaseToken") !== token ||
      record.get("leaseUntil") <= Date.now() ||
      record.get("status") !== "pending"
    )
      throw new HttpsError(
        "aborted",
        "Sign-out recovery moved to another request. Retry to confirm completion.",
      );
  };
  const projectId = getApp().options.projectId ?? process.env.GCLOUD_PROJECT;
  if (!projectId)
    throw new HttpsError("internal", "Database identity unavailable.");
  const mirror = getDatabaseWithUrl(
    `https://${projectId}-default-rtdb.firebaseio.com`,
  ).ref(`sessionFences/${auth.uid}`);
  await mirror.transaction((current) => {
    if (
      current &&
      (current.cutoff > claim.cutoff ||
        (current.cutoff === claim.cutoff && current.status === "complete"))
    )
      return;
    return { cutoff: claim.cutoff, status: "pending" };
  });
  await currentLease();
  // Firebase records revocation in whole seconds. Cover every sign-in that
  // existed when the request was admitted, including the confirming sign-in.
  const delay = Math.max(
    0,
    (Math.max(claim.target, authTime) + 1) * 1000 - Date.now(),
  );
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  await currentLease();
  let revokedAfter = Math.floor(
    Date.parse(
      (await identity.getUser(auth.uid)).tokensValidAfterTime ?? "1970-01-01",
    ) / 1000,
  );
  if (revokedAfter <= claim.target) {
    await currentLease();
    await identity.revokeRefreshTokens(auth.uid);
    revokedAfter = Math.floor(
      Date.parse(
        (await identity.getUser(auth.uid)).tokensValidAfterTime ?? "1970-01-01",
      ) / 1000,
    );
  }
  if (!Number.isSafeInteger(revokedAfter) || revokedAfter <= claim.target)
    throw new HttpsError(
      "unavailable",
      "Credential revocation could not be confirmed. Retry this request.",
    );
  const cutoff = Math.max(claim.cutoff, revokedAfter);
  await db.runTransaction(async (tx) => {
    const [fence, record] = await tx.getAll(fenceRef, operation);
    if (
      fence.get("operationId") !== operationId ||
      record.get("leaseToken") !== token ||
      record.get("leaseUntil") <= Date.now() ||
      record.get("status") !== "pending"
    )
      throw new HttpsError(
        "aborted",
        "Sign-out recovery moved to another request.",
      );
    tx.update(fenceRef, { cutoff });
    tx.update(operation, { cutoff, providerRevokedAfter: revokedAfter });
  });
  await currentLease();
  await mirror.transaction((current) => {
    if (current && current.cutoff > cutoff) return;
    return { cutoff, status: "complete" };
  });
  await db.runTransaction(async (tx) => {
    const [fence, record] = await tx.getAll(fenceRef, operation);
    if (
      fence.get("operationId") !== operationId ||
      record.get("leaseToken") !== token ||
      record.get("leaseUntil") <= Date.now()
    )
      throw new HttpsError(
        "aborted",
        "Sign-out recovery moved to another request.",
      );
    const completed = {
      status: "complete",
      cutoff,
      blockedThrough: Date.now(),
    };
    tx.update(fenceRef, completed);
    tx.update(operation, completed);
  });
  return { status: "complete" };
}
export const revokeCredentials = onCall(
  { invoker: "public", timeoutSeconds: 60 },
  endCredentialSessions,
);
