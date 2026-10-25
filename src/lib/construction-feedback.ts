import type { CampaignAction, CampaignView } from "@shared/campaign";
export interface RecoveredConstruction {
  id: string;
  gameId: string;
  action: Extract<
    CampaignAction,
    { kind: "construction.build" | "construction.cancel" }
  >;
}
export interface AcceptedConstruction {
  gameId: string;
  orderId: string;
  revision: number;
}
export function constructionSettlementFeedback(
  view: CampaignView,
  command: AcceptedConstruction,
) {
  if (view.id !== command.gameId || view.revision < command.revision)
    return null;
  const outcome = view.construction?.ledger.find(
    (event) => event.id === command.orderId,
  );
  if (outcome) {
    const name = {
      market: "Market",
      camp: "Training camp",
      base: "Base",
      station: "Space station",
    }[outcome.type];
    const refund = (outcome.refundMilli / 1000).toLocaleString("en-US", {
      maximumFractionDigits: 3,
    });
    return {
      message: `${name} ${outcome.result}.${outcome.refundMilli ? ` ${refund} credits returned.` : ""}`,
      error: "",
      remedy: null,
    };
  }
  if (view.construction?.orders.some((order) => order.id === command.orderId))
    return null;
  // A late receipt can follow the one-tick ledger. Acceptance alone does not
  // prove that a build or refund remains scheduled.
  return {
    message:
      "Construction order acknowledged. Open history to inspect its outcome.",
    error: "",
    remedy: null,
  };
}
