import { afterAll, expect, test } from "bun:test";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  set,
  get,
} from "firebase/database";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import {
  commandContext,
  profileContext,
  type ProfileView,
  type Profile,
} from "../shared/profile";
import { newKey, provider, unwrap } from "../shared/crypto";
const projectId = "demo-clusterii";
const clients: ReturnType<typeof initializeApp>[] = [];
async function client(name: string) {
  const app = initializeApp(
    {
      projectId,
      apiKey: "demo-key",
      databaseURL: "http://127.0.0.1:19000?ns=demo-clusterii-default-rtdb",
    },
    `${name}-${crypto.randomUUID()}`,
  );
  clients.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:19099", {
    disableWarnings: true,
  });
  const cred = GoogleAuthProvider.credential(
    JSON.stringify({
      sub: name,
      email: `${name}@example.test`,
      email_verified: true,
    }),
  );
  const { user } = await signInWithCredential(auth, cred);
  const database = getDatabase(app);
  connectDatabaseEmulator(database, "127.0.0.1", 19000);
  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, "127.0.0.1", 18080);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 15001);
  const { data } = await httpsCallable<undefined, { kek: string }>(
    functions,
    "profileKey",
  )();
  return { uid: user.uid, database, firestore, kek: data.kek };
}
afterAll(async () => {
  await Promise.all(clients.map(deleteApp));
});
async function receipt(c: Awaited<ReturnType<typeof client>>, id: string) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const result = await getDoc(
      doc(c.firestore, "profiles", c.uid, "receipts", id),
    );
    if (result.exists()) return result.data();
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("No authoritative receipt");
}
test("authenticated ingress, owner grants, replay, concurrent CAS and direct access rules", async () => {
  const alice = await client(`alice${Date.now()}`),
    bob = await client(`bob${Date.now()}`);
  const id = crypto.randomUUID();
  const codec = provider("mock");
  const body = await codec.seal(
    {
      kind: "profile.set",
      expectedRevision: 0,
      profile: { alias: "Alice 🌌", portrait: "A1" },
    },
    alice.kek,
    commandContext(alice.uid, id),
  );
  const command = ref(alice.database, `profileCommands/${alice.uid}/${id}`);
  await expect(
    set(ref(bob.database, `profileCommands/${alice.uid}/${id}`), body),
  ).rejects.toThrow();
  await set(command, body);
  expect((await receipt(alice, id)).status).toBe("accepted");
  await expect(set(command, body)).rejects.toThrow();
  await expect(get(command)).rejects.toThrow();
  const head = doc(alice.firestore, "profiles", alice.uid);
  const view = (await getDoc(head)).data() as ProfileView;
  expect(view.revision).toBe(1);
  const ctx = profileContext(alice.uid, 1);
  const key = await unwrap(view.grant, alice.kek, alice.uid, ctx, "mock");
  expect(await codec.open<Profile>(view.envelope, key, ctx)).toEqual({
    alias: "Alice 🌌",
    portrait: "A1",
  });
  await expect(
    getDoc(doc(bob.firestore, "profiles", alice.uid)),
  ).rejects.toThrow();
  await expect(
    getDoc(doc(alice.firestore, "profileKeys", alice.uid)),
  ).rejects.toThrow();
  await expect(setDoc(head, { revision: 999 })).rejects.toThrow();
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  await Promise.all(
    ids.map(async (next, i) =>
      set(
        ref(alice.database, `profileCommands/${alice.uid}/${next}`),
        await codec.seal(
          {
            kind: "profile.set",
            expectedRevision: 1,
            profile: { alias: `Alice ${i}`, portrait: "G1" },
          },
          alice.kek,
          commandContext(alice.uid, next),
        ),
      ),
    ),
  );
  const receipts = await Promise.all(ids.map((next) => receipt(alice, next)));
  expect(receipts.map((r) => r.status).sort()).toEqual([
    "accepted",
    "rejected",
  ]);
  expect(receipts.find((r) => r.status === "rejected")?.reason).toBe(
    "conflict",
  );
  expect((await getDoc(head)).get("revision")).toBe(2);
  const wrong = crypto.randomUUID();
  await set(
    ref(alice.database, `profileCommands/${alice.uid}/${wrong}`),
    await codec.seal(
      {
        kind: "profile.set",
        expectedRevision: 2,
        profile: { alias: "Forged", portrait: "G1" },
      },
      newKey(),
      commandContext(alice.uid, wrong),
    ),
  );
  expect((await receipt(alice, wrong)).status).toBe("rejected");
  expect((await getDoc(head)).get("revision")).toBe(2);
}, 60000);
