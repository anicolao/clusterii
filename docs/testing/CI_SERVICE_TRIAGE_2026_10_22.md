# CI service and setup triage — 2026-10-22

PR #62 run39708780947 / job119594903701 has missing Linux candidate families and distinct setup/locator/service failures. They are not all missing-baseline or identity-raster failures. No broad rerun, deadline increase or baseline replacement is used to diagnose them.

The first non-baseline failure in the reported test sequence is large `history.story.spec.ts`: a single 30-second harness performs sign-in, identity save, campaign create/join and twelve acknowledged pause/resume commands. Its retained trace shows eight successful acknowledgement waits taking roughly 1.8–4.5 seconds each, alongside admission work, before the aggregate harness expires at 30,001ms. The final pause expectation is interrupted after 3,673ms; it did not exhaust its own ten-second assertion budget. This establishes an aggregate setup-budget failure, not a missing status selector or proof of failed authorization. The captured roster is present.

Artifact12400034154 was selectively extracted to `/tmp/cluster62-first-service-failure` (11,496,215 bytes transferred out of 1,332,701,975). Original reviewer logs remain `/tmp/cluster58-0008-failure.log` and `/tmp/cluster62-0008-failure.log`. Later #62 log entries include function socket hangups and identity/admission timeouts; the retained heap evidence below identifies a service-failure interval without attributing every locator failure to it. PR #65 implements separate named setup controls with unchanged acknowledgement and total-test deadlines; four local exact journeys pass against 42 unchanged captures. Linux verification remains a separate gate. Separately reviewed new Linux baseline promotion remains pending.

Local pause/catch-up generation has a separate 4K diagnostic failure: post-PNG identity-raster telemetry walked every page text node and repeated ancestor reads, taking 13,078ms in the browser (14,958ms end-to-end). It exceeded the existing ten-second capture budget. Telemetry now scopes to the identity panel and reports explicit traversal limits/truncation, with cached ancestor reads. All-screen geometry, font/image/motion readiness, unchanged capture budgets and exact pixels remain mandatory. Thirteen tooling tests pass, including before/after pixel equality. This does not prove the inherited Linux raster defect fixed or explain the local short identity retrieval timeout. Failure artifacts are retained in `/tmp/cluster-catchup-diagnostic-failure`.

## Retained Firestore exhaustion evidence

The same verification artifact contains a 239,937,693-byte Firestore log, selectively extracted with 3,107,607 bytes transferred. It records repeated WebChannel backlogs of 10,001 pending messages, followed by `java.lang.OutOfMemoryError: Java heap space` at 03:48:21 UTC and repeated heap failures through shutdown. The job log records Functions timing out after about 60 seconds, then multiple `profileKey` calls completing together after 18–59 seconds. This establishes emulator heap exhaustion during the service-failure interval; it does not yet establish why backchannels accumulate or certify a production fix. The earlier history aggregate-budget failure is independently supported by its trace.

Full Firestore evidence remains `/tmp/cluster62-first-service-failure/firestore-debug.log`. No service data, traces or user files were deleted. PR #64 bounds emulator lifetime to one viewport cohort, preserving all tests, failure artifacts and aggregate failure status. Eight local exact journeys pass against 72 unchanged captures. This mitigation does not establish the accumulation root cause or its Linux effectiveness. The completed #58 generation and its matching provenance are described below; no Linux family is promoted from a different head or failed verification output.

The 00:19 supervisory checkpoint also records #61 job119582164198 with 59 failures (`/tmp/cluster61-0018-failure.log`), including missing baselines and identity/admission timeouts. That job is not independently diagnosed here; it remains part of the same follow-up triage, not classified as raster-only.

## Completed #58 generation

Generation job119568677880 completed with 121 passes and 23 failures, including later identity/admission locators and socket hangups; `/tmp/cluster58-generation-review.log` is retained. Artifact12402018661 is 2,622,106,312 bytes. Bounded metadata extraction transferred 21,637,832 bytes without downloading the full artifact. The new fleet-reorganization family has passed phone/desktop/large narratives; short failed during identity setup and has no passed narrative.

Provenance identifies clean merge commit `d6885b03e796dc7b6b047e1d45d97da9c833a616`; its verified parents include run head `a6838a2eee3a2725da63a53d473379b3a2fb4ff0`. The generated spec SHA `8531a5bbb0d138362c4e87fa2b802ddf064353374fc8d6087551114c51e955c6` matches the unchanged current spec. Metadata is under `/tmp/cluster58-reorganization-candidates`. No new Linux image has been promoted from metadata alone. Separate rendered review and strict verification remain required, and generation failures are not classified as raster-only.

The short reorganization failure's error context shows “Retrieving your identity…” with no Commander name field. Its trace records a `profileKey` request beginning 04:42:34.282 UTC without a completed response/status when the ten-second readiness assertion ends. This corroborates a pending identity-service readiness failure rather than a wrong field label or pixel mismatch; it does not independently establish this job's resource root cause. Two trace/context files were extracted with 4,860,616 bytes transferred and retained in `/tmp/cluster58-reorganization-failure`.

Read-only publication status shows #63 and #64 publication runs cancelled in the shared queue, with #65 queued; no manual cancellation or duplicate rerun was issued. Their exact-head preview gates remain open.

## #61 preview 404

The reviewer’s 01:10 checkpoint is retained in `meta-prompts.md`; `/tmp/cluster61-preview-0109.log` shows publication of gh-pages commit5418930 followed by the unchanged ten-minute exact-head checker receiving HTTP404. Read-only API checks confirm `pr61/revision.json` exists in the published tree and both revision fields equal6504a4a. Pages build/deployment run39724569489 for full commit54189303257e8a3376190c301f21be4aa33027dd remains queued. The served preview is therefore not verified; no timeout/tolerance change or duplicate workflow retry was issued.

## Delivered 00:09 handoff reconciliation

The queued reviewer instruction is now recorded as Prompt 62, with supervisory history preserved through 01:20 Toronto. The existing retained trace, heap log and matching-head generation comparison above address its diagnosis request without repeating completed suites. Missing candidate families, aggregate setup timing and pending/failed service calls remain separate findings. New Linux candidates still require rendered review before promotion; inherited baselines and exact comparison remain unchanged. No broad rerun, timeout relaxation or merge was performed.

## Delivered 01:10 visual/publication handoff

Prompt 63 records the reviewer’s delegated finding. A fresh read-only check still reports Pages run39724569489 queued for commit54189303257e8a3376190c301f21be4aa33027dd, and the served `pr61/revision.json` still returns HTTP404. The retained published-tree revision and queued deployment distinguish publication from serving; exact-head acceptance remains blocked. No duplicate retry was launched while this deployment remains queued.

The phone Tupã/Tania Australis overlap remains an explicit rendered-UI defect in both observation review documents. This handoff does not approve full composition or change any baseline. Its resolution needs separately reviewed collision handling and affected captures; scoped observation-reading evidence remains distinct from visual acceptance.

## #65 publication follow-up, 05:50UTC

The reviewer’s01:49 checkpoint records #65 job119648365097 failing the exact757d423 revision check with HTTP404 at05:44UTC. Retained log: `/tmp/cluster65-publication-0149.log`. Read-only published-tree inspection confirms both revision fields are757d423c4d21397ca36ff9233c6741257a4df72a. Pages reports commitb38c5e13763c0d957bc3b2a152bd6a737de8905f building; its actual deployment run39728756222 is queued. Older #61 deployment39724569489 is now cancelled. These states explain an outstanding deployment boundary, not a verified preview. No manual cancellation, duplicate publication or relaxed assertion was issued.

Reviewer01:59 checkpoint: retained `/tmp/cluster65-0158-failure.log` reports29 passes and12 missing-Linux-baseline failures in each viewport,48 missing-image failures total. This run supports improved cohort/setup execution, not complete resource or raster certification. Generation remains queued; no failed verification image is eligible for promotion. The checkpoint is preserved in meta-prompts.md; matching-head generated candidates still require separate provenance/rendered review when available.

## Candidate job versus generated evidence, 06:30UTC

Read-only inspection of #64 generation job119643687700 shows success, but both Exact verification and Explicit baseline candidates steps were skipped. The workflow requires the baseline-candidates PR label for generation. Its run39724010454 exposes only the1,846,046,879-byte failed verification artifact12405503333; there are no generated candidates from this job to review or promote. Retained API evidence: `/tmp/cluster64-generation-step-status.json` and `/tmp/cluster64-artifact-status.json`. This corrects interpretation of the green job without rewriting the supervisory record. No failed actual image is promoted and no broad duplicate run is launched.

Reviewer02:19 evidence records115 passes,48 missing Linux images and the distinct1994-pixel short identity recurrence. These remain separate from service/resource acceptance. Reviewer02:29 records #66 publication HTTP404 for0666727 (`/tmp/cluster66-0228-preview.log`). Pages deployment39732471805 for eb7ae1a has successful build/report steps and a queued deploy step at06:30UTC. Exact-head previews remain unverified; no duplicate publication is launched. Disk headroom fluctuated to1.2GiB; no large artifact download or deletion of retained failures was attempted.
