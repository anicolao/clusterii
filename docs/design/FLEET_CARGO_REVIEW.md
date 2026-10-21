# Stationed fleet cargo

This slice stacks on stationed fleet preparation. It adds infantry loading and unloading through the existing fleet instrument, private encrypted commands and authoritative tick settlement. Milestone 6 remains incomplete: split/merge, routes, travel, arrival and combat are separate slices. The ten-infantry-per-fighter capacity and tick ordering remain development rules under review.

## Orders and conservation

Select a stationed fleet, choose Load or Unload, enter a whole positive infantry count and commit. Loading reserves available surface infantry; it does not move units at admission. Formation and cargo loading share the same reservation accounting. Unloading leaves infantry aboard until settlement. Each fleet accepts one outstanding operation, preventing overlapping cargo/disband commitments.

Both layers must belong to the commander at admission and execution. Loading rechecks local infantry and actual transport capacity; unloading rechecks embarked infantry. A missing/moved fleet or lost ownership rejects execution without transferring units. Successful settlement transfers the exact quantity between surface and fleet, records one private outcome and removes the order. Production then runs normally; no unit is present in both inventories. Repeat delivery retains the original receipt and repeat settlement applies no second effect.

The UI retains the manifest and amount while an acknowledgement is pending or interrupted. Accepted orders survive reload. The command rail stays outside the bounded manifest; the real fleet component supplies gallery, animation lab and campaign interactions. The existing [fleet artwork and hand-authored icon](../art/PRODUCTION_ASSETS.md#fleet-preparation) retain their provenance. No new asset or alternate mock interaction was introduced.

## Compatibility and privacy

Existing formation and disband records keep their original representation and interpretation. Cargo orders add an explicit `cargo` discriminator and transfer quantity; absence of that field retains the recorded behavior. Earlier production campaigns with no military state still have no fleets. There is no retroactive transfer, production or history reconstruction.

The member projection explicitly exposes only that commander's manifests, reservations and outcomes. Other commanders can acquire only the existing entitled aggregate observations, not cargo plans or fleet identities. Strict command keys reject caller-supplied owners, internal cargo fields and force snapshots. Mock and real providers use the same authorization, reducers, settlement and receipt binding.

Deploy every canonical/view writer before command admission, then additive database ingress rules, then the compatible preview client. Once cargo orders exist, rollback must preserve their discriminator and settlement semantics. Earlier preview clients do not understand cargo labels; use the compatible cargo preview to inspect these orders. The existing disband-only storage recovery allowance remains restricted to disbanding; loading/unloading do not bypass the normal state budget.

## Evidence and limits

Forty-five unit tests pass with 994 assertions. Cargo regressions cover shared reservations, ownership loss, insufficient capacity, missing fleets, private projection, strict fields, scheduling boundaries and conservation.

Both provider service cases pass with live Cloud KMS: 184 assertions in 57.67 seconds (`/tmp/cluster-cargo-live.log`). Separate authenticated commanders race commands, attempt unauthorized transfers and private reads, replay accepted ingress and recover a lost settlement response. Pending unload survives migration in both directions. Complete authorized histories for all four recipients are compared beyond the ten-record page boundary. Repeated tick delivery preserves the resulting manifest and balances.

The ordinary four-commander browser journey creates and joins through player controls, uses the real start/settlement service with an explicit test clock, forms a fleet, unloads, reloads the campaign, loads again and disbands. It verifies over-capacity rejection, accepted orders, actual outcomes and final conserved forces. Phone, desktop, short and 4K captures retain the command rail and bounded manifest. The lab uses real reducer outcomes and compares standard/reduced-motion results through pending, reconnect, accepted and loaded states.

Controlled service-clock evidence does not certify hosted Scheduler timing or Google sign-in. Exact-head CI, hosted account acceptance and independent security/rendered acceptance remain gates. No review PR is merged.

The full default service cohort passes 24 tests and 1,392 assertions in 74.36 seconds, with 14 live-only skips (`/tmp/cluster-cargo-final.log`). That combined run caught a summary-text spacing regression; the affected rendering was corrected rather than weakening its assertion. The subsequent eight browser/gallery/lab tests pass in 43.6 seconds (`/tmp/cluster-cargo-browser-verified.log`). Rendered review moved completed cargo outcomes above the manifest and distinguishes a retained amount invalid for the next load from the completed transfer. Existing baselines were not regenerated. Type checks, lint and all 12 prompt-hook checks pass.

The final accessible-label cohort passes all three fleet/browser/lab journeys in 28.2 seconds (`/tmp/cluster-cargo-accessibility-final.log`). Cargo inputs expose the visible operation name and available-force description. Ready and completed-transfer captures, retained before images and checksums are in `docs/ux/reviews/fleet-cargo/`.

Compatible deployment completed on 2026-10-21 UTC: all five consumers/view writers, then processCampaign, then additive database rules. Readback confirms all six functions ACTIVE on Node.js 22 without CLUSTER_KMS_TEST and both cargo kinds in hosted ingress rules. Hosted end-to-end acceptance remains separate.

## Receipt-to-outcome reconciliation

The 01:57 reviewer found that the completed-phone capture still showed a future scheduled-transfer acknowledgement. The client now retains the accepted command identity and reconciles only its matching private outcome in the same campaign at or beyond the acknowledged revision. A different order's outcome leaves acceptance unchanged. Pending retries remain pending. Failed execution reports no transfer; a late receipt whose outcome has aged out points to authorized history rather than claiming future work. Starting another command or changing accounts clears the previous acknowledgement identity. Leaving a campaign clears its completed fleet feedback.

The focused regression checks scheduled acknowledgement before the tick and completed acknowledgement after it, separately from the manifest's execution status. All 46 unit tests/1,000 assertions and all three fleet/browser/lab tests pass in 28.2 seconds. Type checks and lint pass. Four affected captures are refreshed, with the stale acknowledgement images preserved as `before-acknowledgement-*`. This is a client correction; deployed settlement semantics are unchanged. Exact-head CI and independent acceptance remain pending.
