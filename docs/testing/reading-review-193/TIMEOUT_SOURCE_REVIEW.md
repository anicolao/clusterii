# Retained timeout source narrowing

No new telemetry, emulator run or performance patch. Sources are existing pinned disassembly and current unchanged service/client code; original132/137 timing remains the runtime evidence.

## Concrete query path

- functions/src/production.ts calls publish for each settled tick; functions/src/campaigns.ts writes developmentCampaigns/{id} on each publication.
- shared/campaign.ts campaignDirectory includes revision and production.tick/nextTickAt, so the directory value genuinely changes each tick. Removing this write blindly would remove displayed facts, not merely suppress a redundant event.
- src/lib/campaign-session.ts observeDirectory subscribes to the whole developmentCampaigns collection, with no query limit. campaigns/+page.svelte retains this observer for the authenticated route; returning from Galaxy to Campaigns does not stop it. The feature010 preparation deliberately leaves the two actual players in Campaigns while100ticks settle. Thus current-player directory listeners remain even when setup witness contexts close; a stale-listener leak is not required for this query work to exist.
- Pinned ListenStreamManager.notifyQueryListeners calls getImpactedQueryStreamTargets, then snapshotQuery synchronously while the manager is synchronized. The affected query index is keyed by changed collection/collection-group. A write to developmentCampaigns therefore reaches its directory query. snapshotQuery constructs the full current query result before returning to notification. This sits after the measured storage marker, consistent with the observed remainder boundary.
- Document listeners, by contrast, are retrieved using documentTargets.getByKeys(changedRefs). The inspected path does not blindly resnapshot every unrelated document listener. Collection-query work is the more specific source-supported workload hypothesis.

## What this does and does not establish

Within a full viewport cohort, earlier stories retain campaign documents in the same emulator. The directory collection can therefore be larger than in the isolated one-story success. Source demonstrates repeated broad query work and a pathway whose workload may grow; retained records do not contain collection cardinality, active query count or per-query duration at the failing transaction. No causal attribution of525–587ms is justified yet. Security-rule evaluation, lock contention, client scheduling and other post-marker work remain inside the measured interval.

A falsifiable distinction is now explicit: an expensive directory-query path should produce listener-query/security-rules samples during slow full-cohort commits, with a larger retained directory than the isolated case; unrelated document listeners alone do not satisfy this path. Existing full137 export was unavailable/parse. Successful isolated profile cannot settle full-cohort attribution. Current integrated strict-story run retains the already checked-in observer; inspect its actual output when complete, without adding instrumentation or rerunning.

Do not fix this by hiding Campaigns, unsubscribing real players during settlement, deleting prior campaign data, changing the tick budget, or suppressing directory revisions. Those would change the measured scenario or production visibility before cause is established. No such change is made here.
