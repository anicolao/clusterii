# Original PR132 RPC observation

Original run40020084890, source3af727f1, completed failure. Artifact12533846891 downloaded once to `/tmp/cluster132-artifact-12533846891/artifact.zip`:1,723,763,985 bytes, SHA256 `f6cd9c142b5acd38ae1c76028ceb0b167ae543af18eff58f1110db626536a978`, both verified against GitHub metadata. Prompt174 explicitly prioritizes this evidence when complete. No rerun was launched.

All eight zero-science/aftermath timing files survived. Each stops in the first96-tick batch of its100-tick harness; no batch completion is recorded. The401 recorded five-read/seventeen-write transactions each have one attempt, one commit request, one native RPC, one callback, zero RPC failures, one valid storage marker and zero invalid markers. Lease-claim transactions are excluded from the table. Records are completed transaction observations before worker termination, not a claim that the entire batch completed.

| Journey / viewport | Records | Request ms | Native RPC ms | Call→storage marker ms | Marker→callback ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| zero / phone | 51 | 534.11 | 534.01 | 3.93 | 530.31 |
| zero / desktop | 49 | 564.92 | 564.80 | 4.26 | 561.17 |
| zero / large | 52 | 533.29 | 533.14 | 3.70 | 529.33 |
| zero / short | 53 | 529.09 | 528.99 | 3.83 | 525.09 |
| aftermath / phone | 50 | 560.21 | 560.12 | 3.64 | 556.44 |
| aftermath / desktop | 47 | 592.80 | 592.67 | 3.97 | 586.90 |
| aftermath / large | 49 | 569.10 | 568.93 | 3.58 | 565.31 |
| aftermath / short | 50 | 556.10 | 555.99 | 3.58 | 552.33 |

Values are independent medians, so column medians need not sum. [Derived summary](timing-summary.json) and original redacted JSONL are retained under selected/test-results/stories. Callback/application calculation medians remain about40–44ms. Request and native-RPC durations nearly coincide. Most observed delay follows the returned storage-transition marker, rather than preceding native dispatch or occurring in the application transaction callback.

This is a narrower boundary, **not a root cause**. The [pinned emulator disassembly](../settlement-rpc-boundary/emulator-boundaries.txt) places the marker before row updates, listener notification and event reporting; response transport and client callback scheduling also remain inside the measured remainder. The marker is neither RPC receipt nor response time and cannot measure pure server CPU. No event-loop end summaries survived timed-out worker termination; absence is not zero delay. Server post-marker phases versus response/client delivery remain unresolved. A future discriminating observation would need those boundaries; this task adds no speculative probe, production optimization, retries or deadline changes.

Loader/runtime files also survived under selected/ci-evidence/nix-renderer. Successful retention/runtime execution is separate from pixel acceptance. Original131's source-paired image review remains [separate](../pixel-review-131/README.md). No ingress-cause conclusion, baseline promotion, merge, hosted/KMS or release approval.
