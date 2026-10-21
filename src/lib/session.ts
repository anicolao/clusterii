import { commandDigest, verifyReceipt } from "@shared/command-receipt";
import { type Envelope, provider, unwrap } from "@shared/crypto";
import {
  commandContext,
  type Profile,
  type ProfileView,
  profileContext,
  type Receipt,
} from "@shared/profile";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  connectDatabaseEmulator,
  getDatabase,
  ref,
  set,
} from "firebase/database";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

declare const __CLUSTER_EMULATORS__: boolean;

const emulator = __CLUSTER_EMULATORS__;
const projectId = emulator ? "demo-clusterii" : "clusterii-20261020";
const app = initializeApp({
  projectId,
  apiKey: emulator ? "demo-key" : "AIzaSyCsFvelpQVRBSS3d8KcMTpUfbIfH67K3Ts",
  appId: "1:843789604346:web:2bd6b6b660239427de4043",
  authDomain: emulator ? "localhost" : "clusterii-20261020.firebaseapp.com",
  databaseURL: emulator
    ? "http://127.0.0.1:19000?ns=demo-clusterii-default-rtdb"
    : "https://clusterii-20261020-default-rtdb.firebaseio.com",
});
export const auth = getAuth(app);
export const database = getDatabase(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
if (emulator) {
  if (!["localhost", "127.0.0.1"].includes(location.hostname))
    throw new Error("Emulators require a local origin");
  connectAuthEmulator(auth, "http://127.0.0.1:19099", {
    disableWarnings: true,
  });
  connectDatabaseEmulator(database, "127.0.0.1", 19000);
  connectFirestoreEmulator(firestore, "127.0.0.1", 18080);
  connectFunctionsEmulator(functions, "127.0.0.1", 15001);
}
export const observeAccount = (
  next: (user: User | null) => void,
  resumeSignOut?: () => void,
) => {
  let stopFence = () => {};
  let generation = 0;
  const stopAuth = onAuthStateChanged(auth, (user) => {
    const current = ++generation;
    stopFence();
    next(user);
    if (!user) return;
    stopFence = onSnapshot(
      doc(firestore, "sessionFences", user.uid),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const slot = `cluster-signout:${user.uid}`;
        if (snapshot.get("status") !== "complete") {
          if (sessionStorage.getItem(slot) === snapshot.get("operationId"))
            resumeSignOut?.();
          return;
        }
        if (sessionStorage.getItem(slot) === snapshot.get("operationId"))
          sessionStorage.removeItem(slot);
        void user
          .getIdTokenResult()
          .then((token) => {
            if (
              current === generation &&
              Number(token.claims.auth_time) <= snapshot.get("cutoff")
            ) {
              sessionStorage.setItem("cluster-session-ended", "true");
              void signOut(auth);
            }
          })
          .catch(() => {});
      },
      () => {},
    );
  });
  return () => {
    ++generation;
    stopFence();
    stopAuth();
  };
};
export function sessionEnded() {
  const ended = sessionStorage.getItem("cluster-session-ended") === "true";
  sessionStorage.removeItem("cluster-session-ended");
  return ended;
}
export async function signOutAllDevices() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to continue.");
  // Store only a retry identity, never credentials or keys.
  const slot = `cluster-signout:${user.uid}`;
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
  const fence = await getDoc(doc(firestore, "sessionFences", user.uid));
  const operationId =
    fence.exists() && fence.get("status") === "pending"
      ? (fence.get("operationId") as string)
      : (sessionStorage.getItem(slot) ?? crypto.randomUUID());
  sessionStorage.setItem(slot, operationId);
  const result = await httpsCallable<
    { operationId: string },
    { status: string }
  >(
    functions,
    "revokeSessions",
  )({ operationId });
  if (result.data.status !== "complete")
    throw new Error("Sign-out is not complete. Try again.");
  sessionStorage.removeItem(slot);
  if (auth.currentUser) sessionStorage.setItem("cluster-session-ended", "true");
  await signOut(auth);
}
export const login = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logout = () => signOut(auth);
export async function loadKey() {
  const result = await httpsCallable<undefined, { kek: string; mode: string }>(
    functions,
    "profileKey",
  )();
  if (result.data.mode !== "mock")
    throw new Error("Unsupported encryption provider");
  return result.data.kek;
}
export function observeProfile(
  uid: string,
  kek: string,
  next: (profile: Profile | null, revision: number) => void,
  fail: (error: Error) => void,
) {
  let active = true;
  let serial = 0;
  const stop = onSnapshot(
    doc(firestore, "profiles", uid),
    (snapshot) => {
      const version = ++serial;
      if (!snapshot.exists()) {
        next(null, 0);
        return;
      }
      const view = snapshot.data() as ProfileView;
      const context = profileContext(uid, view.revision);
      void unwrap(view.grant, kek, uid, context, "mock")
        .then((key) =>
          provider("mock").open<Profile>(view.envelope, key, context),
        )
        .then((profile) => {
          if (active && version === serial) next(profile, view.revision);
        })
        .catch((error) => {
          if (active) fail(error);
        });
    },
    fail,
  );
  return () => {
    active = false;
    stop();
  };
}
export async function prepareProfile(
  uid: string,
  kek: string,
  profile: Profile,
  revision: number,
) {
  const id = crypto.randomUUID();
  const envelope = await provider("mock").seal(
    { kind: "profile.set", expectedRevision: revision, profile },
    kek,
    commandContext(uid, id),
  );
  return { id, envelope };
}
export function submitProfile(
  uid: string,
  pending: { id: string; envelope: Envelope; dispatched?: boolean },
  next: (receipt: Receipt) => void,
  fail: (error: Error) => void,
) {
  return submitCommand(
    pending,
    pending.envelope,
    `profileCommands/${uid}/${pending.id}`,
    ["profiles", uid, "receipts", pending.id],
    next,
    fail,
  );
}
export function submitCommand<T>(
  pending: { dispatched?: boolean },
  payload: unknown,
  ingress: string,
  receipt: string[],
  next: (value: T) => void,
  fail: (error: Error) => void,
) {
  let active = true;
  const expected = commandDigest(ingress, payload);
  // Subscribe before write. Receipt remains authoritative even when retrying a create-only command.
  const stop = onSnapshot(
    doc(firestore, receipt[0], ...receipt.slice(1)),
    (snapshot) => {
      if (active && snapshot.exists()) {
        void expected
          .then((digest) => {
            if (!active) return;
            verifyReceipt(snapshot.data(), digest);
            next(snapshot.data() as T);
          })
          .catch((error: Error) => {
            if (active) fail(error);
          });
      }
    },
    fail,
  );
  if (!pending.dispatched) {
    pending.dispatched = true;
    void set(ref(database, ingress), payload).catch((error) => {
      // A retry can be denied because the original was accepted. Keep listening for its receipt.
      if (error.code !== "PERMISSION_DENIED") {
        pending.dispatched = false;
        if (active) fail(error);
      }
    });
  }
  return () => {
    active = false;
    stop();
  };
}
