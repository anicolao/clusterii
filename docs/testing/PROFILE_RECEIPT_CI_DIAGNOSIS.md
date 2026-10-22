# Profile receipt CI diagnosis — #85

Reviewer10:19 identified application job119864955566 (run39790501628), retained at /tmp/cluster85-1019-app.log. The fleet reorganization mock case timed out during saveIdentity, before its fleet assertions. Four profileKey calls completed at14:06:07UTC, but only three processProfile executions were logged before the20-second receipt timeout. The log does not identify the missing command, its persisted ingress, or profile head; it cannot establish a duplicate identity, a dropped emulator event, or a service reducer failure.

The isolated unchanged case passes locally58 assertions in5.41 seconds (/tmp/cluster85-profile-receipt-targeted.log). This negative reproduction does not fix or excuse CI. No broad rerun, timeout extension, direct reducer shortcut, fabricated receipt or write retry was added.

On the original timeout path only, the service test now collects read-only evidence from the exact loopback demo emulators: command UID/UUID, ingress HTTP status/existence/digest, profile HTTP status/revision and receipt HTTP status/result/digest. Keys, tokens, ciphertext and private identity content are excluded. Each diagnostic fetch has a1.5-second bound; the original20-second receipt deadline and failing result remain unchanged. Outside the configured loopback endpoints the collector reports unavailable rather than touching another environment.

A real service test observes absent ingress/head/receipt, writes one authenticated profile command, waits for its genuine accepted receipt, checks matching persisted command/receipt digests and revision1, then repeats only the reads and confirms no second effect. Combined with the unchanged affected reorganization case:2 pass/65 assertions in5.67 seconds (/tmp/cluster85-profile-diagnostics-test.log). Types pass. This validates diagnostics, not the cause of the historical missing receipt.

Next evidence: the normal updated #85 application CI, with this diagnostic on any recurrence. Inspect exact command existence/head/receipt plus ingress execution logs before choosing a repair. Propagate the diagnostic through #86/#87 while retaining all histories. The original CI finding remains open; do not label it a raster failure or close it from green local runs. The48MB CI artifact remains undownloaded under low disk headroom; no evidence was deleted. Reviewer10:29 source review and #84 Linux result classification remain in meta-prompts.md.

## October 22, 10:59 recurrence — #87

Application job119890976053, retained /tmp/cluster87-1059-app.log, fails market focus mock during profile setup, before any allocation assertion. At14:50:15.130–15.160UTC four profileKey handlers start and finish. At15.181/15.186/15.219 three processProfile executions begin and all finish by15.234. No fourth execution or handler error appears before the35.333 timeout. The preceding construction case completed at15.111; the following case begins only after this failure.

The new read-only diagnostic establishes:
- UID umelI4UTQUoOQRc31JaBxGz6ofQC, command4559a2bf-f655-4d0e-915b-aa55da53024c.
- Ingress exists (HTTP200), digest76b7d1fccdcebd107dc990f760eee592b7a72ece3747908c0392b5089a26929a.
- Profile head and receipt both HTTP404 at the unchanged20-second deadline.

Unlike the original fleet failure, persistence is now demonstrated. The runtime messages lack command IDs, so their three executions cannot be assigned individually to the four writes. There is no evidence here of a duplicate logical command, a rejected receipt, an exhausted transaction retry or a stalled fourth handler. An undelivered/undispatched event is a concrete hypothesis, not an established infrastructure cause.

### Lifecycle and error-path audit

Each test client has a unique app name, Google subject and command UUID. Market setup runs four independent client → developer entitlement → saveIdentity chains concurrently. saveIdentity awaits one authenticated RTDB set before polling. Clients are deleted only in afterAll; this failure occurs before that cleanup. No store reset, direct profile reducer delivery, service spy or write retry occurs in this setup. Earlier test spies operate on the test process's imported service objects, not the separate emulator worker, and restore in finally blocks.

processProfile enables event retry. Its transaction reads the receipt first and returns on an existing receipt, then reads head/key/session. Validation/conflict/session failures create a rejected receipt atomically. Valid input writes version, head and receipt in one transaction. Digest/dependency/transaction errors escape for trigger retry; corrupt previous history fails closed. For this new identity, absent head and receipt do not distinguish an unentered handler from a pre-commit failure. No production behavior change is justified from the retained log alone.

The application's artifact list retained firestore-debug.log, not database-debug.log or Firebase dispatcher diagnostics. Those omitted historical logs cannot be reconstructed. Existing failure files remain intact.

### Bounded diagnostic change and verification

processProfile now logs command entry, transaction settlement and failure stage, correlated by UID/command UUID/event ID; settlement also includes the request digest. It logs no envelope, key, token, profile content or dependency error message. Settlement means the transaction returned, including a previously existing receipt or rejected command; it is deliberately not labelled acceptance. Failure rethrows the original error and preserves retry behavior.

A new service case exercises four waves of four ordinary authenticated/developer-authorized profile writers, each with a single ingress write and the original20-second receipt deadline. It asserts accepted revision1, matching digest, persisted ingress/head/receipt and distinct command identities. The120-second aggregate test budget contains four independent waves; no per-command deadline was extended.

Local bounded cohort: unchanged market focus mock plus the new concurrent-ingress case passed2 tests/126 assertions in5.93 seconds, /tmp/cluster-profile-ingress-cohort.log. All16 wave commands correlate to exactly one entry and settlement with matching UID/UUID/digest; including market setup there are20 entries and20 settlements, no failure events (/tmp/cluster-profile-ingress-correlation.txt). Types/lint pass. Prior local emulator logs were preserved under /tmp/cluster-profile-before-1059 before execution.

This is a negative reproduction and validation of observability/concurrent semantics, not a repair or historical cause. No timeout extension, rewritten ingress, synthesized receipt, assertion weakening, broad CI rerun or large artifact download occurred. Publish first on #87 and merge its history into #88; research browser/privacy acceptance remains pending.

Next recurrence: match the exact failed UUID to entry/settlement/failure stage. An entry without settlement narrows work to digest/transaction and runtime termination; no entry narrows it to database delivery/dispatcher before handler invocation. Preserve delivery diagnostics in the failing environment before teardown if available. A green replacement run alone cannot close the original missing-receipt issue. Capture-dependent and hosted/release gates remain open.

Application CI now also retains database-debug.log in its existing always-uploaded emulator evidence artifact. This is the demo database runtime log, not raw client HTTP/network tracing; no new debug verbosity is enabled. No historical log is claimed recovered. Structured handler correlation remains visible in the job log.
