import type { CampaignView } from "@shared/campaign";
import type { ArrivalReport } from "@shared/travel";
export interface ArrivalRecord {
  id: string;
  report: ArrivalReport;
  view: CampaignView;
}
// Immutable recipient views are the only source. Revisions that repeat an
// arrival are one event; a later record never invents earlier battle facts.
export function arrivalRecords(views: CampaignView[]): ArrivalRecord[] {
  const records = new Map<string, ArrivalRecord>();
  for (const view of [...views].sort((a, b) => b.revision - a.revision))
    for (const report of view.military?.arrivals ?? []) {
      const id = `${report.tick}:${report.starId}`;
      if (!records.has(id)) records.set(id, { id, report, view });
    }
  return [...records.values()].sort(
    (a, b) => b.report.tick - a.report.tick || a.id.localeCompare(b.id),
  );
}
