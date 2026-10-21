import type { CampaignView } from "@shared/campaign";
import type { TradeAction } from "@shared/trades";
export interface CreditDraft {
  seat: string;
  give: string;
  request: string;
}
export function creditMilli(value: string): number | null {
  if (!/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const milli = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
  return milli <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(milli) : null;
}
export function tradeRecords(records: CampaignView[]) {
  return [
    ...new Map(
      [...records]
        .sort((a, b) => a.revision - b.revision)
        .flatMap((record) =>
          (record.trades?.ledger ?? []).map(
            (outcome) => [outcome.id, outcome] as const,
          ),
        ),
    ).values(),
  ];
}

export interface RecoveredTrade {
  id: string;
  gameId: string;
  action: TradeAction;
}
