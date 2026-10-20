# Development campaign maintenance

A developer who occupies a campaign seat can pause and resume that development game from Roster → Development controls. Pause is persistent, acknowledged and visible to every member. Chart inspection remains available; join, leave and scheduled start stop. The controls are the same production component exposed in the gallery. The animation lab exercises production reducer/feedback outcomes for pause and resumed recovery, including reduced motion.

Maintenance uses a separate authenticated, create-only encrypted ingress channel. The backend rechecks the developer claim and membership, compares the revision, and publishes canonical state, recipient projections and acknowledgement atomically. Concurrent maintenance requests cannot overwrite one another. Retries retain their command identity. Acknowledgement preserves the open dialog and restores its action focus.

Pause preserves the remaining scheduled interval: resume shifts a scheduled start timestamp by the authoritative paused duration. It does not move an already active campaign's recorded start. This freezes the campaign clock rather than consuming time during maintenance. All rule data remains under review; this development clock behavior does not approve gameplay balance or public roster rules.

This is the visible pause/resume barrier, not encryption migration. Existing-mode migration still requires an exclusive fenced lease, retained-history transformation, recipient-equivalence verification, atomic epoch activation and rollback. Public games remain closed. No migration control is displayed before that operation exists.

## Validation

The reducer checks frozen scheduling, admission rejection and unchanged holdings. Service tests verify member/developer authorization, conflicting pauses, denied overwrite, persisted pause state, denied admission and resume. The scheduled-start service test exercises pause, a scheduler delivery while paused, resume, and duplicate start delivery in both configured encryption modes. Browser journeys at phone, desktop, short desktop and 4K exercise acknowledged pause, reload, resume and keyboard focus restoration. Geometry covers the active dialog while its background is inert.

Hosted Google and hosted scheduler execution, independent rendered acceptance, real-mode lifecycle review and full migration remain open. Evidence and deployment status are recorded as completed checks arrive.

Local evidence: 11 unit/reducer tests (136 assertions), seven live-KMS service tests (183 assertions), and nine maintenance/gallery/lab browser tests pass. The service start worker is invoked directly against emulated state; this is not hosted Scheduler certification. Type and lint checks pass. Actual four-size paused captures are retained under `docs/ux/reviews/maintenance/`. Independent review is pending.

The targeted revocation test also passes (13 assertions): a stale client token cannot bypass the backend developer recheck, and refreshed revoked credentials are denied by ingress rules.
