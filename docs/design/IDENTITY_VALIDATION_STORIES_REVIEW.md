# Illustrated identity validation

This slice replaces the procedural identity-layout regression with an ordered six-step story: sign-in, unsaved draft, rejected overlong name, correction, authoritative save and reload recovery. It uses the unchanged production editor and real emulator command processing. The base is `feat/profile-recovery-stories` (#36).

The prior no-reconnect, focus and geometry assertions remain. Additional checks prove invalid editing sends no profile command, preserves the chosen portrait, then produces exactly one canonical revision/version/receipt after correction. The shared helper audits commitment visibility before scrolling, target dimensions, overlap and bounded panels.

Four local journeys pass 24 exact captures in 24.5 seconds after separate candidate review. [Baseline review](../testing/IDENTITY_VALIDATION_BASELINE_REVIEW.md) and [generated narratives](../testing/STORY_INVENTORY.md#identity-validation-narratives) retain the sequence. Type checks and six story-policy/catalogue guards pass. No production behavior or rules change.

Pinned Linux comparison, current-head CI, independent full visual review, native keyboard and normal-motion parity remain open. Hosted Google acceptance is not inferred from emulator sign-in. Other story migrations remain inventoried. No PR is merged.
