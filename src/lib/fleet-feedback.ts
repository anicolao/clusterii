import type { CampaignView } from "@shared/campaign";
import type { FleetOutcome } from "@shared/fleets";
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
    const messages: Record<
      Exclude<FleetOutcome["result"], "invalid">,
      string
    > = {
      formed: "Fleet formed.",
      disbanded: "Fleet disbanded. Forces returned to the system.",
      loaded: `${outcome.infantry} infantry loaded.`,
      unloaded: `${outcome.infantry} infantry unloaded.`,
      split: "Fleet split. Both complements are stationed here.",
      merged: "Fleets merged. The receiving fleet retains all forces.",
    };
    const message = messages[outcome.result];
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
