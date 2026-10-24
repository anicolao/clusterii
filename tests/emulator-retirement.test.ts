// Diagnostic only: real SDK, authentication, rules, Functions and acknowledged profile commands.
import { test, expect } from "bun:test";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  onSnapshot,
  getDocFromServer,
  terminate,
} from "firebase/firestore";
import {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  set,
} from "firebase/database";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { createRequire } from "node:module";
import { appendFileSync } from "node:fs";
import { provider } from "../shared/crypto";
import { commandContext } from "../shared/profile";
import { commandDigest } from "../shared/command-receipt";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const admin = require("firebase-admin/app");
if (!admin.getApps().length)
  admin.initializeApp({ projectId: "demo-clusterii" });
const adminAuth = require("firebase-admin/auth").getAuth();
const apps: ReturnType<typeof initializeApp>[] = [];
async function client(role: string, developer = false) {
  const app = initializeApp(
    {
      projectId: "demo-clusterii",
      apiKey: "demo-key",
      databaseURL: "http://127.0.0.1:19000?ns=demo-clusterii-default-rtdb",
    },
    role + crypto.randomUUID(),
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:19099", {
    disableWarnings: true,
  });
  const { user } = await signInWithCredential(
    auth,
    GoogleAuthProvider.credential(
      JSON.stringify({
        sub: crypto.randomUUID(),
        email: `${role}-${crypto.randomUUID()}@example.test`,
        email_verified: true,
      }),
    ),
  );
  if (developer) {
    await adminAuth.setCustomUserClaims(user.uid, { developer: true });
    await user.getIdToken(true);
  }
  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, "127.0.0.1", 18080);
  const database = getDatabase(app);
  connectDatabaseEmulator(database, "127.0.0.1", 19000);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 15001);
  const { data } = await httpsCallable<undefined, { kek: string }>(
    functions,
    "profileKey",
  )();
  return { app, user, firestore, database, kek: data.kek };
}
async function listen(c: Awaited<ReturnType<typeof client>>) {
  let stop = () => {};
  await new Promise<void>((resolve, reject) => {
    stop = onSnapshot(
      collection(c.firestore, "developmentCampaigns"),
      { includeMetadataChanges: true },
      (s) => {
        if (!s.metadata.fromCache) resolve();
      },
      reject,
    );
  });
  return stop;
}
async function save(c: Awaited<ReturnType<typeof client>>, revision: number) {
  const id = crypto.randomUUID();
  const envelope = await provider("mock").seal(
    {
      kind: "profile.set",
      expectedRevision: revision,
      profile: { alias: `Retirement controller ${revision}`, portrait: "G1" },
    },
    c.kek,
    commandContext(c.user.uid, id),
  );
  const path = `profileCommands/${c.user.uid}/${id}`;
  let stop = () => {};
  const receipt = new Promise<Record<string, unknown>>((resolve, reject) => {
    stop = onSnapshot(
      doc(c.firestore, "profiles", c.user.uid, "receipts", id),
      (s) => {
        if (s.exists()) resolve(s.data());
      },
      reject,
    );
  });
  try {
    await set(ref(c.database, path), envelope);
    const accepted = await receipt;
    expect(accepted.status).toBe("accepted");
    expect(accepted.requestDigest).toBe(await commandDigest(path, envelope));
    expect(
      (await getDocFromServer(doc(c.firestore, "profiles", c.user.uid))).get(
        "revision",
      ),
    ).toBe(revision + 1);
  } finally {
    stop();
  }
}
test("explicit unsubscribe versus SDK termination with real authorized service writes", async () => {
  if (
    process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" ||
    !process.env.CLUSTER_RETIREMENT_OUTPUT
  )
    throw Error("Owned demo observation required");
  const mark = (phase: string) =>
    appendFileSync(
      process.env.CLUSTER_RETIREMENT_OUTPUT!,
      JSON.stringify({ phase, at: Date.now() }) + "\n",
    );
  try {
    const controller = await client("retirement-controller"),
      abrupt = await client("retirement-terminated", true);
    await listen(abrupt);
    mark("terminated-listener-live");
    await save(controller, 0);
    await terminate(abrupt.firestore);
    mark("sdk-termination-complete");
    await save(controller, 1);
    mark("after-termination-write-accepted");
    const explicit = await client("retirement-unsubscribed", true);
    const stop = await listen(explicit);
    mark("explicit-listener-live");
    await save(controller, 2);
    stop();
    // Real server read uses this SDK watch stream; no sleep or internal queue manipulation.
    await getDocFromServer(
      doc(explicit.firestore, "profiles", explicit.user.uid),
    );
    mark("explicit-unsubscribe-and-read-complete");
    await save(controller, 3);
    mark("after-unsubscribe-write-accepted");
    await terminate(explicit.firestore);
    mark("explicit-termination-complete");
    await save(controller, 4);
    mark("after-both-terminations-write-accepted");
    const outsider = await client("retirement-outsider");
    await expect(
      getDocFromServer(
        doc(outsider.firestore, "profiles", controller.user.uid),
      ),
    ).rejects.toThrow();
    mark("foreign-read-denied");
  } finally {
    await Promise.all(apps.map(deleteApp));
  }
}, 30000);
