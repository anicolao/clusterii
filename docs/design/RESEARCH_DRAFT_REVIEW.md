# Research intent and milestone 5 audit

This successor to #87 fixes a concrete UX_DESIGN requirement: unsent research selection survives navigation within the accessible campaign. Previously CampaignResearch owned the selection exclusively, so closing the economy panel destroyed it. The route now owns account/campaign-scoped memory and passes it through the shared production components. No game rule, command payload, stored schema or encryption behavior changes.

An untouched selection follows the latest authoritative scheduled target. An edited selection survives updates, including acknowledgement of an older choice. Matching authority reconciles its baseline; subsequent updates can then follow authority until another edit. Membership loss, denied/missing views, developer-access loss, sign-out and account replacement clear protected intent. The existing session/selection generation checks run before private-view callbacks can restore it.

This is unsent route-instance memory, not cross-reload storage or durable command recovery. Closing the panel, opening another campaign and returning preserve choices while this route remains mounted and access remains valid. Reload and leaving the campaign route discard unsent choices. Accepted and uncertain commands retain the existing encrypted outbox and authoritative receipt semantics. Nothing submits automatically. No new discard control is introduced.

## Contract audit

| Requirement | Source/evidence | Remaining acceptance |
| --- | --- | --- |
| Authorized selection, stale revision, pause and queue bounds | shared/campaign.ts selectResearch; existing campaign reducer and both-mode service cases | Live illustrated submit/reject/retry migration; concurrency evidence must distinguish revision conflict from duplicate effect |
| Before/at/after cutoff | Reducer tests explicitly assert effective ticks 1, 2 and 5 | Named ordinary-player acknowledgement showing actual scheduled tick |
| Switching/overflow | produce applies due orders by sequence, retains unfinished progress, moves capped bank once; reducer cases assert ordered switches and retained balances | Live full switch/completion story; existing procedural production journey retained |
| Completion/effect timing | produce uses beginning-of-tick levels for production; scanning regression proves new level affects following acquisition | All-eight effect matrix and player-facing completion notices; precise next-effect/cost/estimate presentation remains incomplete |
| Repeat-safe settlement/privacy | Existing service cases assert original-ingress overwrite rejection, foreign view denial, private history/queue and repeated tick returning zero | Not a claim of comprehensive simultaneous-delivery coverage or hosted scheduler certification |
| Unsent navigation recovery | New route-owned research draft, bounded unit cases | Browser navigation/account/late-callback evidence pending disk gate |
| Durable interrupted command recovery | Existing shared outbox/receipt pipeline remains unchanged | Research-specific restored original target and same-command retry story remains open |

Development research coefficients and rules remain proposed, not approved by this audit. #87 fixes capability descriptions; it does not complete milestone 5.

## Verification and resource limit

Executed: Svelte/type checks and lint pass; tests/research-draft.test.ts plus tests/campaign.test.ts pass 45 tests / 1,065 assertions. Evidence: /tmp/cluster-research-draft-check.log, /tmp/cluster-research-draft-lint.log and /tmp/cluster-research-draft-unit.log. No service change warrants repeating the already recorded service cohort solely for this memory-state fix. Unit coverage is not browser authorization acceptance.

Free space measured 1,907,392 KiB, below the 2,097,152 KiB capture threshold. No captures, downloads, inherited baseline changes or broad CI reruns. Original failure/review artifacts remain intact. #85 run39797585710 application verification was still running at this boundary; no completed timeout evidence was available. Its green generation job is not candidate provenance.

## Next live story, once headroom permits

Read E2E_GUIDE.md before implementation. Use TestStepHelper and real saved identities with owner/peer views. Separate named steps:

1. Open research; choose recruiting by keyboard without submitting. Assert authoritative target/queue, receipts and peer projection unchanged.
2. Close economy, visit another accessible campaign, return and reopen. Assert recruiting restored and no command emitted; capture each viewport after font/image/motion readiness.
3. Submit through the real control; await the matching receipt UUID and scheduled target/tick. Reload and assert authority, not the former unsent draft, supplies the choice.
4. In a separate recovery case interrupt acknowledgement delivery; discover/retry the original command and assert one receipt/effect. Keep a later edited target unchanged when the older result arrives.
5. Switch before settlement; use explicitly labelled guarded scheduler/clock controls only for timing. Assert original retained progress, ordered application, completion overflow and next-tick effect in canonical and authorized views.
6. Exercise ordinary sign-out/account reuse and separately guarded membership loss/late view release; prove old intent cannot return. Keep administrative fault controls distinct from ordinary player actions.

Cover phone/desktop/large/short keyboard and reduced motion; generate candidates separately, review provenance and actual composition, then run strict zero-tolerance comparison. Preserve procedural assertions until equivalent stories exist. This plan is unexecuted. Independent visual/Linux/hosted and original raster gates remain open; no preview or release acceptance is claimed.
