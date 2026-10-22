# Live fleet reorganization story review

Successor to #57, based on `feat/live-fleet-formation-stories` at 0bd3936. This slice exercises real formation, capacity validation, interrupted split recovery, split settlement, merge reservation/reload and merge settlement with owner/independent-player illustrations. Existing procedural tests remain unchanged.

The first four-viewport run reproduced a production recovery gap: the durable split command returned after reload, but its selected fleet and proposed complement were absent from the interface. The fix restores an accessible owned split/merge subject and original action from the validated outbox, opens the actual fleet instrument, and retains the original complement/recipient. It creates no replacement command or fabricated fleet. Receipt completion clears the recovery subject. Historical/missing fleets retain the global receipt remedy.

| Dependency / acceptance | Status |
| --- | --- |
| Base | #57 `feat/live-fleet-formation-stories`, 0bd3936 |
| Setup | Four UI-authenticated independent commanders, ordinary create/join; explicit developer entitlement |
| Rules | Existing capacity and tick rules remain development rules under review; no new rule approval inferred |
| Fault / clock | Only split transport frames withheld before ingress; original identity/envelope replayed; explicit domain time and real leased tick delivery |
| Conservation / privacy | Named assertions cover one accepted revision/order/receipt, no early movement, private recipient projections, complete complements and actual production-only increases |
| Local candidate / exact | Pending new-candidate review and strict comparison |
| Checks | Type check and lint pass; 43 campaign tests / 1051 assertions; 15 story policy guards; prompt-history suite |
| Linux / independent / hosted | Pending; local emulator evidence does not certify managed keys or hosted scheduling |
| Remaining UX-08 | Travel, cargo, cancellation and normal-motion live acceptance remain separate; procedural coverage preserved |

Failure artifacts: `/tmp/cluster-reorganization-recovery-before` and `/tmp/cluster-reorganization-generation.log`. New candidate review will be separate from exact comparison; inherited baselines and zero tolerance remain unchanged. The [CI queue observation](../testing/CI_QUEUE_2026_10_21.md) records read-only runner evidence. Current-head preview verification and the [identity raster diagnosis](../testing/IDENTITY_RASTER_DIAGNOSIS.md) remain open; a second identical-layout pair is not a fix.
