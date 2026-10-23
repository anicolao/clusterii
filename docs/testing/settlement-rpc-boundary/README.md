# Commit transport boundary

Prompt169 delegates reviewer16:24's next diagnostic; meta checkpoints16:04/16:14/16:24 are retained. This child of PR131 preserves all science candidates/failures and the original PR128 run40006959566/artifact12527980871. No browser rerun, production optimization, baseline or budget change.

## Source evidence

Pinned Firestore7.11.6 `request()` calls the client pool, then the GAX client method and awaits its result. GAX's `commit()` supplies its existing request/options to the initialized native stub. grpc-js1.14.6 invokes the original unary callback on received status. The previous request duration therefore includes pre-RPC scheduling/GAX work and post-callback continuation, not just transport. [Source hashes](source-hashes.json) identify inspected installed files.

Emulator1.22.0's `StronglyConsistentReadWriteView.commit` calls `stateManager.toCommit`, then reads its clock, then updates rows. `commitHelper` uses the resulting `readAt` as commitTime, and also notifies listeners/reports events before returning. [Pinned JAR disassembly excerpts](emulator-boundaries.txt) show these boundaries. The returned timestamp is a storage-transition marker, **not** a server response timestamp or an RPC-receipt timestamp. It cannot by itself measure pure server processing time.

## Minimal probe

The existing opt-in transaction timer gains a second demo-only flag, `CLUSTER_SETTLEMENT_RPC_TIMING=1`. Before a batch/repeat it observes already initialized native stubs in the same Firestore client pool; it does not initialize a replacement transport, change credentials/options, intercept other methods or add RPCs. Each invocation retains the original receiver, request, metadata/options, returned call handle and original callback arguments/result. Restoration preserves own/prototype descriptors. Async-local transaction context prevents concurrent attribution swaps.

Each existing transaction record gains RPC counts, callback/failure counts, elapsed RPC duration and two derived durations around response.commitTime. No response contents, absolute server timestamp, documents, paths, identities, keys or errors are emitted. Missing/out-of-window markers are counted as invalid rather than clamped. Per-span Node event-loop delay uses a20ms histogram, recording sample count/max/mean only; the existing512-record cap remains. This is a coarse client scheduling signal, not server utilization. No tight polling or per-message log.

Only initialized clients are instrumented. A new client created during a span would appear as mismatched request/RPC coverage; do not interpret that transaction as fully observed. Compare single-attempt/single-request/single-RPC records first. Local and emulator wall clocks share a host in this deployment, but millisecond quantization/clock adjustments can invalidate the marker; those records do not support phase attribution.

## Discriminating interpretation

| Observation with complete coverage | Supported boundary; remaining ambiguity |
| --- | --- |
| Request duration greatly exceeds native RPC duration | Time outside the native call: pool/GAX or continuation scheduling; not all emulator commit execution. |
| RPC duration high, marker near the beginning | Delay after the emulator storage transition: row updates/listeners/events, response transport or client scheduling remain candidates. Not a claim that storage took the whole interval. |
| RPC duration high, marker near callback | Delay before storage transition: client dispatch/network/server queuing/validation/transaction coordination remain candidates. Not pure server CPU. |
| Large event-loop delay overlaps the batch | Client processing was delayed; aggregate histogram cannot assign that delay to one RPC or prove it is the sole cause. |
| Missing RPCs/invalid markers | Insufficient coverage; retain original timings without server attribution. |

## Validation and Linux observation

Offline established Nix: Java21.0.11, Node24.18.0, Bun1.3.13; declared Functions Node22 remains a limitation. Fresh disk39,682,944KiB exceeded2,359,296KiB gate. [Six focused tests/116 assertions](unit.log) pass: concurrent redacted attribution, exact arguments/results/errors, synchronous rejection, partial-install restoration, and a real pinned-library loopback gRPC call integrated through the existing transaction timer. That loopback fixture validates instrumentation, **not Firestore authorization or persistence**. The same six tests also pass with both CI flags inherited; legacy non-native fixtures explicitly scope the RPC flag off and restore it. Targeted TypeScript/format/shell checks and36 policy/four baseline-path checks pass. Static check reports0errors/one existing FleetRoute UI warning; four feature010 cases collect locally without launching browsers.

The child's ordinary PR-opening `stories (verify)` run is the one changed-source Linux observation: existing Nix renderer and original story budgets, both timing flags, no manual dispatch/rerun and no candidate-generation label. Its retained per-cohort JSONL and loader files remain the evidence source. PR131 run40018251102 was still in progress at inspection; its cold-phone collection proof is a separate gate. A successful collection or local RPC test does not establish settlement timing success.

Linux phase timings and cause are pending. No historical timeout, ingress, pixel, missing Linux reference, visual/hosted/KMS or release hold is closed by this change. No merge or baseline promotion.
