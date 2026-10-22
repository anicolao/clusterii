import type { CampaignView } from "@shared/campaign";
import type { FleetAction, FleetOutcome } from "@shared/fleets";
import type { TravelAction } from "@shared/travel";
export interface RecoveredFleetCommand {
  gameId: string;
  id: string;
  action:
    | Extract<FleetAction, { kind: "fleet.split" | "fleet.merge" }>
    | TravelAction;
}
/** Recovery may select only a fleet in the current authorized private projection. */
export function fleetRecoveryTarget(
  view: CampaignView | null,
  recovered: RecoveredFleetCommand | null,
) {
  if (!view || !recovered || recovered.gameId !== view.id) return null;
  const fleet = view.military?.fleets.find(
    (f) => f.id === recovered.action.fleetId,
  );
  if (!fleet || !view.stars.some((s) => s.id === fleet.starId)) return null;
  return fleet;
}
/** Existing local choices, including an intentionally empty route, always win. */
export function recoveredRouteDraft(
  current: string[] | undefined,
  submitted: readonly string[],
) {
  return current ?? [...submitted];
}
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
      departed: "Fleet departed. Its route and arrival tick are confirmed.",
      arrived: "Fleet arrived. Review its surviving forces and system control.",
      destroyed: "Fleet lost on arrival. Review the recorded outcome.",
      halted:
        "Route stopped before departure. Review navigation and system control.",
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
  const traveling = view.military?.fleets.find(
    (f) => f.travel?.commandId === command.id,
  );
  if (traveling?.travel)
    return {
      message:
        traveling.travel.status === "traveling"
          ? `Fleet traveling. Arrival tick ${traveling.travel.arrivalTick}.`
          : "Fleet at waypoint. Onward departure is scheduled for the next tick.",
      error: "",
      remedy: null,
    };
  // A late receipt may arrive after the one-tick outcome ledger has advanced.
  // Acceptance does not prove that a transfer is still waiting to execute.
  return {
    message: "Fleet order accepted. Open history to inspect its outcome.",
    error: "",
    remedy: null,
  };
}
