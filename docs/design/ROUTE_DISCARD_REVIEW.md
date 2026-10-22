# Explicit route draft discard

Milestone6/10 defect correction on #76: UX_DESIGN.md requires an explicit Discard draft action distinct from Cancel order. The route planner previously offered only individual waypoint removal. Discard now clears the selected fleet's unsent waypoints and search, acknowledges that no order was sent, and restores focus to waypoint search. Pending/busy commands disable it; accepted/traveling routes do not expose it. Returning to fleets preserves the cleared draft.

This changes no travel, combat, capacity or timing rules. Those development choices retain their existing review status. Unsent drafts remain memory-only; durable submitted-command recovery is separate. No new service operation is appropriate for a local uncommitted decision.

The actual production component is already shared by the gallery and animation lab. The existing real four-player travel story gains separate keyboard discard and replanning steps, full canonical-state equality and uninvolved-player privacy assertions, followed by unchanged acknowledged departure/arrival and conservation checks. Exact candidates, strict comparison and independent visual/Linux/hosted acceptance are pending. Existing raster gates remain open; this slice does not resolve them.
