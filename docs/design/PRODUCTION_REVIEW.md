# Scheduled production and empire ledger

New development campaigns store schema capability 2. Home assignment initializes a production clock whose first tick is fifteen minutes after the scheduled start. Schema-1 campaigns retain their recorded behavior, access and history. They do not accrue retroactive earnings, infer missing pause intervals or silently upgrade. Their Economy tray explains the difference and the existing campaign directory still creates new games. A future migration requires separate review.

This compatibility choice follows the reviewer's 20:36 checkpoint; it does not approve the review rules. Public campaigns remain closed. Production uses the versioned affinity, extraction, investing, recruiting and innovation formulas. Integer exponent comparisons compute exact milliunit floors without floating-point rounding; largest-remainder credit allocation uses stable system IDs. Fractional forces remain local. Orbit receives fighters/science, surface receives infantry, contested credits enter escrow and unified escrow pays once. Force limits record discarded units. Science advances the default Navigation track, preserves overflow and applies new levels from the following tick. Research selection, construction, market dividends, fleets and combat remain later slices.

One boundary choice remains explicitly proposed: when several systems compete for the final available units under an empire force cap, stable system-ID order assigns capacity. Fractional remainders stay at their systems; excess whole units are recorded as discarded. Review this allocation before public play.

Each campaign has a leased production worker. A tick transaction validates the current lease token, phase, maintenance barrier, epoch and due time, then commits the encrypted canonical revision, recipient views/history, directory summary and next boundary together. Transactions retry against concurrent changes. A worker stops after 96 ticks, allowing the next delivery to continue catch-up. The minute sweep isolates failed campaigns and pages by stable document ID. Its timeout is 540 seconds; leases and committed tick boundaries recover interrupted sweeps. Large-campaign throughput still requires measured operating limits. Pausing stops settlement and resuming shifts the remaining interval; migration uses that same barrier. No client clock credits a wallet.

The galaxy's Economy control opens a bounded instrument with available credits, confirmed tick, last production, science progress and the next scheduled event. When overdue, it says Awaiting next tick until authoritative data arrives. Phone controls share a compact row, keeping system details scrollable and the commitment visible. The gallery/lab render the production component with reducer-derived records, old-campaign explanation and deterministic pending/confirmed frames. No new bitmap assets are introduced; existing galaxy/star illustrations retain their provenance.

## Evidence and remaining gates

- Type checks pass. Twenty unit tests pass with 321 assertions, including exact exponents, fractional conservation, split control/escrow, science timing caps, frozen pause intervals and legacy starts.
- Both-provider production/concurrency/lost-acknowledgement and expired-lease tests pass: three tests, 147 assertions, with live Cloud KMS. Recovery covers before-commit rollback, old worker fencing, a 96-tick batch plus the remaining tick, 98 total settled ticks and exact retained revision count. A separate real-Firestore cleanup race passes two assertions: replacing a lease after the old worker reads it defeats the old worker’s conditional delete; the replacement can release its own lease.
- Thirteen affected campaign/history/gallery/lab browser tests pass in one minute, including phone, desktop, short and 4K geometry.
- Four independent UI players filled a roster through ordinary controls, reached the real UTC start and first production boundaries, and received the acknowledged ledger. The journey passed in 18.2 minutes using emulator Scheduler HTTP delivery. All four received 202.800 credits and 1.400 science; duplicate delivery and reload retained the same effects. [Retained captures](../ux/reviews/production/) cover phone, desktop, short and 4K. The reviewer sampled phone/short composition at 21:07; this is not full independent acceptance.
- Exact-head CI and full independent rendered/security review remain pending. Existing hosted Google and account/key lifecycle gates remain open. Backend rollout status is recorded below.

This implements the production phase of the tick pipeline, not absent construction/travel/combat/diplomacy/victory phases. It does not claim completion of milestones 2–5 or public release. Current forces are stationed units; fleet conservation and aggregate force limits must include fleets when that interaction ships.

Publication at cd5a758 failed its three-minute served-revision wait while Pages deployment was still queued. The Pages deployment succeeded at 00:51:36 UTC, after verification had timed out at 00:50:51; direct verification then matched the exact source. The verifier now allows ten minutes for asynchronous deployment and reports the last observed public revision/status. It retains exact source/build identity and asset checks.

## Compatible backend rollout

Deploy consumers before enabling the schema-2 producer:

1. Deploy `processCampaignMaintenance`, `processCampaignMigration`, `runCampaignMigration` and `startScheduledCampaigns` with schema-2 clock preservation. Existing schema-1 games continue unchanged.
2. Deploy `runProduction` and verify the authenticated minute schedule, retry configuration and service timeout. Schema-1 heads have no production boundary and are skipped.
3. Deploy `processCampaign` last; newly created campaigns can now store schema 2. Verify the deployed configuration without exposing envelopes or keys. Existing key delivery and rules need no expansion.

After schema-2 campaigns exist, a backend rollback must retain schema-2 pause/migration/clock support. Prefer a compatible forward fix; pause affected development campaigns through their authoritative maintenance interaction when necessary. Disabling a scheduler alone delays settlement and later catch-up; it does not freeze campaign time. This is a rollout procedure, not a claim that hosted recovery or Google authentication has been certified.

Live-KMS validation first exposed a cleanup transaction lock timeout after a committed tick. Cleanup now reads the token and uses an exact update-time precondition for deletion. A replacement lease defeats that delete without weakening the transactional tick fence. The diagnostic failed run is retained in `/tmp/cluster-production-live-recovery.log`; the corrected both-provider run is `/tmp/cluster-production-live-fenced.log`, and the cleanup race is `/tmp/cluster-production-cleanup.log`.

The ordered hosted rollout completed on 2026-10-21 UTC: clock-aware consumers, then `runProduction`, then `processCampaign`. Both new/updated functions report ACTIVE on Node 22, without the emulator KMS flag. The enabled minute Scheduler job uses OIDC, three retries and 10–60 second backoff; the service timeout is 540 seconds. Anonymous scheduler invocation returns 403. These configuration checks do not certify a hosted multiplayer or recovery journey.
