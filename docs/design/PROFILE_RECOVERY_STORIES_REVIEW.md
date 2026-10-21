# Illustrated profile recovery

This slice replaces the procedural identity recovery regression with three ordered stories using the production identity editor, real Firebase emulator authentication, encrypted commands, canonical persistence and receipts. It changes no production behavior or gameplay rules. The base is `feat/illustrated-e2e` (#35).

Two independent devices preserve an unsent draft while another saves, show the explicit conflict, then acknowledge replacement on both devices. The retry story shows disconnected submission, the actual acknowledgement deadline, explicit retry, reconnection and reload. Transport retransmission is permitted only for one command UUID and identical encrypted payload; canonical revision, version and accepted-receipt checks prove exactly one additional effect. A structured attachment retains these facts without publishing the payload. The keyboard story checks Learn and identity return focus and the reduced-motion result.

## Evidence

All 12 local viewport journeys passed exact decoded-pixel comparison: 92 captures in 2.6 minutes. Candidate review and comparison are separate operations; [baseline review](../testing/PROFILE_RECOVERY_BASELINE_REVIEW.md) records the inspected compositions. [Generated narratives](../testing/STORY_INVENTORY.md#profile-recovery-narratives) contain named actions, acknowledgements, assertions and both-device views. Network disconnection is explicitly labeled a harness control; canonical reads corroborate UI outcomes without injecting state.

The focused retry rerun passes all four viewports in 1.8 minutes with structured command/payload-digest/revision/receipt evidence attached (`/tmp/cluster-profile-retry-evidence.log`). These are 24 unchanged exact captures, archived after that rerun.

Type checking reports zero errors/warnings and all six story-policy/catalogue guards pass. Removing `recovery.spec.ts` and its frozen legacy exception follows successful replacement coverage, not a weakened assertion.

## Remaining gates

Pinned Linux generation/review/exact comparison, current-head CI and independent full visual review remain pending. Emulator Google authentication does not certify hosted Google login. Normal-motion parity, native keyboard, text enlargement, other session/key recovery and remaining gameplay story migrations are explicitly incomplete. No gameplay proposal is approved by this test migration. No PR is merged.
