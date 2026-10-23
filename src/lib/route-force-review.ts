import type { CampaignView } from "../../shared/campaign";
import { rules } from "../../shared/rules";

/** Confirmed authorized forces, never an estimate of future defenses. */
export function routeForceReview(view: CampaignView, fleetId: string) {
  const fleet = view.military?.fleets.find((item) => item.id === fleetId);
  if (!fleet) return null;
  const holding = view.holdings.find((item) => item.starId === fleet.starId);
  const others =
    view.military?.fleets.filter(
      (item) =>
        item.id !== fleetId &&
        item.starId === fleet.starId &&
        item.travel?.status !== "traveling",
    ) ?? [];
  return {
    fighters: fleet.fighters,
    infantry: fleet.infantry,
    capacity: fleet.fighters * rules.infantryCapacityPerFighter,
    orbit: holding?.orbit === "You" ? (holding.fighters ?? null) : null,
    surface: holding?.surface === "You" ? (holding.infantry ?? null) : null,
    otherFighters: others.reduce((sum, item) => sum + item.fighters, 0),
    otherInfantry: others.reduce((sum, item) => sum + item.infantry, 0),
  };
}
