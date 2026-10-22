# Interrupted route recovery review

Successor to #61. A submitted route is durable command state; an unsent route remains a local draft. Recovery selects only the matching campaign and a fleet present in the current authorized private projection. It restores the original submitted waypoints once, preserves newer local choices (including an empty route), and never manufactures a retired fleet. Receipt discovery may precede the private view, so route recovery retains its selection context until that view arrives, including a rejected command whose original choices need review. A new command clears the old recovery context.

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

The first offline-harness attempt also prevented server transport delivery; it did not exercise post-acceptance recovery. Its failure is retained in `/tmp/cluster-route-recovery-generation.log` and `/tmp/cluster-route-recovery-offline-harness/`. The corrected harness delivers the unchanged original browser-authored command with its actual emulator credential through RTDB rules and ingress while the browser is offline. It reads the durable IndexedDB record to prove that the accepted receipt has not yet been consumed. No admin command, canonical state, grant or receipt is injected.

The corrected interruption journey passes all four viewport generations / 152 captures in 4.1 minutes (`/tmp/cluster-route-recovery-generation2.log`). A final separate step now captures the focused retry remedy before activation, and explicitly verifies receipt request binding and cleared durable storage. Final candidate generation and exact comparison remain required.
