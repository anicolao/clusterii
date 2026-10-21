import type { Context, Envelope, Grant } from "./crypto.js";
export const portraits = [
  "G1",
  "G2",
  "M1",
  "M2",
  "A1",
  "A2",
  "O1",
  "O2",
] as const;
export type Portrait = (typeof portraits)[number];
export interface Profile {
  alias: string;
  portrait: Portrait;
}
export interface ProfileAction {
  kind: "profile.set";
  expectedRevision: number;
  profile: Profile;
}
export interface ProfileView {
  revision: number;
  envelope: Envelope;
  grant: Grant;
}
export interface Receipt {
  status: "accepted" | "rejected";
  revision: number;
  reason?: "conflict" | "invalid" | "session";
}
export const profileContext = (uid: string, revision: number): Context => ({
  gameId: `profile:${uid}`,
  objectId: "profile",
  revision,
  epoch: 1,
  keyVersion: 1,
});
export const commandContext = (uid: string, id: string): Context => ({
  ...profileContext(uid, 0),
  objectId: `command:${id}`,
});
export function reduceProfile(
  currentRevision: number,
  input: unknown,
): Profile {
  if (!input || typeof input !== "object") throw new Error("invalid");
  const a = input as ProfileAction;
  if (
    a.kind !== "profile.set" ||
    !Number.isSafeInteger(a.expectedRevision) ||
    a.expectedRevision < 0 ||
    !a.profile ||
    typeof a.profile.alias !== "string" ||
    !portraits.includes(a.profile.portrait)
  )
    throw new Error("invalid");
  const alias = a.profile.alias.normalize("NFC").trim();
  if ([...alias].length < 2 || [...alias].length > 24 || /[\p{C}]/u.test(alias))
    throw new Error("invalid");
  if (a.expectedRevision !== currentRevision) throw new Error("conflict");
  return { alias, portrait: a.profile.portrait };
}
