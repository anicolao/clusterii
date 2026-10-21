import type { CampaignView } from "@shared/campaign";
export interface AcceptedFleetCommand {
  gameId: string;
  id: string;
  revision: number;
}
/** Reconcile only the acknowledged command against this account's private view. */
export function fleetSettlementFeedback(
  view: CampaignView,
  command: AcceptedFleetCommand,
) {
  if (view.id !== command.gameId || view.revision < command.revision)
    return null;
  const outcome = view.military?.ledger.find(
    (entry) => entry.id === command.id,
  );
  if (outcome) {
    if (outcome.result === "invalid")
      return {
        message: "",
        error: "Fleet order could not execute. No forces were transferred.",
        remedy: "validation" as const,
      };
    const message =
      outcome.result === "loaded"
        ? `${outcome.infantry} infantry loaded.`
        : outcome.result === "unloaded"
          ? `${outcome.infantry} infantry unloaded.`
          : outcome.result === "formed"
            ? "Fleet formed."
            : "Fleet disbanded. Forces returned to the system.";
    return { message, error: "", remedy: null };
  }
  if (view.military?.orders.some((order) => order.id === command.id))
    return null;
  // A late receipt may arrive after the one-tick outcome ledger has advanced.
  // Acceptance does not prove that a transfer is still waiting to execute.
  return {
    message: "Fleet order accepted. Open history to inspect its outcome.",
    error: "",
    remedy: null,
  };
}
