export const campaignPendingMessage = "Awaiting acknowledgement…";
export const campaignNetworkMessage =
  "The connection was interrupted. Your selection and pending order are preserved.";
const reasons: Record<string, string> = {
  conflict:
    "The roster changed. Review the current seats and submit your choice again.",
  full: "That faction has no seats remaining. Choose an available faction.",
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
) {
  if (receipt.status === "rejected")
    return {
      message: "",
      error: reasons[receipt.reason ?? "invalid"] ?? reasons.invalid,
      remedy:
        receipt.reason === "conflict"
          ? ("conflict" as const)
          : ("validation" as const),
    };
  return {
    message:
      kind === "campaign.pause"
        ? "Campaign paused. Admissions and scheduled start are stopped."
        : kind === "campaign.resume"
          ? "Campaign resumed."
          : kind === "campaign.create"
            ? "Campaign created. Choose your faction."
            : kind === "campaign.leave"
              ? "Your seat has been released."
              : "Your seat is confirmed.",
    error: "",
    remedy: null,
  };
}
