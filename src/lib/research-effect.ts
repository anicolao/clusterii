import type { Technology } from "@shared/production";
import { rules } from "@shared/rules";
export function nextResearchEffect(
  target: Technology,
  level: number,
  capabilities: { scanning: boolean; travel: boolean; construction: boolean },
): string {
  if (
    !Number.isInteger(level) ||
    level < 0 ||
    level > rules.maximumResearchLevel
  )
    throw new Error("Invalid research level");
  if (level === rules.maximumResearchLevel)
    return "Maximum level reached; no next-level effect.";
  const next = level + 1,
    exponent = ((100 + next) / 100).toFixed(2);
  switch (target) {
    case "scanning":
      return capabilities.scanning
        ? "Acquisition chance per tick: min(1, " +
            10 * next * next +
            " / distance in light years); at zero distance, certainty. Existing reports keep their recorded age."
        : "This campaign retains its recorded intelligence rules; no new observation capability is unlocked here.";
    case "navigation":
      return capabilities.travel
        ? "Route range: " +
            rules.navigationLyPerLevel * next +
            " light years per leg. Speed stays " +
            rules.fleetSpeedLyPerTick +
            " light years per tick."
        : "This campaign retains its recorded travel rules; fleet routes are not unlocked here.";
    case "terraforming":
      return (
        "Each system's affinity-adjusted development output is raised to power " +
        exponent +
        ", floored to 0.001." +
        (capabilities.construction
          ? " Capacity: " +
            (rules.developmentTypeBaseCapacity + next) +
            " of each development type per system."
          : " Construction retains this campaign's recorded rules.")
      );
    case "investing":
      return (
        "Total post-terraforming base market production is raised to power " +
        exponent +
        ", floored to 0.001 credits before distribution to systems. Construction dividends are separate."
      );
    case "recruiting":
      return (
        "Each surface's post-terraforming infantry output is raised to power " +
        exponent +
        ", floored to 0.001 before fractional infantry carry forward."
      );
    case "innovation":
      return (
        "Total post-terraforming science is raised to power " +
        exponent +
        ", floored to 0.001 science. New output applies from the following production tick."
      );
    case "formations":
      return capabilities.travel
        ? "Orbital combat coefficient: " +
            next +
            " in the squared-force calculation. Outcomes also depend on the opponent's coefficient and forces."
        : "This campaign retains its recorded travel rules; orbital combat is not unlocked here.";
    case "melee":
      return capabilities.travel
        ? "Surface combat damage: " +
            next +
            " per exchange at the constrained frontage. Defenders strike first."
        : "This campaign retains its recorded travel rules; surface combat is not unlocked here.";
  }
}
