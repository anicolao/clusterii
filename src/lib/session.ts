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
const database = getDatabase(app);
const firestore = getFirestore(app);
const functions = getFunctions(app, "us-central1");
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
export const observeAccount = (next: (user: User | null) => void) =>
  onAuthStateChanged(auth, next);
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
  pending: { id: string; envelope: Envelope },
  next: (receipt: Receipt) => void,
  fail: (error: Error) => void,
) {
  let active = true;
  // Subscribe before write. Receipt remains authoritative even when retrying a create-only command.
  const stop = onSnapshot(
    doc(firestore, "profiles", uid, "receipts", pending.id),
    (snapshot) => {
      if (active && snapshot.exists()) next(snapshot.data() as Receipt);
    },
    fail,
  );
  void set(
    ref(database, `profileCommands/${uid}/${pending.id}`),
    pending.envelope,
  ).catch((error) => {
    // A retry can be denied because the original was accepted. Keep listening for its receipt.
    if (active && error.code !== "PERMISSION_DENIED") fail(error);
  });
  return () => {
    active = false;
    stop();
  };
}
