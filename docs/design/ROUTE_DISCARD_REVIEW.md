# Explicit route draft discard

Milestone6/10 defect correction on #76: UX_DESIGN.md requires an explicit Discard draft action distinct from Cancel order. The route planner previously offered only individual waypoint removal. Discard now clears the selected fleet's unsent waypoints and search, acknowledges that no order was sent, and restores focus to waypoint search. Pending/busy commands disable it; accepted/traveling routes do not expose it. Returning to fleets preserves the cleared draft.

This changes no travel, combat, capacity or timing rules. Those development choices retain their existing review status. Unsent drafts remain memory-only; durable submitted-command recovery is separate. No new service operation is appropriate for a local uncommitted decision.

The actual production component is already shared by the gallery and animation lab. The existing real four-player travel story gains separate keyboard discard and replanning steps, full canonical-state equality and uninvolved-player privacy assertions, followed by unchanged acknowledged departure/arrival and conservation checks. Exact candidates, strict comparison and independent visual/Linux/hosted acceptance are pending. Existing raster gates remain open; this slice does not resolve them.

## Verification and remaining gates

Clean12abe71 strict comparison passes phone/desktop/short (132 exact captures);4K reaches its final observer image then fails38 reported/49 raw differing pixels at x1074–1083/y705–712. All preceding43 4K frames and named discard/authoritative/privacy assertions pass. Source never changes during capture. Evidence: `/tmp/cluster-discard-exact.log` and `/tmp/cluster-discard-exact-results`, including retained trace/actual/diff. Only the three fully passed stories are archived. No raster baseline replacement or retry-until-green. The PR remains draft. Original #70 raster and this recurrence remain unresolved.

Types pass with zero errors/warnings; lint and story-policy checks pass;11 travel units/124 assertions pass. Separate candidate generation passes176 frames. The shared gallery/lab inherits the actual control; separate pending/busy component interaction acceptance remains open.

Plan reconciliation: milestone6/10 explicit unsent-route discard is delivered here. Unsent reload recovery remains distinct from durable submitted commands. Full hostile split-control/escrow illustrated acceptance remains open in milestone7. Alliances/report exchange and victory/repeated-game completion remain material milestone8/9 gaps; their proposed admission, shared-threshold and cross-game rules have not become owner-approved. Contextual in-campaign help is an actionable milestone10/UX-15 gap under the approved UX contract and can proceed independently.

The single existing Linux candidate run39743227540 still has an active actual generation step. Its verification job119705315496 failed with missing Linux baselines and pixel failures (`/tmp/cluster70-0529-verify.log`), including the short1994-pixel identity recurrence. Failed verification output is not eligible for promotion. No duplicate generation requested. Reviewer checkpoint05:39 is carried in meta-prompts.md.
