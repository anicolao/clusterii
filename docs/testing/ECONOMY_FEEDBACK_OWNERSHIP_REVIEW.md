# Economy feedback ownership review

This successor to #90 adds narrow real-player regression coverage for the broadened `!economy` route-feedback condition. No production or service semantics change. Existing market and trade stories assert that their own instruments keep accepted/pending feedback while no background route acknowledgement is rendered. Closing Economy restores the original market/trade acknowledgement with keyboard focus and unchanged canonical state. A queued, accepted construction remains outstanding while Economy is inspected; closing restores its non-Economy acknowledgement without another command, debit or tick.

| Dependency / evidence | Status |
| --- | --- |
| Base | #90 `feat/research-forecast` b345b4f; approved live76 strict evidence remains on the predecessor. |
| Source | Existing construction/credit TestStepHelper journeys extended; prior receipt, privacy, conservation, interruption and settlement assertions retained. |
| Static | Type/Svelte and story-policy checks pass. |
| Browser | Bounded ordinary construction + ordinary credit exchange generation pending. Interrupted variants retain the shared absent-route assertions; their rerun is not yet claimed. |
| Visual / hosted | New candidates need independent matching-source review and strict comparison. Current-head preview pending. |

These stories use ordinary authenticated actions and real receipts/projections. Existing guarded test clocks/delivery controls stay explicitly labelled. This does not approve proposed construction/trade rules or certify hosted scheduling. Profile-ingress cause, original raster, Linux and release holds remain open. Restart filter: `Live construction completes and cancels developments|Live credit exchange settles and withdraws exact terms` with the established demo emulator environment and `bun run test:stories:generate`; remeasure disk before starting.
