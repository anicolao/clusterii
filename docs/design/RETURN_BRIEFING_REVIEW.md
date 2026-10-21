# Return briefing

The return briefing groups the player's authorized changes since an acknowledged visit: control, arrivals and losses, research, economy and conversation activity. Completed events and pending orders stay separate. Opening a report is explicit; reading or dismissing the briefing never marks private messages read or moves the map automatically.

A private, server-persisted checkpoint records the last confirmed campaign revision reviewed by this commander. The command uses the existing encrypted ingress, bound receipts and recovery outbox. Checkpoints move forward only; an older device cannot overwrite a later visit. The server validates the referenced authorized record. No other player's checkpoint is projected.

The briefing reads immutable recipient history through the existing paged reader, retaining the boundary of what the player knew at each record. It names the loaded period and latest confirmed tick. Earlier records remain accessible; incomplete loading never claims to summarize unseen records. New activity offers an explicit refresh without moving the reading position. Revocation and epoch changes use the existing history recovery rules.

This is a milestone 10 information/recovery slice. It introduces no alliance, victory, balance or notification-channel policy. Hosted, exact-head CI and independent visual/privacy acceptance remain gates.

New campaigns record briefing capability and initialize each private visit baseline at home assignment. Existing campaigns retain their recorded history behavior. This slice exposes the briefing from Campaign History, saves an explicitly reviewed period, and links to existing instruments. Automatic entry prompting is a separate remaining UX acceptance item. A partial history load disables saving the visit until the exact authorized baseline has been recovered; it never silently skips unseen records.

## Evidence

- Unit suite: 80 tests, 1,430 assertions. Coverage includes private monotonic checkpoints, malformed/unauthorized references, missing intermediate history, control loss, message-body exclusion and deduplicated construction completion.
- Default service regression: 30 tests, 1,684 assertions pass; 20 live-only cases skip.
- Both-provider service cohort: two tests, 130 assertions. Paused acknowledgement, identical replay, older-device no-op, private projection, historical authorization and migration in both directions pass.
- Ordinary-player browser and lab cohort: nine tests pass in 1.3 minutes. Both encryption modes recover more than one history page, preserve the frozen period and reading position during a new tick, reload a held persisted command with the same UUID/payload, acknowledge one revision effect, restore focus, and retain the checkpoint after another reload. Another player retains their own baseline. Service-clock delivery is explicit emulator evidence, not hosted scheduler certification.
- Expanded shared gallery/lab: seven tests pass in 23.3 seconds, including blocked, preparing, pending, accepted, interrupted and recovered-period states. Keyboard activation and reduced-motion comparisons preserve outcomes. A further focused lab check passes at intermediate timeline positions, so preparation/blocked states persist during playback rather than appearing only at exact keyframes.
- Type checks and lint pass. [Phone, desktop, short and 4K captures](../ux/reviews/return-briefing/) were inspected locally; bounded reading and commitment controls remain contained. Independent acceptance remains open.

The retained failed runs exposed two implementation issues: cached history with a missing middle was treated as complete, and receipt handling restarted the campaign subscription and lost focus. The reader now requires contiguous authorized revisions and refreshes the period explicitly; only membership/create/migration receipts restart selection. A later real-mode test reloaded during key preparation before the command was persisted. The test now waits for the held transport frame, while the UI distinguishes preparation from awaiting acknowledgement and restores the original period from the persisted command. No assertion was removed. Construction regression timing follows the recorded start boundary plus four build ticks.

Automatic briefing entry remains incomplete. This slice does not add alliance eligibility, transfers, victory, notifications or rule approval. Existing campaigns without the recorded capability retain ordinary history access.

Compatible consumers deployed before command admission and RTDB rules. All six functions read back ACTIVE on Node 22 without test flags; deployed rules exactly match the checked-in JSON. This verifies configuration rollout, not hosted player acceptance. The current portrait-panel composition has contained controls; the denser illustrated report composition and mixed-category review against UX plate 11 remain follow-up work.
