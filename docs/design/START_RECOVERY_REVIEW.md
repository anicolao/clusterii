# Scheduled start recovery

A failed campaign no longer blocks the other campaigns in a scheduler delivery. The worker scans scheduled heads in document-ID pages of 25, attempts every due campaign, and requests a retry after recording failures. The error reports only a count, never private state or provider error payloads. The next minute also discovers still-scheduled campaigns.

Start remains a single Firestore transaction: canonical history, private recipient views, membership summaries and phase change commit together. Concurrent deliveries and a lost completion acknowledgement observe the committed revision on retry. There is no separate claim to abandon for this one-transaction transition. Multi-step gameplay tick leases, bounded catch-up and account/key compromise recovery remain incomplete milestone 2 work.

The roster shows “Awaiting home assignment” after its scheduled time until the authoritative active view arrives. The saved seat and subscription remain intact. This display uses the device clock only to explain the wait; it cannot start a game or assign a home. Pause takes precedence. The gallery covers waiting, scheduled, overdue, paused and active states; the animation lab uses the same component and production start reducer for seekable scheduled → overdue → assigned playback with identical reduced-motion outcomes.

## Evidence

- Type checks and lint pass; 14 unit tests pass with 251 assertions.
- The first two-campaign service fault run passes 61 assertions. A deliberately corrupt canonical envelope prevents one start while the next succeeds. Restoring the envelope recovers the campaign. A test-local transaction wrapper throws after the real transaction commits, and concurrent repeat deliveries preserve that exact head and six-version history, distinct homes and each recipient's revision.
- The expanded service fixture creates 26 campaigns through authenticated commands to cross the 25-record query boundary. Final execution is pending.
- Five gallery/lab browser tests pass, including deterministic start playback, pause/seek/reset and four-size component captures.
- The ordinary UI journey is running: five independent commanders fill two campaigns, wait for the real UTC boundary, inspect the overdue roster at four sizes, then deliver the actual emulator scheduler HTTP event and recover their distinct assigned homes. Final captures and results are pending.

These are development scenarios under proposed rules. Fault injection models storage failure and a lost completion acknowledgement; it does not certify hosted process termination, Cloud Scheduler redelivery or production scale. Independent visual review and exact-head CI remain gates. Public campaigns remain closed.
