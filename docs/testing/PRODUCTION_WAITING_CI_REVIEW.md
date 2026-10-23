# Production journey waiting compatibility

Reviewer04:43 requested a bounded correction on PR117. Run[39921283172](https://github.com/anicolao/clusterii/actions/runs/39921283172), exact head`ae54334b2a655c3e3780403486ae1040e1ab8f47`, passed35 service tests (22 skipped,0 failed,2511 assertions) and then failed one browser test (35 passed,3 skipped). This is separate from the unresolved missing-profile-ingress failure in39917587574.

Full failed-step log is retained at `/tmp/cluster117-0443-application-failure.log`, SHA256`56778156e841842044d5e1fb9c5476ca820a98f0e4c2e6a37f9f82e31cd9395b`. At08:38:30UTC, `production.spec.ts:15` calls `openGalaxyCommand("Economy")`; `galaxy-navigation.ts:138` cannot find `Galaxy commands` within its unchanged5,000ms assertion. No artifact download, trace replay or browser run was performed locally.

## Established phase and intent

Source puts this call immediately after four acknowledged joins, **before** the real quarter-hour wait and explicit `startScheduledCampaigns` delivery. Its old expectation, “Production begins fifteen minutes after home assignment,” explicitly describes the pre-home phase. The actual join reducer sets a full roster to `scheduled` with home null and startAt at the next tick boundary. The waiting/scheduled Galaxy branch correctly renders CampaignWaiting instead of the command dock. The helper therefore requests an unavailable pre-start control; the global helper is behaving correctly.

This phase/intent conclusion is supported by the exact failing call and reducer/control flow, not a newly inspected rendered trace. The failed capture/artifact remains uninspected under the disk gate. There is no evidence here warranting restoration of premature Economy controls or modification of helper visibility assertions.

## Bounded correction

The test now acknowledges the real four-seat waiting manifest and server-assignment status, records the displayed scheduled start, and asserts the absence of premature dock/Economy. After the original real-time boundary and actual Scheduler HTTP delivery, every player must see the existing scoped Roster/Began acknowledgement and the waiting view disappear before opening Economy. Each actual production schedule must be exactly fifteen minutes after the displayed start; `First production pending` remains required. The obsolete close of the never-opened pre-start Economy is removed.

The source suffix beginning with `openConstruction(pages[0], "Surface")` is byte-identical to the predecessor: construction reservation/cancellation, research selection/recovery, peer balances202.8, science1400, applied tick1, ledger, geometry, keyboard and reload assertions are preserved. Total33-minute deadline, both real quarter-hour waits, original5-second assertions, retries0, service delivery and all shared helpers are unchanged. No test was removed or skipped.

Prompt141 explicitly authorizes this legacy compatibility edit. Its prior hash`fe68bc9057fa91592d7d41f8c87548ef8301c060cee1adde314dd5d919eca27a` and review reference are preserved in a new `waitingCompatibility` record in the legacy manifest. This is a documented exception for this correction, **not illustrated migration or acceptance**. Existing feature-local004-waiting and003-science stories retain their separate scope and provenance; their pixels are unchanged.

## Verification boundary

Nix no-emit TypeScript validation of production.spec.ts plus galaxy-navigation.ts passed; story-policy validation passed. Logs: `/tmp/cluster117-production-compat-types.log` and `/tmp/cluster117-production-compat-policy.log`. Node24.18.0/Bun1.3.13 is local static scope, not pinned Linux execution. Diff whitespace check passed; downstream suffix byte equivalence was verified before the explicit manifest update.

No browser/emulator invocation, artifact download, unchanged rerun, deadline relaxation or baseline change. Disk fell to190,812KiB during source-only work, far below2,359,296KiB. Runtime correction remains unexecuted locally; full visual/release, normal-motion imagery, Linux/KMS/hosted and unrelated ingress-diagnosis gates remain open. No merge or promotion.
