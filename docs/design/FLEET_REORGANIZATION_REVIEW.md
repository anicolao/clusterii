# Fleet reorganization

This slice extends stationed fleets with split and merge orders. These are development implementation choices for review, not owner approval of fleet rules. Tick timing, the fleet limit and ten-infantry-per-fighter capacity retain their existing development values.

Splitting transfers a chosen complement into a new actor-scoped fleet identity at the scheduled tick. Both the source and new fleet retain at least one fighter and valid cargo capacity. Admission reserves a fleet slot and locks the source against other operations. Merging transfers one fleet into another owned fleet at the same system, retaining the destination identity and removing the source at settlement. Both participants are locked against overlapping orders.

Reorganization changes only fleet inventories. Orbital ownership is required; surface ownership is irrelevant because no infantry embark or disembark. Execution revalidates ownership, location, capacity and participants. Failure moves no forces. Formation, cargo, disbanding and historical records keep their recorded behavior; optional reorganization fields describe only new orders. The normal state budget applies to splitting; merging shares disbanding's bounded storage-release allowance because it removes a persistent fleet.

Milestone 6 remains incomplete until travel, routing, arrival and neutral expansion work through the authoritative UI. Combat remains separate. Public rules, hosted Google/Scheduler, exact-head CI and independent security/rendered acceptance remain gates. No PR is merged.

## Evidence

Forty-nine unit tests pass with 1,063 assertions. Regressions cover both complement capacities, formation/split slot contention, participant locks, strict fields, changed ownership/location/forces, private projection and unchanged receiving identity. The full state-budget fixture admits storage-releasing merges through bounded headroom and returns below the ordinary budget after settlement. The existing 700KB envelope bound remains verified in both providers.

Both provider service cases pass with live Cloud KMS: 208 assertions in 60.44 seconds (`/tmp/cluster-reorganization-live.log`). Independent commanders race split admission and attempt unauthorized actions/private reads. Replayed ingress has one effect. A pending merge survives both-direction migration, comparing complete histories for all four recipients beyond the ten-record page boundary. A transaction reply is lost after committing the merge; retry observes the existing result without duplicating forces or identities.

The full default service cohort passes 25 tests and 1,455 assertions in 81.11 seconds, with 15 live-only skips. Ten browser/gallery/lab checks pass in 1.1 minutes (`/tmp/cluster-reorganization-final.log`). Four independently authenticated commanders create/join through player controls. Formation, split, reload, receiver selection and merge use actual commands; authoritative services receive an explicit test clock. This does not certify hosted Scheduler delivery. The browser confirms the receiver is unavailable for a conflicting disband, the receiving heading gains focus, its original identity remains, and local plus fleet forces reconcile.

The production instrument previews both resulting complements and preserves the fixed commitment rail at phone, desktop, short and 4K sizes. A merge updates inspection to the surviving fleet and focuses its heading. Missing additional participants disable another merge with an explicit explanation. The inherited command-ID reconciliation replaces scheduled acknowledgement with the matching split/merge result; its outcome mapping is exhaustive. Ready/merged captures and parent cargo renders are retained in `docs/ux/reviews/fleet-reorganization/`. The gallery and deterministic lab use the actual shared component, reducers, icon and existing provenance-recorded fleet artwork. Standard and reduced motion produce identical manifests and outcomes. No existing baseline was regenerated.

Type checks and lint pass. Compatible rollout updates all five canonical/view consumers before command admission and then additive ingress rules. Old orders without reorganization fields keep their recorded interpretation; older preview clients cannot describe the new operations and should use this compatible preview. Once these orders exist, rollback must preserve split/merge settlement and participant locks.

Compatible deployment and readback completed on 2026-10-21 UTC: five consumers/view writers, then processCampaign, then additive database rules. All six functions are ACTIVE on Node.js 22 without test flags; hosted rules admit both new kinds. All 12 prompt-hook checks pass. Independent rendered/security and hosted acceptance remain separate.

## CI fault-test correction

Run 39555761170 failed before browser execution: the inherited cargo lost-reply matcher timed out and its still-installed transaction spy contaminated the next test. The cargo correction is preserved from #23. Merge fault coverage now also explicitly awaits settlement, catches and asserts the exact injected error before restoring the spy. All committed-state, conserved inventory and retry assertions remain. The affected cargo/reorganization mock cohort passes locally; replacement full CI remains required. Production code, screenshots and hosted deployment are unchanged.
