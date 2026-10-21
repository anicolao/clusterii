import type { Campaign } from "./campaign.js";
import { settleConstruction } from "./construction.js";
import { settleFleets } from "./fleets.js";
import { initialFocus, type MarketFocus, settleFocus } from "./market-focus.js";
import { faction, rules } from "./rules.js";
import { type ArrivalRank, settleTravel } from "./travel.js";
export type Technology = keyof typeof rules.startingResearch;
export interface ResearchOrder {
  id: string;
  sequence: number;
  effectiveTick: number;
  target: Technology;
}
export interface ResearchState {
  orders?: ResearchOrder[];
  lastApplied?: ResearchOrder;
  appliedOrders?: ResearchOrder[];
  target: Technology;
  levels: Record<Technology, number>;
  progressMilli: Record<Technology, number>;
}
export interface ProductionLedger {
  creditsMilli: number;
  marketDividendsMilli?: number;
  marketEscrowMilli?: number;
  releasedEscrowMilli: number;
  escrowMilli: number;
  scienceMilli: number;
  fighters: number;
  infantry: number;
  discardedFighters: number;
  discardedInfantry: number;
}
export interface Economy {
  marketFocus?: Record<string, MarketFocus>;
  tick: number;
  nextTickAt: number;
  research: Record<string, ResearchState>;
  remainders: Record<string, { fightersMilli: number; infantryMilli: number }>;
  ledger: Record<string, ProductionLedger>;
}
export const technologies = Object.keys(rules.startingResearch) as Technology[];
export function initialEconomy(
  campaign: Campaign,
  firstTickAt: number,
): Economy {
  return {
    tick: 0,
    nextTickAt: firstTickAt,
    research: Object.fromEntries(
      campaign.seats.map((seat) => [
        seat.uid,
        {
          target: "navigation",
          levels: { ...rules.startingResearch },
          progressMilli: Object.fromEntries(
            technologies.map((key) => [key, 0]),
          ) as Record<Technology, number>,
        },
      ]),
    ),
    marketFocus: Object.fromEntries(
      campaign.seats.map((seat) => [seat.uid, initialFocus()]),
    ),
    remainders: {},
    ledger: {},
  };
}
function checked(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Production balance overflow");
  return Number(value);
}
// Exact floor to milliunits of (milli / 1000)^(1 + level/100).
// Integer comparisons avoid floating-point/decimal rounding near a boundary.
export function powerMilli(milli: number, level: number): number {
  if (
    !Number.isSafeInteger(milli) ||
    milli < 0 ||
    !Number.isInteger(level) ||
    level < 0 ||
    level > rules.maximumResearchLevel
  )
    throw new Error("Invalid production input");
  if (!milli || !level) return milli;
  const numerator = BigInt(milli) ** BigInt(100 + level),
    denominator = 1000n ** BigInt(level);
  let low = 0n,
    high = 1n;
  while (high ** 100n * denominator <= numerator) high *= 2n;
  while (high - low > 1n) {
    const mid = (low + high) / 2n;
    if (mid ** 100n * denominator <= numerator) low = mid;
    else high = mid;
  }
  return checked(low);
}
export function apportionMilli(
  total: number,
  weights: { id: string; milli: number }[],
) {
  const sum = weights.reduce((sum, item) => sum + BigInt(item.milli), 0n);
  if (!sum) return new Map(weights.map((item) => [item.id, 0]));
  const shares = weights.map((item) => ({
    id: item.id,
    amount: (BigInt(total) * BigInt(item.milli)) / sum,
    remainder: (BigInt(total) * BigInt(item.milli)) % sum,
  }));
  let remaining =
    BigInt(total) - shares.reduce((sum, item) => sum + item.amount, 0n);
  shares.sort((a, b) =>
    a.remainder === b.remainder
      ? a.id < b.id
        ? -1
        : a.id > b.id
          ? 1
          : 0
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const share of shares)
    if (remaining > 0n) {
      share.amount++;
      remaining--;
    }
  return new Map(shares.map((item) => [item.id, checked(item.amount)]));
}
export function produce(
  campaign: Campaign,
  economy: Economy,
  arrivalRank?: ArrivalRank,
) {
  const next = structuredClone(campaign),
    clock = structuredClone(economy);
  clock.tick++;
  clock.nextTickAt += rules.tickSeconds * 1000;
  clock.ledger = {};
  next.economy = clock;
  settleFocus(next);
  settleFleets(next, clock.tick);
  const completions = settleConstruction(next, clock.tick);
  settleTravel(next, clock.tick, arrivalRank);
  for (const research of Object.values(clock.research)) {
    const due = (research.orders ?? [])
      .filter((order) => order.effectiveTick <= clock.tick)
      .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
    if (due.length) research.appliedOrders = due;
    for (const order of due) {
      if (order.target !== research.target) {
        if (research.levels[research.target] === rules.maximumResearchLevel) {
          research.progressMilli[order.target] = checked(
            BigInt(research.progressMilli[order.target]) +
              BigInt(research.progressMilli[research.target]),
          );
          research.progressMilli[research.target] = 0;
        }
        research.target = order.target;
      }
      research.lastApplied = order;
    }
    research.orders = (research.orders ?? []).filter(
      (order) => order.effectiveTick > clock.tick,
    );
  }
  const stars = new Map(campaign.galaxy.stars.map((star) => [star.id, star]));
  for (const seat of campaign.seats) {
    const research = economy.research[seat.uid];
    if (!research) throw new Error("Missing research state");
    const levels = research.levels;
    const ledger: ProductionLedger = {
      creditsMilli: 0,
      releasedEscrowMilli: 0,
      escrowMilli: 0,
      scienceMilli: 0,
      fighters: 0,
      infantry: 0,
      discardedFighters: 0,
      discardedInfantry: 0,
    };
    clock.ledger[seat.uid] = ledger;
    const totals = Object.values(next.military?.fleets ?? {})
      .filter((f) => f.uid === seat.uid)
      .reduce(
        (sum, f) => ({
          fighters: sum.fighters + f.fighters,
          infantry: sum.infantry + f.infantry,
        }),
        { fighters: 0, infantry: 0 },
      );
    for (const system of Object.values(next.systems)) {
      if (system.orbit === seat.uid) totals.fighters += system.fighters;
      if (system.surface === seat.uid) totals.infantry += system.infantry;
    }
    const income: { id: string; milli: number }[] = [];
    let science = 0n;
    for (const [id, system] of Object.entries(next.systems).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      if (system.orbit !== seat.uid && system.surface !== seat.uid) continue;
      if (
        system.orbit === seat.uid &&
        system.surface === seat.uid &&
        system.escrowMilli > 0
      ) {
        ledger.releasedEscrowMilli = checked(
          BigInt(ledger.releasedEscrowMilli) + BigInt(system.escrowMilli),
        );
        ledger.creditsMilli = checked(
          BigInt(ledger.creditsMilli) + BigInt(system.escrowMilli),
        );
        system.escrowMilli = 0;
      }
      const star = stars.get(id);
      if (!star) throw new Error("Unknown production system");
      const affinity = Math.round(
        faction(seat.faction).affinity[star.class] * 1000,
      );
      const raw = (count: number) =>
        powerMilli(
          checked(BigInt(count) * BigInt(affinity)),
          levels.terraforming,
        );
      const remainder = clock.remainders[id] ?? {
        fightersMilli: 0,
        infantryMilli: 0,
      };
      clock.remainders[id] = remainder;
      if (system.orbit === seat.uid) {
        const output = raw(system.camps) + remainder.fightersMilli,
          units = Math.floor(output / 1000);
        const granted = Math.min(
          units,
          Math.max(0, rules.maximumUnitsPerPlayerPerType - totals.fighters),
        );
        system.fighters += granted;
        totals.fighters += granted;
        ledger.fighters += granted;
        ledger.discardedFighters += units - granted;
        remainder.fightersMilli = output % 1000;
        science += BigInt(raw(system.stations));
      }
      if (system.surface === seat.uid) {
        const output =
            powerMilli(raw(system.bases), levels.recruiting) +
            remainder.infantryMilli,
          units = Math.floor(output / 1000);
        const granted = Math.min(
          units,
          Math.max(0, rules.maximumUnitsPerPlayerPerType - totals.infantry),
        );
        system.infantry += granted;
        totals.infantry += granted;
        ledger.infantry += granted;
        ledger.discardedInfantry += units - granted;
        remainder.infantryMilli = output % 1000;
        income.push({ id, milli: raw(system.markets) });
      }
    }
    const totalCredits = powerMilli(
      checked(income.reduce((sum, item) => sum + BigInt(item.milli), 0n)),
      levels.investing,
    );
    for (const [id, amount] of apportionMilli(totalCredits, income)) {
      if (next.systems[id].orbit === seat.uid)
        ledger.creditsMilli = checked(
          BigInt(ledger.creditsMilli) + BigInt(amount),
        );
      else {
        next.systems[id].escrowMilli = checked(
          BigInt(next.systems[id].escrowMilli) + BigInt(amount),
        );
        ledger.escrowMilli = checked(
          BigInt(ledger.escrowMilli) + BigInt(amount),
        );
      }
    }
    next.empires[seat.uid].creditsMilli = checked(
      BigInt(next.empires[seat.uid].creditsMilli) + BigInt(ledger.creditsMilli),
    );
    ledger.scienceMilli = powerMilli(checked(science), levels.innovation);
    const target = clock.research[seat.uid];
    target.progressMilli[target.target] = checked(
      BigInt(target.progressMilli[target.target]) + BigInt(ledger.scienceMilli),
    );
    while (target.levels[target.target] < rules.maximumResearchLevel) {
      const cost =
        rules.researchBaseCost *
        rules.researchCostGrowth ** target.levels[target.target] *
        1000;
      if (target.progressMilli[target.target] < cost) break;
      target.progressMilli[target.target] -= cost;
      target.levels[target.target]++;
    }
  }
  // Completion dividends use beginning-of-tick markets and focus; new markets
  // produce normally now, but only join the dividend weights next tick.
  for (const completion of completions) {
    const weights = Object.entries(campaign.systems)
      .filter(
        ([id, system]) =>
          system.surface &&
          system.surface !== completion.uid &&
          system.surface === next.systems[id].surface &&
          system.markets > 0,
      )
      .map(([id, system]) => ({
        id,
        milli:
          system.markets *
          (campaign.economy?.marketFocus?.[system.surface ?? ""]?.allocation ??
            rules.defaultFocus)[completion.type],
      }));
    const pool = Math.floor(completion.paidMilli / 10);
    for (const [id, amount] of apportionMilli(pool, weights)) {
      const system = next.systems[id],
        uid = system.surface;
      if (!uid) throw new Error("Missing dividend recipient");
      const ledger = clock.ledger[uid];
      if (system.orbit === uid) {
        next.empires[uid].creditsMilli = checked(
          BigInt(next.empires[uid].creditsMilli) + BigInt(amount),
        );
        ledger.creditsMilli = checked(
          BigInt(ledger.creditsMilli) + BigInt(amount),
        );
        ledger.marketDividendsMilli = checked(
          BigInt(ledger.marketDividendsMilli ?? 0) + BigInt(amount),
        );
      } else {
        system.escrowMilli = checked(
          BigInt(system.escrowMilli) + BigInt(amount),
        );
        ledger.escrowMilli = checked(
          BigInt(ledger.escrowMilli) + BigInt(amount),
        );
        ledger.marketEscrowMilli = checked(
          BigInt(ledger.marketEscrowMilli ?? 0) + BigInt(amount),
        );
      }
    }
  }
  next.revision++;
  return { campaign: next, economy: clock };
}
