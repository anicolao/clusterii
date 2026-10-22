# Interrupted route recovery review

Successor to #61. A submitted route is durable command state; an unsent route remains a local draft. Recovery selects only the matching campaign and a fleet present in the current authorized private projection. It restores the original submitted waypoints once, preserves newer local choices (including an empty route), and never manufactures a retired fleet. Receipt discovery may precede the private view, so accepted route recovery retains its selection context until that view arrives. A new command clears the old recovery context.

| Dependency / acceptance | Status |
| --- | --- |
| Base | #61 `feat/live-fleet-travel-stories`, 6504a4a |
| Before-change reproduction | All four viewport journeys fail at pending reload: planner is absent; original command persists |
| Retained failure | `/tmp/cluster-route-recovery-before.log` and `/tmp/cluster-route-recovery-before/`, including traces and failed narratives |
| Recovery | Original campaign/fleet/waypoints; unchanged command identity and encrypted content; explicit same-order retry |
| Guard coverage | Authorized owner view, other-player projection, different campaign, null access, retired fleet, preserved newer/cleared draft |
| Unit checks | 54 travel/campaign tests pass, 1,175 assertions |
| Types / lint | Zero errors/warnings; lint passes |
| Local exact / candidate review | In progress; generation does not establish exact acceptance |
| Linux / independent / preview | Pending; exact current-head publication check remains required |

No game rule changes or approvals. Navigation range and speed retain their distinct existing semantics. Real authenticated commands, private grants, receipts and leased ticks remain authoritative; explicit demo clocks and withheld transport are harness controls. Existing procedural regressions remain unchanged. Managed encryption, hosted scheduling and full milestone acceptance remain separate gates. Identity-raster diagnosis remains unresolved; no inherited baselines or pixel tolerances change.

The first fix run retained two distinct test issues in `/tmp/cluster-route-recovery-first-fix/`: minimal scrolling left a phone fact 1/32 pixel below its panel boundary, and the retry assertion wrongly demanded a third transport frame. The story now centers inspected facts without loosening containment, and checks logical command identity/payload/effect instead of a frame count. Same-order receipt discovery need not rewrite an already dispatched RTDB record.
