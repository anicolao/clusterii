# Persisted ingress without a profile receipt

Reviewer03:53 requested bounded diagnosis of application run39917587574/job120294615054, source9f889ead990ee21728c1dab78de5e55fbc6b1e5d. **Cause remains unresolved. No production or test correction is supported by this evidence.** No browser/emulator execution, retry, timeout change, cleanup or baseline change was performed.

## Observed boundary

- `processProfile` registered at07:29:17.165UTC. The failed setup is the four concurrent authenticated identities in `fleet cancellation mock`, before campaign creation or browser execution.
- At07:31:26.486UTC, the existing20-second receipt assertion reported command228d51aa-ff86-4aec-b123-48c8334e613e for UID3C8fMO41Ali2AaZspaDj7c3UxMF5. RTDB ingress exists (HTTP200), digestbbce484ecfdcd1ba6bfc8ab15d645aa3ff3db61dd65ec10a7482055e6ea87d65. Profile and receipt both return404.
- The retained full failed-step log contains113 `Profile command entered` and113 matching-count `Profile command transaction settled` messages, zero `Profile command failed`, and no lifecycle message for the failed command. The adjacent three other commands enter at07:31:06.368–06.379 and settle by06.406. Another45 entry records occur after the timeout. Counts alone do not establish per-command delivery for the missing identity.
- The log shows one function-definition load, no reload or function-start failure, and shutdown only at07:32:13.602. There is no evidence here of the earlier compiler/emulator-reload confound. This does not certify complete worker/transport logs or exclude an unlogged failure.
- Final service result:34 passes,22 skips,1 failure. Browser execution is chained with `&&` and never started. Other successful concurrency cases do not explain this failure.

The parsed, bounded lifecycle summary and exact source/artifact metadata accompany this report. Original complete failed-step log remains `/tmp/cluster117-0333-application-failure.log` (SHA256df87ca054a697a3bb1157e514848930e7006dc7c39d5806967c318155601f1fc); it is not replaced by the summary.

## Handler, identity and retry audit

[processProfile](../../../functions/src/index.ts) uses v2 RTDB `onValueCreated` at `/profileCommands/{uid}/{commandId}`, with `retry: true`, in us-central1. Entry logging occurs before digest computation and any Firestore await. Digest/transaction exceptions produce a redacted failure-stage log and are rethrown. The current file is byte-identical to the failing source (SHA2568f1f06a06dab34c99244abc1c9ccc2d4f0ec2ac5c344e7c10f6dd2006ad089a4).

The transaction checks the exact receipt first; a replay returns without a new effect. Invalid envelope, missing key or session rejection creates a rejected receipt. A valid first profile atomically creates version1, head and accepted receipt. Validation rejection therefore is not a source-supported explanation for both missing documents. A thrown error before commit could leave both absent, but its entry/failure records are also absent here. Absence of those records is not proof the callback never ran: runtime dispatch and log transport are not captured at equivalent detail.

[saveIdentity/client/receipt](../../../tests/service.test.ts) await ordinary sign-in and `profileKey`, refresh developer claims, generate a unique command UUID, seal the payload and await one authenticated RTDB `set`. Receipt polling only reads; timeout diagnostics are read-only and do not retry writes or invoke the reducer. Existing RTDB rules require a new command path and matching authenticated owner. The persisted ingress excludes simple rejection of that write; it does not acknowledge downstream function delivery.

[Application workflow](../../../.github/workflows/verify.yml) finishes `bun run check` (including Functions TypeScript emission) before starting emulators. The service test imports TypeScript through Bun but contains no compiler subprocess/write loop. The captured run does not demonstrate a watcher restart during this failure.

Installed/locked firebase-tools15.25.0 source was inspected read-only: `getV2DatabaseApiAttributes` registers reference/type/topic/namespace; it does not put the production retry flag into that RTDB registration bundle. The background HTTP route submits work to `WorkQueue`; its caught work errors log at DEBUG and are not requeued in that class. `handleHttpsTrigger` routes to worker startup/submission before user code. These observations **do not establish an emulator bug or explain this command**, and do not establish whether the database emitter separately retries. Production `retry:true` alone cannot certify local replay after a delivery that has no recorded invocation.

## Precisely missing evidence and next inspection

The unresolved span is the persisted RTDB create → emitter delivery/event ID → Functions HTTP acceptance/worker dispatch → first user-handler log. Needed evidence is the matching database delivery attempt and result, Functions request acceptance/status, worker startup/error/queue records, and any retry or delayed delivery for this exact UID/UUID. Distinguishing no emission, failed delivery, delayed dispatch, pre-handler failure and lost logging requires that correlation; changing reducers, removing concurrency or increasing the20-second assertion would not establish it.

Artifact12486095865 (`browser-evidence`) remains available,48,059,405 compressed bytes. Workflow retains `database-debug.log` and `firestore-debug.log`, but not `firebase-debug.log` containing the inspected CLI DEBUG queue/request markers. Artifact contents have **not** been inspected: disk fell below both the2,359,296KiB capture gate and then the2GiB floor during this read-only work. No archive download/extraction was started. After adequate headroom, inspect the existing artifact's size/contents first, then only the relevant database delivery records; do not launch a new run. The absence of retained Functions DEBUG records may remain irrecoverable for this run. Avoid copying tokens, envelopes, keys or profile contents into diagnostic reports.

No new instrumentation-only slice or unchanged rerun is proposed. PR117's completed four-size lifecycle assertions remain scoped evidence, not a fix for this ingress failure. The32 waiting candidates, normal-motion visual, account/concurrency, Linux/KMS/hosted and release gates remain open; no merge or promotion.

## Later bounded inspection

Reviewer16:44 authorized resumed investigation after disk recovery. [Artifact inspection and the next HTTP-boundary diagnostic](../ingress-delivery-1644/README.md) retain the historical limits above while adding the target TRIGGERED audit and a namespace-scoped publisher reset. This is new evidence, not a retrospective claim that the original report inspected the artifact or established a cause.
