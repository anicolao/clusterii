# Fleet cancellation review

Commanders review a queued formation, cargo transfer, split, merge or disband operation and cancel it before its execution cutoff. The production fleet instrument explains the effect, retains the force draft and restores focus to accepted orders after acknowledgement. Cancellation releases reserved forces, fleet slots and both merge participant locks without moving any units.

## Development rules under review

Cancellation commits immediately through the authoritative command transaction. It is legal only before the target order's effective tick boundary; a delayed scheduler does not extend that window. At the exact boundary the order is closed. A later-tick order remains cancellable while earlier ticks await catch-up. Maintenance pause blocks cancellation like other fleet commands. Losing control of a system does not prevent withdrawing one's own unexecuted order.

These are conservative development implementation choices, not owner approval of gameplay rules. Travel and mid-flight behavior are not implemented by this slice. No existing campaign is awarded resources or given reconstructed history.

## Persistence and authorization

`fleet.cancel` requires an exact revision and an order ID belonging to the authenticated member. Unknown and other-member IDs return the same unavailable result. Strict field validation rejects injected fields. Command identity, envelope binding, encryption provider, session checks and transaction receipt/history use the existing complete service path. Cancellation retries do not create another revision or effect; competing cancellation/settlement commits serialize.

The operation removes an existing order and changes no fleet/system inventories or persisted schema. Existing tick workers remain compatible. The storage-release headroom applies to validated cancellation so a capacity-constrained campaign can shed pending work. A missing order is never interpreted as a successful cancellation; only its verified accepted receipt produces the released acknowledgement.

## Presentation and verification

The existing production component, fleet illustration and hand-authored icon are reused; provenance remains in [PRODUCTION_ASSETS.md](../art/PRODUCTION_ASSETS.md). Gallery and animation lab show actual shared reducer states, with identical pending/reconnect/released outcomes under both motion settings. Confirmation stays in the commitment rail; manifest details scroll within the bounded panel.

Evidence:

- 51 unit tests / 1,108 assertions pass, including exact cutoff and delayed-scheduler cases, all five existing stationed operations, strict fields, ownership, preserved inventories and released merge locks.
- Both encryption providers with live Cloud KMS: two cases / 124 assertions in 35.48 seconds. Same-command replay preserves one revision/history entry; competing cancellations produce one acceptance; cancellation versus settlement preserves total forces and private views.
- Four browser tests pass in 34.7 seconds: ordinary four-commander admission, cancellation after reload, Keep order, preserved force draft, focus recovery, no execution after cancellation, and inherited split/merge. Shared lab outcomes match under reduced motion. Four-size review/completed captures and SHA-256 inventory are retained in [fleet-cancellation](../ux/reviews/fleet-cancellation/).
- Type checks, lint and 12 prompt-hook tests pass. Full default service regression passes: 26 tests / 1,503 assertions in 89.74 seconds, with 16 live-only cases skipped. The targeted live provider cases above cover this slice. Five gallery/lab checks pass in 22.7 seconds.

The browser start/settlement uses an explicit clock with the real service. It does not certify hosted scheduling. The first service attempt used an incorrect trigger replay invocation; this was corrected to the existing trigger's `run` entry point. A subsequent conservation assertion incorrectly expected four new units after two ticks. At 1.4 per tick, two ticks yield two whole units with the fractional remainder retained; the corrected exact total is 22, and production code was unchanged. Retained logs distinguish those failed attempts from passing evidence. Hosted Google/Scheduler, independent rendered/security acceptance and exact-head CI remain gates. This does not complete milestone 6 or authorize public admission.

## Compatible rollout

Command admission was deployed before the additive RTDB ingress rule. Hosted readback confirms `fleet.cancel` and an ACTIVE Node.js 22 admission function without test flags. No scheduler or persisted-schema update is required. Deployment is separate from hosted player-journey acceptance.

## Replacement CI correction

Run 39557785293 passed 56 browser cases and failed the inherited formation journey: its unnamed level-three heading matched both the selected fleet and the newly persistent Accepted orders heading. The test now uses the exact selected fleet name and asserts the matching visible heading plus selected-control pressed state and retained focus; conservation, acknowledged settlement and accepted-order assertions remain intact. The retained trace/log establish selector ambiguity, not a duplicate fleet or settlement failure. The focused formation/disbanding, cargo and lab cohort passes all three cases in 29.1 seconds. Replacement full CI remains a gate.
