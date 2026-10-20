import { getApp } from "firebase-admin/app";

const keyName =
  "projects/clusterii-20261020/locations/us-central1/keyRings/cluster/cryptoKeys/campaign-wrapping";
export interface ProtectedKey {
  algorithm: "GCP-KMS";
  keyVersion: string;
  ciphertext: string;
}
export class KeyServiceError extends Error {}
export const realAvailable = () =>
  process.env.FUNCTIONS_EMULATOR !== "true" ||
  process.env.CLUSTER_KMS_TEST === "true";
// Castagnoli checksum protects the request/response transport, not ciphertext authenticity.
export function crc32c(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0x82f63b78 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function request(operation: "encrypt" | "decrypt", body: object) {
  if (!realAvailable())
    throw new KeyServiceError(
      "Managed encryption is not configured for this emulator.",
    );
  try {
    const credential = getApp().options.credential;
    if (!credential) throw new Error("Missing service credentials");
    const token = await credential.getAccessToken();
    const response = await fetch(
      `https://cloudkms.googleapis.com/v1/${keyName}:${operation}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
          "x-goog-user-project": "clusterii-20261020",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) {
      const failure = (await response.json()) as {
        error?: { details?: { reason?: string }[] };
      };
      const reason =
        failure.error?.details?.find((detail) => detail.reason)?.reason ??
        "UNAVAILABLE";
      throw new Error(
        `Managed key service returned ${response.status} (${reason})`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    throw new KeyServiceError(
      error instanceof Error ? error.message : "Managed key service failed",
    );
  }
}
const associated = (purpose: string) =>
  Buffer.from(`cluster-key:v1:${purpose}`, "utf8");
export async function protect(
  key: string,
  purpose: string,
): Promise<ProtectedKey> {
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new KeyServiceError("Invalid key material");
  const plain = Buffer.from(key, "hex"),
    aad = associated(purpose);
  const result = await request("encrypt", {
    plaintext: plain.toString("base64"),
    plaintextCrc32c: String(crc32c(plain)),
    additionalAuthenticatedData: aad.toString("base64"),
    additionalAuthenticatedDataCrc32c: String(crc32c(aad)),
  });
  if (
    typeof result.ciphertext !== "string" ||
    typeof result.name !== "string" ||
    !result.name.startsWith(`${keyName}/cryptoKeyVersions/`) ||
    result.verifiedPlaintextCrc32c !== true ||
    result.verifiedAdditionalAuthenticatedDataCrc32c !== true ||
    crc32c(Buffer.from(result.ciphertext, "base64")) !==
      Number(result.ciphertextCrc32c)
  )
    throw new KeyServiceError("Managed key response integrity failure");
  return {
    algorithm: "GCP-KMS",
    keyVersion: result.name,
    ciphertext: result.ciphertext,
  };
}
export async function unprotect(value: ProtectedKey, purpose: string) {
  if (
    !value ||
    value.algorithm !== "GCP-KMS" ||
    !value.keyVersion.startsWith(`${keyName}/cryptoKeyVersions/`)
  )
    throw new KeyServiceError("Unsupported protected key");
  const cipher = Buffer.from(value.ciphertext, "base64"),
    aad = associated(purpose);
  const result = await request("decrypt", {
    ciphertext: value.ciphertext,
    ciphertextCrc32c: String(crc32c(cipher)),
    additionalAuthenticatedData: aad.toString("base64"),
    additionalAuthenticatedDataCrc32c: String(crc32c(aad)),
  });
  if (typeof result.plaintext !== "string")
    throw new KeyServiceError("Missing managed key response");
  const key = Buffer.from(result.plaintext, "base64");
  if (key.length !== 32 || crc32c(key) !== Number(result.plaintextCrc32c))
    throw new KeyServiceError("Managed key response integrity failure");
  return key.toString("hex");
}
