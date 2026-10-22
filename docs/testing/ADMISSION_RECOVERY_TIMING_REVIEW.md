# Admission recovery timing

Prompt96 records the reviewer15:19 instruction. The two retained construction-feedback runs stop at the5s Choose your faction assertion, before reaching the Queue regression. Source and existing artifacts were inspected before any retry. No new browser run, instrumentation or recovery behavior change is included in this diagnosis.

| Existing trace | Create click (monotonic ms) | Heading wait begins | campaignKey request begins | Assertion ends |
| --- | ---: | ---: | ---: | ---: |
| Local before | 52824.399 | 52890.732 | 56279.980 | 57983.388 |
| Local after | 30295.011 | 30591.457 | 33275.702 | 35703.245 |

Evidence remains in `/tmp/cluster-queue-local-before-failure` and `/tmp/cluster-queue-local-after-result`. Extracted traces are `/tmp/cluster-admission-before-failure` and `/tmp/cluster-admission-after-result`; bounded offline snapshot correlation is `/tmp/cluster-admission-correlate.cjs` and `/tmp/cluster-admission-correlation.txt`. No envelope, key or identity values are logged in the correlation.

The after-run's last screencast frame at33307.546ms says Order acknowledged. Saving recovery state. That painted frame predates the final DOM snapshot at35706.111ms. The final snapshot instead contains the success status Campaign created. Choose your faction, the campaign URL and Recovering your campaign. It has no Choose your faction heading: the phrase appears only in status text. The before-run final DOM likewise reaches campaign recovery.

The source chain is receipt digest validation → callback → clearOrder → transaction complete → clear pending/busy → select → observeCampaign → campaignKey → either authorized nonmember result or member subscription/view. For campaign.create there is no conversation-draft cleanup. clearOrder resolves only from the orders readwrite transaction's oncomplete, after matching the complete immutable command and deleting it. Both traces issue campaignKey after that chain has progressed; this rejects the hypothesis that durable cleanup remains blocked at the final assertion. It does not measure the exact IndexedDB request/transaction duration, which these traces do not record.

Neither campaignKey request has a completed browser response in its trace (HAR time/status -1 at teardown). The newly created campaign has no seats yet: campaignKey should return `{ joined: false }`, then observeCampaign calls next(null) and clears loading. No private member-view subscription is expected before joining. The missing response therefore blocks this nonmember authorization result and faction selection; it is not evidence of a missing member projection. The demonstrated remaining boundary is authorization/view recovery after durable retirement, not historical persisted-but-unprocessed ingress. Earlier campaignSecurity requests return200 before the create click. Existing CLI execution-duration messages lack correlated browser receipt timestamps and do not establish where campaignKey response time was spent.

Do not clear pending early, bypass IndexedDB, extend the assertion deadline or describe this as infrastructure flakiness. No such changes were made. If a focused diagnostic execution becomes necessary, its discriminating hypothesis is post-delete campaignKey transport/response versus browser handling of the authorized nonmember result. Capture a bounded test-only timestamp sequence for order transaction/delete/complete (without keys or values), fixed UI status transitions and callable request/response metadata; preserve the original5s assertion and account fences. A clean pass alone cannot resolve these historical timings. Expensive capture families stay separate.

## Prompt97 bounded execution

The reviewer15:49 handoff requests one discriminating diagnostic. `tests/diagnostics/admission-timing.ts` is an explicitly non-acceptance standalone probe, not a new procedural acceptance spec or an illustrated-story migration exception. It uses ordinary emulator authentication, identity save and campaign creation with the original five-second faction-heading assertion. Production sources and account fences are unchanged. Only one creator is needed at this boundary; the original four-player procedural regression remains open.

The loopback-only browser probe records at most256 fixed event names/timestamps. Native IndexedDB calls retain arguments/results and transaction completion behavior; added listeners record only orders transaction/get/delete events. The fetch observer returns the original response, reads a clone asynchronously only to classify `joined:false`, and records no URL parameters, keys, values, identities, tokens or envelope contents. Fixed DOM state markers observe the resulting callback/UI transition rather than instrumenting the production callback. Clone parsing may finish after the SDK renders; it is not the callback timestamp.

One execution passed the unchanged5s assertion. [Redacted timing evidence](evidence/admission-timing-20261022.json): retirement transaction0.6ms; transaction completion→campaignKey request1.5ms; request→HTTP response459.4ms; response→faction heading1.3ms. The nonmember clone classification followed the heading by1.8ms. This is a passing negative reproduction, not a fix or explanation of either historical failure. No retry, deadline change, early pending release or baseline change occurred. Original Queue/recovery/shared/feedback holds remain.

Execution log: `/tmp/cluster-admission-timing-probe-execution.log`. An earlier launcher attempt stopped before browser execution because Java was absent from PATH (`/tmp/cluster-admission-timing-probe.log`); adding the existing Java21 path enabled the single execution. TypeScript no-emit check passed. No illustrated images or full-family capture run was requested or produced.

Restart (only for a new discriminating hypothesis, not retry-until-green): build Functions and the emulator-enabled app, serve the existing static build at4173, then:

```sh
PATH=/nix/store/vnycnlns50zkb0pns9rd7vhpv3m0fxc4-zulu-ca-jdk-21.0.8/bin:$PATH \
CLUSTER_ADMISSION_TIMING_OUTPUT=/tmp/cluster-admission-timing-next.json \
bunx firebase emulators:exec --project demo-clusterii --only auth,functions,firestore,database \
  'bun tests/diagnostics/admission-timing.ts'
```

No production admission change is justified by this execution. Next service scope is16 real leased research ticks, verifying persisted completion/overflow/following-tick effect and peer privacy; cap/zero-rate remain reducer-only until separately exercised through persistence.
