# Live fleet cargo story review

This successor to #59 illustrates actual formation, unloading and loading through authenticated production controls. Owner and independent-player views accompany named acknowledgements, private grants, accepted-order recovery and real leased settlement. Each transfer is checked against its receipt, revision and ledger; combined forces change only by recorded production. Repeated tick delivery must leave the entire canonical state unchanged.

| Dependency / acceptance | Status |
| --- | --- |
| Base | #59 `feat/live-fleet-cancellation-stories`, 943fdce |
| Slice | Unload five infantry and load three after forming two fighters with twenty infantry |
| Recovery | Accepted private orders and final settled forces survive reload without another effect |
| Harness | Existing guarded demo-only fleet/admission clocks and real scheduler/tick delivery; no injected game state |
| Rules | Development transport capacity and tick rules remain under review; no new approval inferred |
| Local candidate / exact | Four journeys / 128 exact captures pass in 2.5 minutes after separate candidate review |
| Linux / independent / hosted | Pending; current-head preview verification remains required |
| Remaining | Interrupted cargo, cutoff races, travel/arrival, managed keys and normal-motion live parity remain separate |

Existing procedural fleet, cargo, route, privacy and recovery assertions remain unchanged. This slice changes no production behavior or inherited baseline. The documented CI backlog does not justify broad duplicate reruns. Identity raster diagnosis remains open; identical post-capture geometry and passing unrelated runs do not establish a fix.

Generated walkthroughs: [phone](../testing/stories/live-fleet-cargo/phone/darwin-arm64/README.md), [desktop](../testing/stories/live-fleet-cargo/desktop/darwin-arm64/README.md), [large](../testing/stories/live-fleet-cargo/large/darwin-arm64/README.md), [short](../testing/stories/live-fleet-cargo/short/darwin-arm64/README.md).
