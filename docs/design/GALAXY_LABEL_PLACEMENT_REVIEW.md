# Galaxy label placement review

The recovered phone observation scene draws Tupã over Tania Australis. Their star positions are distinct, but independently projected HTML names overlap. The retained predecessor capture is `live-stellar-observations/phone/darwin-arm64/018-recover-retained-report-1-survey-envoy.png` at PR #66.

The production chart places measured labels in screen space, in this order: selected system, home, other owned systems, then secondary catalogue landmarks. Equal priorities use stable system IDs. It tries the original position and nearby rows with a six-pixel gap, keeps labels inside the chart, and omits a lower-priority name only when no nearby row fits. Offscreen anchors stay offscreen. The star geometry, selection ring, class filter, authorized catalogue and ownership inputs do not change. Center home and the complete keyboard systems list remain available.

The chart observes actual text dimensions, font readiness, viewport size and projected camera transforms. It batches reads and updates in one animation frame and disconnects observers when the chart is destroyed. This is shared production cartography, not a screenshot mask or test-only label replacement.

| Dependency / acceptance | Evidence / status |
| --- | --- |
| Base | PR #66 `feat/live-observation-stories`, 0666727; no merge |
| Collision and edge algorithm | Three tests / 82 assertions: retained pair, crowded priorities, order determinism, containment, offscreen anchors and resize |
| Real observation journey | Four exact journeys / 72 captures; original private reports, leased tick repeat-safety and reload assertions retained |
| Rendered resize, keyboard and motion | Every captured view checks collision/containment; resize and motion preference parity, keyboard home and restored focus pass in all four viewports |
| Visual review | All four sizes reviewed separately, then exact comparison passed; reviewer 01:41 independently accepts the sampled phone pair only |
| Baseline scope | Intentional galaxy composition change; no inherited image replaced without separate review. Other affected galaxy families remain comparison gates |
| Linux / independent review / preview | Pending; no hosted or release acceptance |

Rules remain under review. No service, cryptography, tick, command or gameplay rule changes are introduced by label placement.

Diagnostic evidence: `/tmp/cluster-label-generation.log` passes phone/desktop/large (19.5/23.1/46.0s), then short fails before testing with Firestore HTTP server `Address already in use`; retained under `/tmp/cluster-label-first-candidates`. Generation2 reaches the new keyboard home action, whose incorrect extra Close list action times out: production `move()` already closes the list and restores focus. The correction asserts both dismissal and restored Systems list focus. The owned remaining cohorts were interrupted; no deadline or service assertion was relaxed.

The shared Scene also renders fleet contacts (including an empty contact view) and routes. Each host now declares its own `data-galaxy-viewport`, so label measurement never depends on a main-galaxy CSS class or a sibling chart. Zero-size labels whose wrapper is not rendered cannot reserve space. The guard has a unit regression. The observation candidates were generated before this host-scope correction; final exact verification uses the corrected source.

Final exact comparison at `4a3ea95`: four journeys / 72 captures passed in 21.6/25.7/57.8/25.6 seconds (`/tmp/cluster-label-exact.log`, retained `/tmp/cluster-label-exact-results`). No screenshot tolerance changes. All 95 unit tests / 1,630 assertions, 25 policy/clock/cohort checks, 13 prompt tests, types and lint pass. See [candidate review](../testing/GALAXY_LABEL_BASELINE_REVIEW.md) and the archived ordered observation stories.

Resource inspection during verification found Data-volume headroom falling from 7.3GiB to 794MiB, then recovering to 2.2GiB without task deletion. Current build caches are about22MiB; preserved traces/candidates are not disposable caches. No broad artifact downloads or generation were launched. The shared Pages run39724569489 remains queued; #64/#65 Linux verification remains running. The inherited identity-raster issue is not inferred fixed.

The unchanged uninstrumented stellar-observation service regression passes (152 assertions, 4.85s); its managed-real case is explicitly skipped without KMS. Four original observation/contact browser and normal/reduced lab regressions pass in32.5s (`/tmp/cluster-label-regressions.log`). These retain private acquisition, recovery and shared contact-chart behavior; they are not hosted or managed-provider certification.
