# Illustrated-story migration inventory

The UX inventory is required coverage, not a completion claim. “Procedural” means assertions/captures exist but do not yet satisfy the illustrated-story contract. A migrated subjourney does not complete every branch in its UX row. No full multiplayer victory journey exists yet.

| ID                           | Existing regression sources                                                                                     | Illustrated status and gaps                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-01 Enter and return       | entry.story / identity.story, invitation, campaign, briefing                                                    | Entry/Learn and identity are the first story migration. Invitation admission and returning/missing/denied recovery now have illustrated local evidence. Named Continue and multiple/waiting membership branches remain procedural.                                                                       |
| UX-02 Join a campaign        | campaign, campaign-start, secure-campaign                                                                       | First-time invitation admission includes the host roster viewpoint. Four-player start, all roster/faction/portrait variants and simultaneous final-seat illustrated stories remain open.                                                                         |
| UX-03 Read the galaxy        | campaign, geometry, observations                                                                                | Procedural galaxy/list/selection checks; fixed-seed exact illustrated navigation remains open.                                                                                                                        |
| UX-04 Split control          | production, arrival-reports, observations                                                                       | Procedural ownership/output/privacy checks; complete illustrated ownership matrix remains open.                                                                                                                       |
| UX-05 Develop an empire      | construction, construction-completion, construction-feedback                                                    | Procedural reservation, completion, cancellation and scoped feedback. All development/layer illustrated branches remain open.                                                                                         |
| UX-06 Economy and science    | production, market-focus                                                                                        | Procedural tick/research/focus checks; full eight-technology and other-player-dividend stories remain open.                                                                                                           |
| UX-07 Partial knowledge      | observations, fleet-contacts                                                                                    | Procedural acquisition/staleness/privacy. Exact deterministic scan/accessible-map stories remain open.                                                                                                                |
| UX-08 Move forces            | fleets, fleet-travel, fleet-reorganization, fleet-cancellation                                                  | Procedural cargo, route, conservation and recovery; ordered illustrated operation branches remain open.                                                                                                               |
| UX-09 Conquer both layers    | arrival-reports                                                                                                 | Procedural split-conquest reports; allied forces/simultaneous-arrival and complete illustrated escrow journey remain incomplete.                                                                                      |
| UX-10 Negotiate              | conversations, receipt-binding                                                                                  | Procedural private rooms, selected history, removal and draft recovery. Multi-viewpoint illustrated negotiation remains open.                                                                                         |
| UX-11 Cooperate and exchange | credit-offers                                                                                                   | Procedural credit offer/accept/withdraw/settle/privacy. Illustrated normal and interrupted exchange stories remain open. Report exchange, alliances and departure gameplay are incomplete.                            |
| UX-12 Return informed        | briefing, history                                                                                               | Paged history is migrated through two devices, explicit latest recovery and reload; private visit, entry prompting and co-faction regressions remain procedural.                                                      |
| UX-13 Finish and begin again | none                                                                                                            | Victory, final settlement and repeated-game loop are not implemented.                                                                                                                                                 |
| UX-14 Recover commitments    | profile-recovery.story, receipt-binding, migration, maintenance.story, session-recovery.story, construction, conversations, credit-offers | Identity conflict, repeat-safe pending/retry and keyboard return have 12 exact local journeys/92 captures; history recovery also has local and Linux evidence. Other fault journeys remain procedural; hosted OAuth/Scheduler and compromise-key lifecycle gaps remain explicit. |
| UX-15 Navigate and learn     | entry.story / identity.story, invitation, session-recovery.story                                                      | Entry and all four Learn chapters now have exact local illustrated evidence. Full contextual rules/settings/safe-departure story remains open.                                                                        |
| UX-16 Every input            | geometry, identity-validation.story, lab, profile-recovery.story                                                                        | Existing keyboard/geometry/motion checks remain. The first stories cover keyboard Learn/focus and four viewports; complete text enlargement, native-keyboard, contrast and motion story coverage remains open.        |

## Enforcement and evidence

`legacy-browser-tests.json` freezes the remaining procedural specs by content hash. New or changed browser specs must use the illustrated fixture/helper; a legacy file changes by migration, not by silently extending the exception list. Existing assertions stay intact until their illustrated replacement covers them. Component/geometry diagnostic tests are explicitly inventoried legacy regression coverage, not gameplay acceptance.

The shared helper and guide do not resolve deterministic campaign-map capture. Existing random campaign seeds, real-time tick displays and injected service clocks must be addressed explicitly at the test boundary before exact campaign story baselines can be accepted. Production randomness, authorization and player controls must not be weakened to produce a convenient image.

Generated passing story links and baseline reviews are added here after verification. Generation-only documents, focused checks, emulator-clock runs and skipped real-provider cases remain distinct from complete current-head CI and independent acceptance.

## Verified local narratives

Local darwin-arm64 verification: eight journeys, 44 exact captures, 35.6 seconds. These are emulator-service observations, not hosted or Linux acceptance.

| Viewport | Learn                                                                | Identity                                                                |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| phone    | [Six steps](stories/learn-and-return/phone/darwin-arm64/README.md)   | [Five steps](stories/commander-identity/phone/darwin-arm64/README.md)   |
| desktop  | [Six steps](stories/learn-and-return/desktop/darwin-arm64/README.md) | [Five steps](stories/commander-identity/desktop/darwin-arm64/README.md) |
| large    | [Six steps](stories/learn-and-return/large/darwin-arm64/README.md)   | [Five steps](stories/commander-identity/large/darwin-arm64/README.md)   |
| short    | [Six steps](stories/learn-and-return/short/darwin-arm64/README.md)   | [Five steps](stories/commander-identity/short/darwin-arm64/README.md)   |

History migration uses a guarded emulator-only catalogue seed at the real reducer boundary, ordinary UI setup and real encrypted commands. It does not inject pre-made seats/records or replace services. Active production clocks, multiplayer campaign exchanges and random-map fairness remain separate gaps.

## Verified history narratives

Combined local comparison: 12 journeys/86 captures, 1.2 minutes. The history subjourney preserves keyboard wrapping, two device viewpoints, paging and recovery; other return branches remain open.

[phone](stories/campaign-history/phone/darwin-arm64/README.md) · [desktop](stories/campaign-history/desktop/darwin-arm64/README.md) · [large](stories/campaign-history/large/darwin-arm64/README.md) · [short](stories/campaign-history/short/darwin-arm64/README.md)

## Verified pinned Linux narratives

[Exact run 39615653957](https://github.com/anicolao/clusterii/actions/runs/39615653957): all 12 journeys/86 captures passed in 2.2 minutes at 29fd306. This compares separately reviewed Linux candidates; it does not complete the other UX branches or hosted acceptance.

| Viewport | Learn | Identity | History recovery |
| --- | --- | --- | --- |
| phone | [Six steps](stories/learn-and-return/phone/linux-arm64/README.md) | [Five steps](stories/commander-identity/phone/linux-arm64/README.md) | [Two-device story](stories/campaign-history/phone/linux-arm64/README.md) |
| desktop | [Six steps](stories/learn-and-return/desktop/linux-arm64/README.md) | [Five steps](stories/commander-identity/desktop/linux-arm64/README.md) | [Two-device story](stories/campaign-history/desktop/linux-arm64/README.md) |
| large | [Six steps](stories/learn-and-return/large/linux-arm64/README.md) | [Five steps](stories/commander-identity/large/linux-arm64/README.md) | [Two-device story](stories/campaign-history/large/linux-arm64/README.md) |
| short | [Six steps](stories/learn-and-return/short/linux-arm64/README.md) | [Five steps](stories/commander-identity/short/linux-arm64/README.md) | [Two-device story](stories/campaign-history/short/linux-arm64/README.md) |

## Profile recovery narratives

Twelve darwin-arm64 journeys verify 92 exact captures in 2.6 minutes. These replace the procedural recovery spec while preserving conflict revisions, transport identity/payload and single-effect assertions. Linux comparison, normal-motion parity, text enlargement and independent full review remain open.

| Viewport | Two-device conflict | Pending retry | Keyboard return |
| --- | --- | --- | --- |
| phone | [Both devices](stories/identity-conflict/phone/darwin-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/phone/darwin-arm64/README.md) | [Focus restoration](stories/identity-keyboard-return/phone/darwin-arm64/README.md) |
| desktop | [Both devices](stories/identity-conflict/desktop/darwin-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/desktop/darwin-arm64/README.md) | [Focus restoration](stories/identity-keyboard-return/desktop/darwin-arm64/README.md) |
| large | [Both devices](stories/identity-conflict/large/darwin-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/large/darwin-arm64/README.md) | [Focus restoration](stories/identity-keyboard-return/large/darwin-arm64/README.md) |
| short | [Both devices](stories/identity-conflict/short/darwin-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/short/darwin-arm64/README.md) | [Focus restoration](stories/identity-keyboard-return/short/darwin-arm64/README.md) |

## Identity validation narratives

Four local journeys verify 24 exact captures after separate candidate review. The invalid draft sends no command, retains its portrait and focused name, and receives a validation remedy; correction saves one canonical revision and survives reload. Linux, independent full review and native keyboard acceptance remain open.

[phone](stories/identity-validation/phone/darwin-arm64/README.md) · [desktop](stories/identity-validation/desktop/darwin-arm64/README.md) · [large](stories/identity-validation/large/darwin-arm64/README.md) · [short](stories/identity-validation/short/darwin-arm64/README.md)

### Verified Linux profile recovery

Pinned Linux exact comparison at 295ae43 passes all 24 combined stories in 5.4 minutes, including these 12 recovery journeys/92 captures. This is emulator evidence, not hosted or independent full visual acceptance.

| Viewport | Conflict | Retry | Keyboard |
| --- | --- | --- | --- |
| phone | [Both devices](stories/identity-conflict/phone/linux-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/phone/linux-arm64/README.md) | [Focus return](stories/identity-keyboard-return/phone/linux-arm64/README.md) |
| desktop | [Both devices](stories/identity-conflict/desktop/linux-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/desktop/linux-arm64/README.md) | [Focus return](stories/identity-keyboard-return/desktop/linux-arm64/README.md) |
| large | [Both devices](stories/identity-conflict/large/linux-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/large/linux-arm64/README.md) | [Focus return](stories/identity-keyboard-return/large/linux-arm64/README.md) |
| short | [Both devices](stories/identity-conflict/short/linux-arm64/README.md) | [Repeat-safe save](stories/identity-pending-retry/short/linux-arm64/README.md) | [Focus return](stories/identity-keyboard-return/short/linux-arm64/README.md) |

## Invitation recovery narratives

Eight local journeys verify 72 exact captures in 1.3 minutes. Host and invitee views show admitted membership; returning authentication preserves the original saved identity, and missing/denied links have explicit remedies. Fixed catalogue and development-claim setup are named harness controls. This is not full admission/start, Linux, hosted or independent visual acceptance.

| Viewport | First-time admission | Returning and inaccessible links |
| --- | --- | --- |
| phone | [Invitee and host](stories/invitation-first-admission/phone/darwin-arm64/README.md) | [Return and recover](stories/invitation-returning-recovery/phone/darwin-arm64/README.md) |
| desktop | [Invitee and host](stories/invitation-first-admission/desktop/darwin-arm64/README.md) | [Return and recover](stories/invitation-returning-recovery/desktop/darwin-arm64/README.md) |
| large | [Invitee and host](stories/invitation-first-admission/large/darwin-arm64/README.md) | [Return and recover](stories/invitation-returning-recovery/large/darwin-arm64/README.md) |
| short | [Invitee and host](stories/invitation-first-admission/short/darwin-arm64/README.md) | [Return and recover](stories/invitation-returning-recovery/short/darwin-arm64/README.md) |

### Verified Linux validation

Pinned Linux comparison at b3def4c passes 28 combined stories/202 captures in 6.0 minutes, including these four validation stories/24 images. Hosted Google and independent full visual review remain separate gates.

[phone](stories/identity-validation/phone/linux-arm64/README.md) · [desktop](stories/identity-validation/desktop/linux-arm64/README.md) · [large](stories/identity-validation/large/linux-arm64/README.md) · [short](stories/identity-validation/short/linux-arm64/README.md)

## Maintenance recovery narratives

Four local maintenance journeys/52 exact captures cover acknowledged pause/resume, independent admission views, reload persistence and real keyboard wrap/Escape restoration. Combined history regression passes unchanged. Linux, independent full visual review and hosted acceptance remain open.

[phone](stories/maintenance-admission-recovery/phone/darwin-arm64/README.md) · [desktop](stories/maintenance-admission-recovery/desktop/darwin-arm64/README.md) · [large](stories/maintenance-admission-recovery/large/darwin-arm64/README.md) · [short](stories/maintenance-admission-recovery/short/darwin-arm64/README.md)

## Verified Linux invitation narratives

Eight invitation journeys/72 captures pass within the 36-story pinned Linux run 39628471834.

- phone: [First admission](stories/invitation-first-admission/phone/linux-arm64/README.md), [Returning recovery](stories/invitation-returning-recovery/phone/linux-arm64/README.md).
- desktop: [First admission](stories/invitation-first-admission/desktop/linux-arm64/README.md), [Returning recovery](stories/invitation-returning-recovery/desktop/linux-arm64/README.md).
- large: [First admission](stories/invitation-first-admission/large/linux-arm64/README.md), [Returning recovery](stories/invitation-returning-recovery/large/linux-arm64/README.md).
- short: [First admission](stories/invitation-first-admission/short/linux-arm64/README.md), [Returning recovery](stories/invitation-returning-recovery/short/linux-arm64/README.md).

## Device recovery narratives

Eight session journeys/104 exact local captures cover both devices during cancelled confirmation, persisted worker interruption, reload recovery, acknowledged sign-out and saved-identity restoration. Four unchanged identity stories also pass: 12 combined journeys/124 captures. Linux, independent composition/motion review and hosted Google acceptance remain open.

- phone: [Cancelled confirmation](stories/session-cancelled-confirmation/phone/darwin-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/phone/darwin-arm64/README.md).
- desktop: [Cancelled confirmation](stories/session-cancelled-confirmation/desktop/darwin-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/desktop/darwin-arm64/README.md).
- large: [Cancelled confirmation](stories/session-cancelled-confirmation/large/darwin-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/large/darwin-arm64/README.md).
- short: [Cancelled confirmation](stories/session-cancelled-confirmation/short/darwin-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/short/darwin-arm64/README.md).

## Verified Linux maintenance narratives

Four maintenance journeys/52 captures pass within the 40-story Linux run 39632014899.

- [phone](stories/maintenance-admission-recovery/phone/linux-arm64/README.md).
- [desktop](stories/maintenance-admission-recovery/desktop/linux-arm64/README.md).
- [large](stories/maintenance-admission-recovery/large/linux-arm64/README.md).
- [short](stories/maintenance-admission-recovery/short/linux-arm64/README.md).

## Verified Linux device narratives

All 48 stories pass in run39635580827; the eight device journeys contribute 104 exact captures. Independent visual/motion and hosted gates remain open.

- phone: [Cancelled confirmation](stories/session-cancelled-confirmation/phone/linux-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/phone/linux-arm64/README.md).
- desktop: [Cancelled confirmation](stories/session-cancelled-confirmation/desktop/linux-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/desktop/linux-arm64/README.md).
- large: [Cancelled confirmation](stories/session-cancelled-confirmation/large/linux-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/large/linux-arm64/README.md).
- short: [Cancelled confirmation](stories/session-cancelled-confirmation/short/linux-arm64/README.md), [Interrupted recovery](stories/session-interrupted-recovery/short/linux-arm64/README.md).
