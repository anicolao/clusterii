import type { ResearchState, Technology } from "./production.js";
import { rules } from "./rules.js";

// The stored development rules use integer milli-science throughout settlement.
export function researchCostMilli(level: number): number | null {
  if (
    !Number.isInteger(level) ||
    level < 0 ||
    level > rules.maximumResearchLevel
  )
    throw new Error("Invalid research level");
  return level === rules.maximumResearchLevel
    ? null
    : rules.researchBaseCost * rules.researchCostGrowth ** level * 1000;
}
export function researchEstimate(
  research: ResearchState,
  target: Technology,
  scienceMilli: number | null,
  blocked: "paused" | "pending" | null = null,
) {
  const costMilli = researchCostMilli(research.levels[target]);
  const progress = research.progressMilli[target];
  if (
    !Number.isSafeInteger(progress) ||
    progress < 0 ||
    (scienceMilli !== null &&
      (!Number.isSafeInteger(scienceMilli) || scienceMilli < 0))
  )
    throw new Error("Invalid research estimate input");
  const remainingMilli =
    costMilli === null ? null : Math.max(0, costMilli - progress);
  const reason:
    | "capped"
    | "paused"
    | "pending"
    | "bank-transfer"
    | "unknown-rate"
    | "zero-rate"
    | null =
    costMilli === null
      ? "capped"
      : (blocked ??
        ((research.orders?.length ?? 0) > 0
          ? "pending"
          : target !== research.target &&
              research.levels[research.target] === rules.maximumResearchLevel &&
              research.progressMilli[research.target] > 0
            ? "bank-transfer"
            : scienceMilli === null
              ? "unknown-rate"
              : scienceMilli === 0 &&
                  remainingMilli !== null &&
                  remainingMilli > 0
                ? "zero-rate"
                : null));
  // A level advances during settlement, even when retained science already pays it.
  let fundedTicks: number | null = null;
  if (!reason && remainingMilli !== null && scienceMilli !== null) {
    if (remainingMilli === 0) fundedTicks = 1;
    else if (scienceMilli > 0)
      fundedTicks = Number(
        (BigInt(remainingMilli) + BigInt(scienceMilli) - 1n) /
          BigInt(scienceMilli),
      );
  }
  return { costMilli, remainingMilli, fundedTicks, reason };
}
