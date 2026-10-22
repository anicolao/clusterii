# Acknowledged history setup

The retained #62 4K trace shows the history fixture exhausting one 30-second harness while sign-in, admission and successive pause/resume acknowledgements were completing. Its final status expectation was interrupted after 3.7 seconds, before that expectation's own ten-second deadline. The captured roster exists. This is separate from the later Firestore heap exhaustion and inherited raster mismatch.

The fixture now declares fifteen named setup controls: saved identity, admitted campaign, twelve acknowledged maintenance commands, and return to the selected system. Each control retains the helper's 30-second step budget and every existing locator/assertion timeout. The test retains its 90-second total deadline. Commands run once in order; no retries, fallback state, direct injected history, changed acknowledgement or longer assertion deadline is introduced.

`TestStepHelper.harness` accepts a sequence of distinctly named operations and records their completed descriptions in the generated harness entry. A failed operation stops the sequence and prevents a passed story document. Existing single-operation harness calls preserve their behavior. Grouping the setup narrative keeps capture ordinals and inherited expected images unchanged; it does not hide operation timing from Playwright's trace.

| Dependency / acceptance | Evidence / status |
| --- | --- |
| Base | PR #64 `feat/bounded-story-cohorts`, `a26324c` |
| Original failure | `/tmp/cluster62-first-service-failure`, [service/setup triage](../testing/CI_SERVICE_TRIAGE_2026_10_22.md) |
| Exact story comparison | 4 passed / 42 unchanged exact captures; `/tmp/cluster-history-steps-exact.log`; no generation or baseline modification |
| Retained behavior | Beyond-first-page history, authorized record counts, second-device updates, preserved reading position, explicit latest-record recovery, selected-system recovery and keyboard containment remain asserted |
| Linux | Current-head verification pending; local success does not certify loaded Linux timing |
| Preview / independent acceptance | Pending; no player-facing production code changes |

Visual comparison uses the existing separately reviewed [baseline review](../testing/BASELINE_REVIEW.md). No image is promoted in this correction. Any passing archive records the new named controls and original exact pixels; neither missing Linux families nor identity raster drift is accepted by this change.

Local run: phone 13.9s, desktop 14.9s, 4K 31.5s and short 13.7s (excluding service startup). All four generated stories contain the fifteen completed controls and the original captures (twelve on phone, ten at each other size). Twenty-two policy/clock/tool-orchestration tests, thirteen prompt-history tests, thirteen browser-tool tests (40 assertions), lint and type checking pass. Original failed Linux trace and logs remain retained. These local results do not certify the pending Linux cohort.
