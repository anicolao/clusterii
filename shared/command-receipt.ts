/** Bind an acknowledgement to the exact encrypted request, including its admission path. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
    .join(",")}}`;
}
export async function commandDigest(
  ingress: string,
  payload: unknown,
): Promise<string> {
  const bytes = new TextEncoder().encode(canonical({ ingress, payload }));
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
export class ReceiptMismatch extends Error {
  constructor() {
    super(
      "This acknowledgement does not match your order. Your draft is preserved. Review it and submit again.",
    );
    this.name = "ReceiptMismatch";
  }
}
export function verifyReceipt(
  receipt: { requestDigest?: string },
  expected: string,
): void {
  if (receipt.requestDigest !== expected) throw new ReceiptMismatch();
}
