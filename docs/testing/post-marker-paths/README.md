# Post-marker investigation and bounded observation

Source: child of PR136 `2489e44f`; reviewer handoffs18:06/18:16, checkpoints18:09/18:24. This is diagnostic evidence, not a production fix or acceptance. Original PR132 run40020084890 remains the measured failure. Its 401 complete single-attempt records place median525–587ms between the storage timestamp and callback; that interval includes server work, transport and client scheduling.

## Pinned implementation

Inspected with Nix Java21 `javap -c -p` against cloud-firestore-emulator-v1.22.0.jar, SHA256 `9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c`. Adjacent text files retain the inspected methods; earlier storage-marker evidence is in ../settlement-rpc-boundary/emulator-boundaries.txt.

After the storage timestamp, row application updates entity history and the concurrent map. Commit helper then notifies listeners, ends the commit, reports events, constructs the response and delegates gRPC onNext/onCompleted. No fixed500ms sleep appears in these inspected methods.

ListenStreamManager.notifyListeners is synchronized. Document and query listeners synchronously perform snapshot reads/queries; snapshotRead invokes rules authorization. Listener registration can waitForOngoingWrites using Object.wait, but that is not a fixed wait in notifyListeners. Monitor contention and snapshot/rules CPU remain possible.

EventManager evaluates matching rules and constructs payloads synchronously. FunctionsEmulatorEventPublisher submits HTTP delivery with Executor.execute. CloudFirestore constructs a ThreadPoolExecutor with core0/max4/60-second keepalive and a LinkedBlockingQueue; this is not a direct executor. The HTTP execution is inside its lambda, with no caller join/get. Consequently synchronous waiting for Functions HTTP response is unsupported by this path. Event evaluation/serialization before submission remains possible. Profile command ingress uses RTDB onValueCreated, not these Firestore document events.

Whole-cohort Netty connection-reset warnings cannot be linked to individual commit intervals: retained timing rows lack absolute correlation identifiers. Native RPC observations have one callback and no RPC failures. Neither warnings nor thread-pool configuration establish causality.

## One discriminating observation

The first real Linux settlement batch claims one run-wide observer. Policy/tool fixtures have the flag unset so they cannot consume the claim. It checks demo project, loopback port18080, exactly one process and the pinned JAR digest before attaching. No lease, transaction arguments/results, authorization, deadlines or retries change.

The checked-in JFC records execution samples every20ms and monitor/park events at10ms threshold for35seconds, configured4MiB. A detached observer waits for completion and exports only fixed event/phase counts and aggregate durations. Nix jfr help confirms a default stack depth of5; the exporter explicitly reads32 frames to retain surrounding listener/event context, with a64MiB JSON-output bound. Deeper frames remain truncated and a buffer/parse failure is explicit unavailable/parse. Raw JFR is disposable scratch, never uploaded: it can contain JVM/thread metadata. Exported unavailable reasons are guard, target, jar, attach, recording and parse; observer spawning failure also reports attach. A remaining recording status is incomplete evidence, not success. Startup/attach elapsed time includes guard/hash work and is not pure attach latency.

| Hypothesis | Discriminating result | Limit |
| --- | --- | --- |
| Row application consumes CPU | Execution samples concentrated in row-application | Sampling does not time an individual transaction. |
| Listener snapshot/rules CPU | Samples in listener-query, listener-notification or security-rules-evaluation | Work from all emulator threads is included. |
| Listener/commit lock contention | Monitor-enter or park evidence with listener/emulator stacks | Concurrent waits overlap; totals cannot be summed as wall time. |
| Event evaluation/payload work | Samples in event-evaluation-and-payload | Background async delivery is separately categorized. |
| Server idle while transport/client delays | Sparse relevant server CPU/wait evidence while native delay recurs | Negative sampling is not proof of client cause; transport/client boundary remains unresolved. JVM pauses/OS scheduling are not exhaustively captured by this configuration. |

Stack categories describe observed frames, not mutually exclusive causal phases. Aggregate samples/waits include all emulator threads and cannot assign525–587ms to an individual commit. The window can include later setup if a worker times out. A low-count or unavailable recording does not resolve cause. Disassembly establishes possible control flow, not runtime lock ownership, CPU cost or network scheduling; this is why one observation is needed.

## Validation and limits

The disposable Nix Java fixture exercises the actual jcmd JFR.start command, checked-in .jfc, completed recording and shared jfr JSON exporter. It verifies positive ThreadPark counts/duration and fixed-category output without fixture metadata. A separate Recording-API fixture validates export. Guard coverage rejects an unrelated host. Four focused tests pass. Existing six settlement/RPC tests retain116 assertions. Static check reports0errors and one existing FleetRoute warning. Full story policy/path checks pass:52 policy tests and4 path cases (retained log).

The acquisition fixture runs on local Darwin Nix Java21, not the Linux emulator. Linux /proc acquisition and the live emulator profile remain pending the single changed-source workflow observation. No browser/emulator retry was run locally. Node24 versus Functions declared22 remains a limitation.

## Existing CI and artifact follow-up

PR136 application40030642849 and stories40030642958 both pass Identify matching verification inputs and enter actual checks. This establishes preparation recovery only; full results remain pending at inspection.

PR133 application40022816686 succeeded, separate from failed story40022816635. The ingress observer is enabled only in application, so story evidence cannot certify it. Application artifact12533224790 was downloaded once and verified:452638678bytes, SHA256 ce15954327d0a2ce4324cee5c3dfd0bbe3dfa33f2a672014a407bea3527910c7, retained at /tmp/cluster133-ingress-12533224790/artifact.zip. The complete inventory contains no profile-ingress.jsonl despite the workflow upload path. The retained application log has171 handler entries and171 transaction-settled records, zero handler failures and zero diagnostic-unavailable warnings. No HTTP correlation can be claimed. See ingress-133-summary.json and inventory.

The observer writes only on a matched request; it has no initialized/guard/unmatched-request marker. Thus absence cannot distinguish import/install failure, unmatched request or retention omission. Pinned source confirms the background route and numeric trigger-generation suffix are supported, but this does not prove that the runtime hook installed or matched. No source-supported production fault or historical cause follows. The precise next instrumentation boundary is installation versus request filtering/retention; no additional emulator/browser run or observer modification was made in this slice. Raw application log remains /tmp/cluster133-application-40022816686.log with digest in summary.

The separately retrieved story artifact12533829000 is1723633471bytes with verified SHA256 f5feedb0952f1b65454ed3e6ff5b10ae8dac4d803c6aeb5bbc1edb0b000266a2, preserved at /tmp/cluster133-artifact-12533829000/artifact.zip. It was retrieved before distinguishing observer workflow scope; no duplicate download. A first local hash assertion contained a transcription error in the expected string; computed digest matches API metadata.

All visual, historical ingress/timeout, Linux reference, KMS/hosted and release gates remain open. No baseline promotion or merge.

## Dependency and acceptance table

| Boundary | Evidence | Status |
| --- | --- | --- |
| Predecessor PR136 / fix/verification-index-buffer | Both live input-identification steps succeeded | Preparation recovered; full checks pending |
| Actual recorder acquisition | Nix Java21 jcmd + checked-in JFC + completed parsed events | Local fixture passed; Linux target attach pending |
| Original132 delay | Native post-marker remainder525–587ms | Cause unresolved |
| Original133 ingress | Application artifact digest verified; observer file absent | HTTP correlation unavailable; historical cause unresolved |
| Preview | No player-facing production change | Child current-head publication not yet verified |

No full player visual, baseline, managed encryption, hosted or release acceptance follows from this diagnostic slice.
