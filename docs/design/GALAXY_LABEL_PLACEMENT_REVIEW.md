# Galaxy label placement review

The recovered phone observation scene draws Tupã over Tania Australis. Their star positions are distinct, but independently projected HTML names overlap. The retained predecessor capture is `live-stellar-observations/phone/darwin-arm64/018-recover-retained-report-1-survey-envoy.png` at PR #66.

The production chart places measured labels in screen space, in this order: selected system, home, other owned systems, then secondary catalogue landmarks. Equal priorities use stable system IDs. It tries the original position and nearby rows with a six-pixel gap, keeps labels inside the chart, and omits a lower-priority name only when no nearby row fits. Offscreen anchors stay offscreen. The star geometry, selection ring, class filter, authorized catalogue and ownership inputs do not change. Center home and the complete keyboard systems list remain available.

The chart observes actual text dimensions, font readiness, viewport size and projected camera transforms. It batches reads and updates in one animation frame and disconnects observers when the chart is destroyed. This is shared production cartography, not a screenshot mask or test-only label replacement.

| Dependency / acceptance | Evidence / status |
| --- | --- |
| Base | PR #66 `feat/live-observation-stories`, 0666727; no merge |
| Collision and edge algorithm | Three tests / 81 assertions: retained pair, crowded priorities, order determinism, containment, offscreen anchors and resize |
| Real observation journey | Existing privacy, current/historical reports, leased tick repeat-safety and reload assertions retained; candidate run in progress |
| Rendered resize, keyboard and motion | Additional live checks in progress |
| Visual review | First phone candidate separates the reported pair; all-size final review and strict comparison pending |
| Baseline scope | Intentional galaxy composition change; no inherited image replaced without separate review. Other affected galaxy families remain comparison gates |
| Linux / independent review / preview | Pending; no hosted or release acceptance |

Rules remain under review. No service, cryptography, tick, command or gameplay rule changes are introduced by label placement.

Diagnostic evidence: `/tmp/cluster-label-generation.log` passes phone/desktop/large (19.5/23.1/46.0s), then short fails before testing with Firestore HTTP server `Address already in use`; retained under `/tmp/cluster-label-first-candidates`. Generation2 reaches the new keyboard home action, whose incorrect extra Close list action times out: production `move()` already closes the list and restores focus. The correction asserts both dismissal and restored Systems list focus. The owned remaining cohorts were interrupted; no deadline or service assertion was relaxed.
