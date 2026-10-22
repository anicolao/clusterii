# Separate zero-science timing boundaries

Prompt100 requests retained-evidence diagnosis before another full run. No full run is planned. Original cb0dbe2 artifacts remain `/tmp/cluster-zero-science-bounded-partial`; original emulator log is `/tmp/cluster-zero-science-bounded-firestore.log`.

## Retained capture evidence

Large's first capture step expired at10044.6ms. Its trace reports bring-to-front1.1ms, mouse movement4841.8ms, captureReady67.8ms, geometry22.3ms and renderer inspection27.4ms. The first screenshot began4977.1ms after capture start and reports8846ms duration, continuing beyond the outer10s timeout. The subsequent page-closed evaluation follows cleanup. There was no completed two-frame stableImage comparison or pixel mismatch before the deadline. This is distinct from the earlier4ea71d9 unnecessary-scroll failure. It narrows the current boundary to pointer/screenshot delivery, not font/image readiness; it does not establish why Chromium took that time. Host load is still a hypothesis. No pointer clearing, loaded-asset, stability, geometry or exact-pixel assertion is removed.

## Retained settlement evidence and focused probe

Phone's initial100-tick harness completed19422.8ms, but later travel/combat expired30739.7ms. Short's initial100-tick harness expired30032.1ms. The retained Playwright trace records clock-setting and the outer harness but no boundaries for individual Node service batches/transactions. Firestore emulator logs contain startup/protocol messages, not correlated transaction completion durations. Those artifacts cannot attribute the delay to commit transport, reducer/crypto work or browser delivery.

`settlement-timing.ts` is test-only and opt-in through CLUSTER_SETTLEMENT_TIMING=1. Exact loopback demo guards fail closed. At most512 fixed events record monotonic span/transaction ordinals, elapsed times, attempts and read/write counts—never IDs, paths, keys, values, envelopes, identities or error contents. It delegates the original SDK transaction and callback, preserves options/results/rejections, restores methods, and counts write enqueue operations rather than inventing write acknowledgements. Transaction total minus callback time includes commit/retry/scheduling overhead; it must not be labeled pure network/write time. Read timing includes actual awaited SDK reads. Small synchronous log appends happen after the measured transaction completion to preserve evidence if a test deadline interrupts later work; probe overhead is not claimed to be zero.

One phone story generation is authorized as the discriminating case: original240s total,30s harness and10s capture budgets; at most220 ticks and14 captures. Every action, assertion, readiness check and pixel rule remains. This is a timing diagnostic, not four-size acceptance. Unit verification passes17 assertions for preservation/redaction/guards. No production instrumentation or bypass is shipped.

## PR98 publication

Original failed job120061090226 expected840e3f5 but servedHTTP404, retained `/tmp/cluster98-publish-failure-1640.log`. A later read-only `/pr98/revision.json?review=20261022T1640` request still returned404. No publication retry, relaxed check or current-preview claim. Existing Pages status will be inspected read-only; queue membership alone is not a causal diagnosis.
