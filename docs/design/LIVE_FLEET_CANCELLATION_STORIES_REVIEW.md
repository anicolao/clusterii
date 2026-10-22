# Live fleet cancellation story review

This successor to #58 migrates the ordinary cancellation journey through real authenticated controls. Four independent players create/join the campaign; owner and peer illustrations show a private formation reservation, review, Keep order, confirmed cancellation and recovery. The owner starts an unrelated three-fighter draft before cancellation and retains it while reviewing/keeping/cancelling the accepted order. Reload recovers confirmed facts, without claiming that an unsubmitted draft is persisted.

| Dependency / acceptance | Status |
| --- | --- |
| Base | #58 `feat/live-fleet-reorganization-stories`, e95192a |
| Real semantics | Command ingress, request-bound receipt, canonical revision, private grants and leased settlement |
| Cancellation | One accepted revision releases the original reservation without moving forces; original tick cannot execute it |
| Test clock | Guarded demo-only `orderFleet`/`cancelFleet` time; production cutoff validation unchanged |
| Rules | Existing development capacity/cutoff/tick rules remain under review; no new approval inferred |
| Local candidate / exact | Four journeys / 88 exact captures pass in 1.9 minutes after separate candidate review |
| Policy | 15 guards pass, including runtime/signature exclusions and preserved cancellation action inputs |
| Linux / independent / hosted | Pending; no managed-key or hosted cadence certification |
| Remaining | Interrupted cancellation and cutoff-race illustration remain separate; service/procedural assertions retained |

No production implementation or inherited visual baseline changes. [CI queue diagnosis](../testing/CI_QUEUE_2026_10_21.md) and [identity raster investigation](../testing/IDENTITY_RASTER_DIAGNOSIS.md) retain their limits. Current-head publication checks remain mandatory.

Generated walkthroughs: [phone](../testing/stories/live-fleet-cancellation/phone/darwin-arm64/README.md), [desktop](../testing/stories/live-fleet-cancellation/desktop/darwin-arm64/README.md), [large](../testing/stories/live-fleet-cancellation/large/darwin-arm64/README.md), [short](../testing/stories/live-fleet-cancellation/short/darwin-arm64/README.md).
