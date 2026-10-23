# Story verification 39931091215

Source: `4239b39b2b7d45dc8edd35336ce16ccaea5620eb`, PR #117. Application run 39931091268 succeeded independently. Retained story log: `/tmp/cluster117-0622-story-failure.log`; its SHA-256 and individual failed cases are in `classification.json`.

Counts describe each test's first reported failure, not every screenshot or downstream assertion. Each cohort reports 53 failed, 5 passed and 2 skipped.

| Failure category | Phone | Desktop | Large | Short | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Missing Linux baseline/renderer | 28 | 28 | 28 | 28 | 112 |
| Pixel comparison | 19 | 19 | 19 | 19 | 76 |
| Strict locator ambiguity | 2 | 2 | 2 | 2 | 8 |
| Obsolete waiting canvas/navigation expectation | 3 | 3 | 3 | 3 | 12 |
| Leased tick-batch timeout | 1 | 1 | 1 | 1 | 4 |

All 112 distinct missing-reference paths resolve to intended repository locations, without literal configDir braces. Neither the referenced Linux PNG nor its sibling renderer.json exists in this checkout. The path audit is included in the JSON. This establishes absent references, not eligibility to generate or approve replacements. Each viewport has 18 reported pixel-count differences plus one exact decoded-RGBA entry failure. None is approved as an acceptable redesign by this classification.

## Supported correction

The waiting manifest and open roster legitimately show the same campaign facts. History pause/resume acknowledgement now selects the exact Campaign roster panel status, including the second-device pause. Invitation membership checks select the named Campaign roster region inside that dialog: first-time Invited envoy and both Returning envoy checks. They retain exact names, one-seat count, real command receipts, identity revision and recovery checks. No first/last selection, deadline, pixel threshold or service behavior changes.

## Remaining compatibility and evidence boundaries

Both campaign-navigation waiting stories and encryption-choice still expect a canvas before home assignment. The manifest intentionally exposes no arbitrary star or gameplay dock. These require genuine waiting/active story restructuring rather than restoring premature controls. Source audit also finds latent waiting-canvas assertions in invitation recovery, and selected-system/history navigation prerequisites in the one-seat history journey. The strict-selector correction does not claim those complete journeys now pass; their assertions are preserved pending a proper active-campaign setup/migration.

Zero-science fails the 30,000ms harness step delivering 100 real leased ticks, in every cohort. The log identifies the boundary but does not discriminate settlement work from transport/browser delay. No retry, timeout increase or causal claim is made. This is separate from historical missing profile ingress processing, which remains unresolved despite application CI succeeding.

E2E_GUIDE and Pantheon's feature-local README/001-game-setup layout were reviewed before edits. These are bounded corrections to existing illustrated stories, not a claim of feature-local migration. No browser, emulator, capture generation, download or baseline promotion was performed for this correction. New rendered evidence and the existing fidelity, Linux, hosted/KMS and release gates remain open.

Validation: Nix environment Java21/Node24.18.0/Bun1.3.13 verified; focused TypeScript no-emit check of both changed stories and `node scripts/check-story-policy.mjs` passed. Formatting completed through Nix. Disk recovered during source work (23,463,052KiB observed), but this source-only handoff did not trigger browser execution. No deadline or assertion budget changed.
