import type { Receipt } from "@shared/profile";
export function receiptFeedback(receipt: Receipt) {
  if (receipt.status === "accepted")
    return {
      message: "Identity saved. Your next campaign will know you by this name.",
      error: "",
      remedy: "none" as const,
    };
  return {
    message: "",
    error:
      receipt.reason === "conflict"
        ? "Another device changed your identity. Your draft is preserved. Save again to replace that version."
        : "Choose a name of 2–24 characters and a portrait.",
    remedy:
      receipt.reason === "conflict"
        ? ("conflict" as const)
        : ("validation" as const),
  };
}
export const pendingMessage = "Sending your identity…";
export const networkMessage =
  "Your connection was interrupted. Reconnect to recover updates; your draft is preserved.";
