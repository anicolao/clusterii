# Illustrated receipt-mismatch recovery

Identity and campaign creation now have separate illustrated collision journeys. A test-only control reuses a browser command UUID while real encryption, authenticated ingress, canonical persistence and exact receipt validation stay active. A mismatched acknowledgement focuses an explicit remedy and preserves the new draft. Restoring ordinary command IDs permits a fresh acknowledged save or creation; reload recovers that exact accepted identity or campaign.

Read-only identity checks require revision/version/receipt counts of one after the collision and two only after the fresh save. Campaign checks retain the original name/revision, require a distinct new campaign ID and empty durable pending-order storage after mismatch and acceptance. No geometry assertion scrolls an obscured commitment into view before checking it.

Capture review found completed feedback crossing into new drafts: “Identity saved” remained after editing a different alias, and “Campaign created” appeared on a new galaxy proposal. User input clears completed profile feedback; opening a new proposal clears completed campaign feedback. Pending and error handling remain intact. New assertions forbid both stale acknowledgements. Existing identity comparisons are checked before any changed baseline is reviewed.

The procedural suite's encrypted IndexedDB cleanup regression is preserved as an explicitly isolated browser integration in `tests/recovery-store.test.ts`, invoked by `test:browser-storage` in the pinned story workflow. It uses the actual production store and real browser IndexedDB, proving that cleanup cannot erase replacement encrypted bytes with the same UUID. This is storage evidence, not a player journey.

Base: #40, `feat/session-recovery-stories`. Local exact comparison, pinned Linux review/comparison, current-head application CI, independent composition/motion review and hosted-provider acceptance remain gates. Proposed rules remain under review. No PR is merged.

Exact local receipt comparison passes eight journeys/48 captures. All 20 existing identity, validation, conflict, pending/retry and keyboard-return stories pass against unchanged baselines; no existing image was regenerated. The predecessor procedural spec is removed only after these checks and the isolated IndexedDB regression pass.
