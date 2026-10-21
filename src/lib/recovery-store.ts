import type { Envelope } from "@shared/crypto";
import type { PendingCampaign } from "./campaign-session";

export class RecoveryStorageError extends Error {
  constructor() {
    super(
      "Browser recovery storage is unavailable. Your draft is preserved. Retry storage before sending.",
    );
  }
}
export class RecoveryConflict extends Error {
  constructor(public readonly area: "order" | "draft") {
    super(
      area === "order"
        ? "Another tab has an unfinished order. Recover it before sending this draft."
        : "This draft changed in another tab. Your text is preserved; review the saved draft before replacing it.",
    );
  }
}
export interface StoredDraft {
  revision: number;
  envelope: Envelope;
}
let opening: Promise<IDBDatabase> | undefined;
function database() {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("clusterii-recovery", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("orders");
      request.result.createObjectStore("drafts");
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opening = undefined;
      };
      resolve(db);
    };
    request.onerror = () => reject(new RecoveryStorageError());
    request.onblocked = () => reject(new RecoveryStorageError());
  }).catch((error) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
async function access<T>(
  store: "orders" | "drafts",
  key: string,
  update?: (value: T | undefined) => T | undefined,
) {
  try {
    const db = await database();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, update ? "readwrite" : "readonly");
      const objects = tx.objectStore(store),
        request = objects.get(key);
      let value: T | undefined, problem: unknown;
      request.onsuccess = () => {
        value = request.result as T | undefined;
        if (!update) return;
        try {
          value = update(value);
          if (value === undefined) objects.delete(key);
          else objects.put(value, key);
        } catch (error) {
          problem = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () =>
        reject(problem ?? new RecoveryStorageError());
    });
  } catch (error) {
    if (error instanceof RecoveryConflict) throw error;
    throw new RecoveryStorageError();
  }
}
export const readOrder = (uid: string) =>
  access<PendingCampaign>("orders", uid);
export async function claimOrder(uid: string, command: PendingCampaign) {
  const { dispatched: _, ...immutable } = command;
  await access<PendingCampaign>("orders", uid, (prior) => {
    if (prior && JSON.stringify(prior) !== JSON.stringify(immutable))
      throw new RecoveryConflict("order");
    return immutable;
  });
}
export async function clearOrder(uid: string, command: PendingCampaign) {
  const { dispatched: _, ...immutable } = command;
  await access<PendingCampaign>("orders", uid, (prior) => {
    if (prior && JSON.stringify(prior) !== JSON.stringify(immutable))
      throw new RecoveryConflict("order");
    return undefined;
  });
}
const draftKey = (uid: string, gameId: string, roomId: string) =>
  JSON.stringify([uid, gameId, roomId]);
export const readDraft = (uid: string, gameId: string, roomId: string) =>
  access<StoredDraft>("drafts", draftKey(uid, gameId, roomId));
export async function saveDraft(
  uid: string,
  gameId: string,
  roomId: string,
  expectedRevision: number,
  envelope: Envelope,
) {
  return access<StoredDraft>(
    "drafts",
    draftKey(uid, gameId, roomId),
    (prior) => {
      if ((prior?.revision ?? 0) !== expectedRevision)
        throw new RecoveryConflict("draft");
      return { revision: expectedRevision + 1, envelope };
    },
  );
}

export class RecoveryValidation extends Error {
  constructor(public readonly fingerprint: string) {
    super(
      "This browser’s saved order could not be validated. It has not been replaced or resent.",
    );
  }
}
export async function discardInvalidOrder(uid: string, fingerprint: string) {
  await access<PendingCampaign>("orders", uid, (prior) => {
    if (JSON.stringify(prior) !== fingerprint)
      throw new RecoveryConflict("order");
    return undefined;
  });
}
