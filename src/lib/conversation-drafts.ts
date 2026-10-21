import { type Context, type Mode, provider } from "@shared/crypto";
import { onAuthStateChanged } from "firebase/auth";
import { commandKey } from "./campaign-session";
import { RecoveryConflict, readDraft, saveDraft } from "./recovery-store";
import { auth } from "./session";

let generation = 0;
const keys = new Map<string, Promise<string>>();
onAuthStateChanged(auth, () => {
  generation++;
  keys.clear();
});
async function storageKey(uid: string, mode: Mode) {
  if (auth.currentUser?.uid !== uid)
    throw new Error("Sign in to recover your draft.");
  const session = generation,
    slot = `${uid}:${mode}`;
  let key = keys.get(slot);
  if (!key) {
    key = deriveStorageKey(uid, mode).catch((error) => {
      keys.delete(slot);
      throw error;
    });
    keys.set(slot, key);
  }
  const result = await key;
  if (session !== generation || auth.currentUser?.uid !== uid)
    throw new Error("Account changed while recovering your draft.");
  return result;
}
async function deriveStorageKey(uid: string, mode: Mode) {
  if (auth.currentUser?.uid !== uid)
    throw new Error("Sign in to recover your draft.");
  const raw = await commandKey(mode);
  if (!/^[a-f0-9]{64}$/.test(raw))
    throw new Error("The account storage key could not be validated.");
  const base = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(raw.match(/../g) ?? [], (p) => Number.parseInt(p, 16)),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("cluster-browser-drafts-v1"),
      info: new TextEncoder().encode(uid),
    },
    base,
    256,
  );
  if (auth.currentUser?.uid !== uid)
    throw new Error("Account changed while recovering your draft.");
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
const context = (
  uid: string,
  gameId: string,
  roomId: string,
  revision: number,
): Context => ({
  gameId,
  objectId: `browser-draft:${uid}:${roomId}`,
  revision,
  epoch: 1,
  keyVersion: 1,
});
export async function recoverDraft(
  uid: string,
  gameId: string,
  roomId: string,
) {
  const stored = await readDraft(uid, gameId, roomId);
  if (!stored) return { revision: 0, text: "" };
  const mode = stored.envelope.mode;
  if (mode !== "mock" && mode !== "real")
    throw new Error("Unsupported draft encryption.");
  const body = await provider(mode).open<{ text: string }>(
    stored.envelope,
    await storageKey(uid, mode),
    context(uid, gameId, roomId, stored.revision),
  );
  if (typeof body.text !== "string" || [...body.text].length > 4000)
    throw new Error("The saved draft could not be validated.");
  return { revision: stored.revision, text: body.text };
}
export async function persistDraft(
  uid: string,
  gameId: string,
  roomId: string,
  mode: Mode,
  revision: number,
  text: string,
) {
  const envelope = await provider(mode).seal(
    { text },
    await storageKey(uid, mode),
    context(uid, gameId, roomId, revision + 1),
  );
  if (auth.currentUser?.uid !== uid)
    throw new Error("Account changed before the draft could be saved.");
  await saveDraft(uid, gameId, roomId, revision, envelope);
  return revision + 1;
}

export async function clearAcceptedDraft(
  uid: string,
  gameId: string,
  roomId: string,
  body: string,
) {
  const saved = await recoverDraft(uid, gameId, roomId);
  if (!saved.revision || saved.text.trim() !== body.trim()) return;
  const stored = await readDraft(uid, gameId, roomId);
  if (!stored || stored.revision !== saved.revision) return;
  try {
    await persistDraft(
      uid,
      gameId,
      roomId,
      stored.envelope.mode,
      saved.revision,
      "",
    );
  } catch (error) {
    if (!(error instanceof RecoveryConflict)) throw error;
  }
}
