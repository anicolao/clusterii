/** Versioned object codecs. Mock is inspectable and forgeable; real uses Web Crypto AES-GCM. */
export type Mode = "mock" | "real";
export interface Context {
  gameId: string;
  objectId: string;
  revision: number;
  epoch: number;
  keyVersion: number;
}
export interface Envelope extends Context {
  format: 1;
  mode: Mode;
  algorithm: "MOCK-PREFIX-SHA256" | "AES-256-GCM";
  nonce: string;
  ciphertext: string;
  tag: string;
}
export interface Grant {
  recipient: string;
  object: Context;
  wrappedKey: Envelope;
}
const encode = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 4096)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 4096));
  return btoa(binary);
};
const decode = (s: string) =>
  new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
  );
const canonical = (c: Context) =>
  JSON.stringify([c.gameId, c.objectId, c.revision, c.epoch, c.keyVersion]);
async function digest(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function newKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function checkContext(c: Context) {
  if (
    !c.gameId ||
    !c.objectId ||
    !Number.isSafeInteger(c.revision) ||
    c.revision < 0 ||
    !Number.isSafeInteger(c.epoch) ||
    c.epoch < 1 ||
    !Number.isSafeInteger(c.keyVersion) ||
    c.keyVersion < 1
  )
    throw new Error("Invalid encryption context");
}
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
function unhex(value: string, length: number) {
  if (
    typeof value !== "string" ||
    value.length !== length * 2 ||
    !/^[a-f0-9]+$/.test(value)
  )
    throw new Error("Invalid encoded key or nonce");
  return Uint8Array.from(value.match(/../g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );
}
const authenticated = (context: Context) =>
  new TextEncoder().encode(
    JSON.stringify([
      "cluster-envelope",
      1,
      "real",
      "AES-256-GCM",
      canonical(context),
    ]),
  );
async function aesKey(key: string) {
  return crypto.subtle.importKey(
    "raw",
    unhex(key, 32),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
const realProvider = {
  async seal(value: unknown, key: string, context: Context): Promise<Envelope> {
    checkContext(context);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: nonce,
          additionalData: authenticated(context),
          tagLength: 128,
        },
        await aesKey(key),
        new TextEncoder().encode(JSON.stringify(value)),
      ),
    );
    let binary = "";
    for (let offset = 0; offset < encrypted.length - 16; offset += 4096)
      binary += String.fromCharCode(
        ...encrypted.subarray(
          offset,
          Math.min(offset + 4096, encrypted.length - 16),
        ),
      );
    return {
      ...context,
      format: 1,
      mode: "real",
      algorithm: "AES-256-GCM",
      nonce: hex(nonce),
      ciphertext: btoa(binary),
      tag: hex(encrypted.slice(-16)),
    };
  },
  async open<T>(
    envelope: Envelope,
    key: string,
    expected: Context,
  ): Promise<T> {
    checkContext(expected);
    if (
      envelope.format !== 1 ||
      envelope.mode !== "real" ||
      envelope.algorithm !== "AES-256-GCM" ||
      canonical(envelope) !== canonical(expected)
    )
      throw new Error("Envelope context mismatch");
    const ciphertext = Uint8Array.from(atob(envelope.ciphertext), (c) =>
      c.charCodeAt(0),
    );
    const bytes = new Uint8Array(ciphertext.length + 16);
    bytes.set(ciphertext);
    bytes.set(unhex(envelope.tag, 16), ciphertext.length);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: unhex(envelope.nonce, 12),
        additionalData: authenticated(expected),
        tagLength: 128,
      },
      await aesKey(key),
      bytes,
    );
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(plaintext),
    ) as T;
  },
};
export function provider(mode: Mode) {
  if (mode === "real") return realProvider;
  if (mode !== "mock") throw new Error("Unsupported encryption provider");
  return {
    async seal(
      value: unknown,
      key: string,
      context: Context,
    ): Promise<Envelope> {
      checkContext(context);
      if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid key");
      const nonce = newKey();
      const ciphertext = `mock.v1:${encode(JSON.stringify([key, value]))}`;
      const tag = await digest(canonical(context) + nonce + ciphertext);
      return {
        ...context,
        format: 1,
        mode,
        algorithm: "MOCK-PREFIX-SHA256",
        nonce,
        ciphertext,
        tag,
      };
    },
    async open<T>(
      envelope: Envelope,
      key: string,
      expected: Context,
    ): Promise<T> {
      checkContext(expected);
      if (
        envelope.format !== 1 ||
        envelope.mode !== mode ||
        envelope.algorithm !== "MOCK-PREFIX-SHA256" ||
        canonical(envelope) !== canonical(expected) ||
        !envelope.ciphertext.startsWith("mock.v1:")
      )
        throw new Error("Envelope context mismatch");
      if (
        (await digest(
          canonical(envelope) + envelope.nonce + envelope.ciphertext,
        )) !== envelope.tag
      )
        throw new Error("Damaged envelope");
      const [storedKey, value] = JSON.parse(
        decode(envelope.ciphertext.slice(8)),
      );
      if (storedKey !== key) throw new Error("Wrong key");
      return value as T;
    },
  };
}
function grantContext(object: Context, recipient: string): Context {
  return {
    ...object,
    objectId: JSON.stringify(["grant", object.objectId, recipient]),
  };
}
export async function wrap(
  key: string,
  kek: string,
  recipient: string,
  object: Context,
  mode: Mode,
): Promise<Grant> {
  return {
    recipient,
    object,
    wrappedKey: await provider(mode).seal(
      key,
      kek,
      grantContext(object, recipient),
    ),
  };
}
export async function unwrap(
  grant: Grant,
  kek: string,
  recipient: string,
  object: Context,
  mode: Mode,
) {
  if (
    grant.recipient !== recipient ||
    canonical(grant.object) !== canonical(object)
  )
    throw new Error("Grant recipient or version mismatch");
  return provider(mode).open<string>(
    grant.wrappedKey,
    kek,
    grantContext(object, recipient),
  );
}
