export const campaignPendingMessage = "Awaiting acknowledgement…";
export const campaignNetworkMessage =
  "The connection was interrupted. Your selection and pending order are preserved.";
const conversationMessages: Record<string, string> = {
  "conversation.create": "Conversation created.",
  "conversation.invite": "Invitation sent. Earlier messages are not shared.",
  "conversation.accept":
    "Invitation accepted. Your authorized history and future messages are available.",
  "conversation.decline": "Invitation declined.",
  "conversation.remove": "Participant removed. Future access has ended.",
  "conversation.leave": "You left the conversation. Future access has ended.",
  "conversation.close":
    "Conversation closed. Its authorized history remains available.",
  "conversation.send": "Message sent.",
  "conversation.read": "Reading position saved.",
};
const reasons: Record<string, string> = {
  "conversation-history":
    "Choose up to eight distinct messages from this conversation’s authorized history, then review the invitation again.",
  "conversation-history-consent":
    "Review the invitation’s selected history before accepting. This client must support that scope.",
  "conversation-sharing-unavailable":
    "This campaign supports future-only invitations. Selected history is available in new development campaigns.",
  "conversation-invalid":
    "Check the title, message or participant and try again.",
  "conversation-unavailable":
    "This older campaign has no conversations. Create a new development campaign; its existing history remains available.",
  "conversation-limit":
    "Each commander can create four conversations in this development campaign.",
  "conversation-closed":
    "This conversation is closed. Its authorized history remains available.",
  "route-invalid":
    "Choose distinct adjacent systems and a final destination different from the origin.",
  "route-range":
    "A leg exceeds navigation range. Choose a closer waypoint or research navigation.",
  "fleet-traveling":
    "This fleet has an active route. It cannot transfer or reorganize forces while traveling.",
  "travel-unavailable":
    "This older development campaign does not support travel. Create a new development campaign; your history and forces remain accessible.",
  "fleet-unavailable":
    "Fleet preparation begins after home assignment in a production-enabled campaign.",
  "fleet-capacity":
    "Choose whole force counts with at least one fighter and at most ten infantry per fighter.",
  "insufficient-forces":
    "Some forces are unavailable or already reserved. Review the current manifest.",
  "fleet-limit": "Your empire has reached its fleet limit.",
  "fleet-order-unavailable":
    "This order is no longer available to cancel. Review the current manifest.",
  "fleet-order-closed":
    "This order’s execution cutoff has passed. Its outcome will appear after settlement.",
  "fleet-order-pending": "This fleet already has a pending order.",
  "pending-work-capacity":
    "This campaign is at its state capacity. Wait for pending work to settle or merge/disband stationed fleets before adding more orders.",
  "focus-unavailable":
    "Market focus begins after home assignment in a production-enabled campaign.",
  "focus-queue-full":
    "Your focus queue is full. Wait for settlement before submitting another allocation.",
  "construction-unavailable":
    "Construction begins after home assignment in a production-enabled campaign.",
  "construction-capacity":
    "This development has reached capacity. Research terraforming to expand it.",
  "construction-queue-full":
    "This layer’s queue is full. Wait for completion or cancel an order.",
  "insufficient-credits":
    "More credits are needed. Wait for production or choose another development.",
  "cancellation-pending": "A cancellation is already queued for this order.",
  "research-unavailable":
    "Research selection begins after home assignment in a production-enabled campaign.",
  "research-queue-full":
    "Your research queue is full. Wait for the next confirmed tick before submitting another selection.",
  session: "Your session ended. Sign in again.",
  conflict:
    "The roster changed. Review the current seats and submit your choice again.",
  full: "That faction has no seats remaining. Choose an available faction.",
  migrating:
    "Encryption maintenance is in progress. Wait for verification before submitting another order.",
  "pause-required":
    "Pause this development campaign before changing encryption.",
  unavailable:
    "Managed encryption is unavailable. The campaign has not changed.",
  "migration-failed":
    "Encryption verification failed. The previous game is preserved and remains paused. Resume it or retry the change.",
  paused:
    "This campaign is paused for development maintenance. Your choice is preserved.",
  started: "This campaign has begun. Its roster is closed.",
  "already-joined": "You already have a seat in this campaign.",
  "profile-required": "Save your identity before joining a campaign.",
  permission: "Development access is required for this campaign.",
  invalid: "Check your campaign name and settings, then try again.",
  exists: "This campaign already exists. Open it from the directory.",
};
export function campaignFeedback(
  kind: string,
  receipt: { status: "accepted" | "rejected"; reason?: string },
  scope: { sharedMessages?: number } = {},
) {
  if (receipt.status === "rejected")
    return {
      message: "",
      error: kind.startsWith("conversation.")
        ? receipt.reason === "conflict"
          ? "The conversation changed. Your draft is preserved. Review its participants before sending again."
          : receipt.reason === "permission"
            ? "Conversation access has ended or this action is not permitted. Your draft is preserved."
            : (reasons[receipt.reason ?? "conversation-invalid"] ??
              reasons["conversation-invalid"])
        : kind.startsWith("fleet.")
          ? receipt.reason === "conflict"
            ? "The campaign changed. Your manifest is preserved. Review available forces and submit again."
            : receipt.reason === "permission"
              ? "You must control orbit, and surface when embarking or returning infantry."
              : receipt.reason === "invalid"
                ? "Choose whole force counts or a stationed fleet."
                : (reasons[receipt.reason ?? "invalid"] ?? reasons.invalid)
          : kind === "market.focus"
            ? receipt.reason === "conflict"
              ? "The campaign changed. Your allocation is preserved. Review it and submit again."
              : receipt.reason === "invalid"
                ? "Allocate exactly 100 whole points across the four developments."
                : (reasons[receipt.reason ?? "invalid"] ?? reasons.invalid)
            : kind.startsWith("construction.")
              ? receipt.reason === "conflict"
                ? "The campaign changed. Your development choice is preserved. Review the current quote and submit again."
                : receipt.reason === "permission"
                  ? "You must control the development’s layer to change its queue."
                  : receipt.reason === "invalid"
                    ? "Choose an available development or queued order."
                    : (reasons[receipt.reason ?? "invalid"] ?? reasons.invalid)
              : kind === "research.select" && receipt.reason === "conflict"
                ? "The campaign changed. Your research choice is preserved. Review the current progress and submit again."
                : kind === "research.select" && receipt.reason === "invalid"
                  ? "Choose one of the eight research tracks."
                  : (reasons[receipt.reason ?? "invalid"] ?? reasons.invalid),
      remedy:
        receipt.reason === "conflict"
          ? ("conflict" as const)
          : ("validation" as const),
    };
  return {
    message:
      (kind === "conversation.invite" && (scope.sharedMessages ?? 0) > 0
        ? `Invitation sent. ${scope.sharedMessages} selected earlier messages will be shared after acceptance.`
        : conversationMessages[kind]) ??
      (kind === "fleet.route"
        ? "Route accepted. Departure scheduled."
        : kind === "fleet.cancel"
          ? "Fleet order cancelled. Reservations released; no forces moved."
          : kind === "fleet.split" || kind === "fleet.merge"
            ? "Reorganization accepted. Execution scheduled."
            : kind === "fleet.load" || kind === "fleet.unload"
              ? "Cargo order accepted. Transfer scheduled."
              : kind.startsWith("fleet.")
                ? "Fleet order accepted. Reserved forces and its execution tick are listed in the manifest."
                : kind === "market.focus"
                  ? "Focus order accepted. Its application and dividend ticks are listed with your accepted orders."
                  : kind === "construction.build"
                    ? "Construction order accepted. Credits reserved; the queue advances at its scheduled ticks."
                    : kind === "construction.cancel"
                      ? "Cancellation accepted. The refund settles at its scheduled tick."
                      : kind === "research.select"
                        ? "Research order accepted. It will apply at its scheduled tick."
                        : kind === "campaign.migrate"
                          ? "Encryption changed and verified. Campaign resumed."
                          : kind === "campaign.pause"
                            ? "Campaign paused. Admissions and scheduled start are stopped."
                            : kind === "campaign.resume"
                              ? "Campaign resumed."
                              : kind === "campaign.create"
                                ? "Campaign created. Choose your faction."
                                : kind === "campaign.leave"
                                  ? "Your seat has been released."
                                  : "Your seat is confirmed."),
    error: "",
    remedy: null,
  };
}
