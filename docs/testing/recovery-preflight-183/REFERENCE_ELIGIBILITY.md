# Reference eligibility at frozen PR140

No reference was written. This inventory covers tracked baselines, 248 retained first failures and 1,055 local manifests, not every possible remote artifact. Duplicate archives are not independent evidence. The conservative changed-input check includes all production/shared sources: a changed unrelated component requires dependency review; it does not prove the pixels are wrong.

All 172 missing-reference paths from PR137 remain absent in PR140. Existing pixel references are present but have not been certified compatible with current production. Later behavior remains unexecuted or masked in the failed strict runs.

## Retained Linux generation leads

No Linux family is automatically source-equivalent under this check. These are review leads, not promotion candidates. Missing original Git objects and migrated specs are explicit provenance blockers. Renderer records are retained in the compressed inventory.

| Family | Retained manifests | Spec matches | Source commits | Eligibility blockers |
| --- | ---: | ---: | --- | --- |
| campaign-admission-navigation | 4 | 0 | 3d37f977 | source-unavailable, spec-differs-or-missing |
| campaign-chart-navigation | 4 | 0 | 3d37f977 | source-unavailable, spec-differs-or-missing |
| campaign-feedback-lab | 4 | 4 | 4fc0c6d6 | source-unavailable |
| campaign-history | 16 | 0 | 4c11df2f, 828e4015, e54b464e, e64fee90 | incomplete-originals, source-unavailable, spec-differs-or-missing |
| campaign-receipt-recovery | 4 | 4 | 4a593438 | incomplete-originals, source-unavailable |
| campaign-scheduled-start | 4 | 0 | e0d42942 | source-unavailable, spec-differs-or-missing |
| commander-identity | 16 | 0 | 4c11df2f, 828e4015, e54b464e, e64fee90 | incomplete-originals, source-unavailable, spec-differs-or-missing |
| encryption-unavailable | 4 | 0 | 4cf1ab3b | source-unavailable, spec-differs-or-missing |
| entry-profile-readiness | 4 | 0 | 3d37f977 | source-unavailable, spec-differs-or-missing |
| feedback-motion-lab | 4 | 4 | 4fc0c6d6 | source-unavailable |
| history-recovery-lab | 4 | 4 | cbf67363 | production-or-shared-inputs-changed-needs-review |
| identity-component-gallery | 8 | 8 | 28070d48, ddd7512c | source-unavailable |
| identity-conflict | 12 | 12 | 4c11df2f, 828e4015, e64fee90 | incomplete-originals, source-unavailable |
| identity-keyboard-return | 12 | 12 | 4c11df2f, 828e4015, e64fee90 | incomplete-originals, source-unavailable |
| identity-pending-retry | 12 | 12 | 4c11df2f, 828e4015, e64fee90 | incomplete-originals, source-unavailable |
| identity-receipt-recovery | 4 | 4 | 4a593438 | incomplete-originals, source-unavailable |
| identity-validation | 8 | 8 | 4c11df2f, 828e4015 | incomplete-originals, source-unavailable |
| invitation-first-admission | 4 | 0 | 828e4015 | incomplete-originals, source-unavailable, spec-differs-or-missing |
| invitation-returning-recovery | 4 | 0 | 828e4015 | incomplete-originals, source-unavailable, spec-differs-or-missing |
| learn-and-return | 16 | 0 | 4c11df2f, 828e4015, e54b464e, e64fee90 | incomplete-originals, source-unavailable, spec-differs-or-missing |
| live-fleet-reorganization | 3 | 0 | d6885b03 | incomplete-originals, source-unavailable, spec-differs-or-missing |
| maintenance-admission-recovery | 4 | 4 | 1652b097 | incomplete-originals, source-unavailable |
| production-ledger-lab | 4 | 4 | cbf67363 | production-or-shared-inputs-changed-needs-review |
| research-selection-lab | 4 | 0 | 05a27a96 | production-or-shared-inputs-changed-needs-review, spec-differs-or-missing |
| scheduled-start-lab | 4 | 4 | 623b0ff7 | production-or-shared-inputs-changed-needs-review |
| selected-history-consent | 4 | 0 | ea3f2caa | production-or-shared-inputs-changed-needs-review, spec-differs-or-missing |
| selected-history-lab | 4 | 4 | 14150a63 | source-unavailable |
| session-cancelled-confirmation | 4 | 4 | f58cb85f | incomplete-originals, source-unavailable |
| session-ending-lab | 4 | 4 | 623b0ff7 | production-or-shared-inputs-changed-needs-review |
| session-interrupted-recovery | 4 | 4 | f58cb85f | incomplete-originals, source-unavailable |

## Current-source Darwin families available for independent review

Only `campaign-admission-navigation` and `faction-composition-gallery` from clean343eb590 have matching specs and unchanged production/shared inputs at frozen140 in this conservative inventory. Both have all four sizes and complete originals. They are not Linux references and remain unapproved as families.

Canonical archive: `tests/e2e/005-campaign-access/stories/briefing-343eb590/`. The duplicate `/tmp/cluster-briefing-final-343eb590/stories/` is the original output.76 images total, not152 independent captures. Below hashes record current archived bytes for review, not approval.

## Absent families carried from the completed strict run

These are the43 phone first-failure paths; the same families are absent at all four sizes. This does not count every later missing image in each family. Current source remains frozen140.

| Family | Current story file | PNG / renderer |
| --- | --- | --- |
| live-construction-ordinary | tests/browser/construction.story.spec.ts | absent / absent |
| live-construction-recovery | tests/browser/construction.story.spec.ts | absent / absent |
| credit-exchange-ordinary | tests/browser/credit-exchange.story.spec.ts | absent / absent |
| credit-exchange-recovery | tests/browser/credit-exchange.story.spec.ts | absent / absent |
| live-fleet-cancellation | tests/browser/fleet-cancellation.story.spec.ts | absent / absent |
| live-fleet-cargo | tests/browser/fleet-cargo.story.spec.ts | absent / absent |
| live-fleet-contacts | tests/browser/fleet-contacts.story.spec.ts | absent / absent |
| live-fleet-formation | tests/browser/fleet-formation.story.spec.ts | absent / absent |
| live-fleet-reorganization | tests/browser/fleet-reorganization.story.spec.ts | absent / absent |
| interrupted-fleet-route | tests/browser/fleet-route-recovery.story.spec.ts | absent / absent |
| paused-fleet-travel | tests/browser/fleet-travel-catchup.story.spec.ts | absent / absent |
| live-fleet-travel | tests/browser/fleet-travel.story.spec.ts | absent / absent |
| live-menu-preservation | tests/browser/live-menu-preservation.story.spec.ts | absent / absent |
| local-presentation-settings | tests/browser/local-settings.story.spec.ts | absent / absent |
| market-draft-account-isolation | tests/browser/market-account-isolation.story.spec.ts | absent / absent |
| market-draft-session-revocation | tests/browser/market-draft-lifecycle.story.spec.ts | absent / absent |
| market-draft-membership-revocation | tests/browser/market-membership-revocation.story.spec.ts | absent / absent |
| live-stellar-observations | tests/browser/observations.story.spec.ts | absent / absent |
| research-forecast-gallery | tests/browser/research-forecast.story.spec.ts | absent / absent |
| research-capability-guidance | tests/browser/research-guidance.story.spec.ts | absent / absent |
| live-research-orders | tests/browser/research-orders.story.spec.ts | absent / absent |
| live-return-briefing | tests/browser/return-briefing.story.spec.ts | absent / absent |
| campaign-selection-ownership | tests/browser/selection-ownership.story.spec.ts | absent / absent |
| cinematic-returning-entry | tests/e2e/001-entry/returning.spec.ts | absent / absent |
| galaxy-command-surface | tests/e2e/002-galaxy/galaxy.spec.ts | absent / absent |
| science-ledger-components | tests/e2e/003-science/components.spec.ts | absent / absent |
| science-rate-sources | tests/e2e/003-science/science.spec.ts | absent / absent |
| waiting-to-home | tests/e2e/004-waiting/waiting.spec.ts | absent / absent |
| encryption-unavailable | tests/e2e/005-campaign-access/encryption.spec.ts | absent / absent |
| invitation-first-admission | tests/e2e/005-campaign-access/invitation.spec.ts | absent / absent |
| invitation-returning-recovery | tests/e2e/005-campaign-access/invitation.spec.ts | absent / absent |
| campaign-admission-navigation | tests/e2e/005-campaign-access/navigation.spec.ts | absent / absent |
| campaign-chart-navigation | tests/e2e/005-campaign-access/navigation.spec.ts | absent / absent |
| entry-profile-readiness | tests/e2e/005-campaign-access/navigation.spec.ts | absent / absent |
| campaign-history | tests/e2e/006-campaign-history/history.spec.ts | absent / absent |
| galaxy-cinematic-instruments | tests/e2e/007-galaxy-composition/composition.spec.ts | absent / absent |
| galaxy-instrument-gallery | tests/e2e/007-galaxy-composition/gallery.spec.ts | absent / absent |
| in-game-market-rules | tests/e2e/008-field-guide/market.spec.ts | absent / absent |
| in-game-route-rules | tests/e2e/008-field-guide/routes.spec.ts | absent / absent |
| route-instrument-components | tests/e2e/009-route-forces/components.spec.ts | absent / absent |
| route-force-review | tests/e2e/009-route-forces/forces.spec.ts | absent / absent |
| command-control-motion | tests/e2e/010-zero-science/controls.spec.ts | absent / absent |
| contextual-aftermath-components | tests/e2e/011-contextual-aftermath/components.spec.ts | absent / absent |

## Present references with observed differences / unreached behavior

These17 first-failing phone stories have pixel differences in the retained run, repeated at all four sizes. Their current pixels have not been rerun. Existing reference bytes are preserved; intentional redesign, actual regression and residual renderer effects still require individual comparison.

- tests/browser/campaign-start.story.spec.ts:43:1 — Five commanders start two campaigns and recover their named active campaign
- tests/browser/feedback-lab.story.spec.ts:7:1 — Feedback lab inspects reconnect, conflict and playback without changing outcomes
- tests/browser/feedback-lab.story.spec.ts:251:1 — Campaign feedback lab compares authoritative receipt presentations across motion modes
- tests/browser/history-lab.story.spec.ts:7:1 — History lab retries loading and inspects recovered records without changing motion outcomes
- tests/browser/identity-gallery.story.spec.ts:9:1 — Production gallery exposes identity, navigation and feedback control states
- tests/browser/identity.story.spec.ts:5:1 — Save and recover a commander identity
- tests/browser/lifecycle-lab.story.spec.ts:66:1 — Lifecycle lab distinguishes scheduled, delayed and assigned start presentations
- tests/browser/lifecycle-lab.story.spec.ts:158:1 — Lifecycle lab preserves session-ending disclosure and inspects completed motion
- tests/browser/maintenance.story.spec.ts:14:1 — The host pauses admission, recovers the pause and resumes a waiting commander
- tests/browser/production-lab.story.spec.ts:7:1 — Production lab distinguishes due time from confirmed output and preserves ledger outcomes
- tests/browser/profile-recovery.story.spec.ts:435:1 — Restore entry focus after keyboard learning and identity editing
- tests/browser/research-lab.story.spec.ts:7:1 — Research lab preserves selection through pending, recovery, scheduling and application
- tests/browser/selected-history.story.spec.ts:52:1 — Selected history reaches only a consenting commander and survives reload
- tests/browser/session-recovery.story.spec.ts:24:3 — Two devices recover a cancelled sign-out without losing saved identity
- tests/browser/session-recovery.story.spec.ts:24:3 — Two devices recover an interrupted sign-out without losing saved identity
- tests/browser/sharing-lab.story.spec.ts:7:1 — Sharing lab preserves selected-history consent and disclosure across motion modes
- tests/e2e/001-entry/entry.spec.ts:4:1 — Learn the campaign and return to entry

The two timeout stories reach setup but not their later rendered/authorization assertions. All assertions after any first screenshot failure remain uncertified by that run. No classified first failure is being converted to a pass by inventory.
