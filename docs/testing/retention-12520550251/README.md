# Verified Linux retention and settlement boundary

Existing artifact12520550251 was retrieved once to `/tmp/cluster124-artifact-12520550251/artifact.zip`. The originally launched download finished before the14:24 continuation; it was polled, not restarted. Exact1,658,663,863-byte size and SHA-256 `817556447e14a605967ebf2a2a1f3a35ca3afbc4fc63fadf6286b18b2265b558` match GitHub artifact metadata. Free space58,662,152KiB before download and57,000,112KiB after, above2,359,296 gate. Cached offline/no-substitute/max-jobs0 Nix commands used; Java21.0.11, Node24.18.0, Bun1.3.13. No build/browser/emulator/unchanged rerun or baseline change.

Original run39987470893/job120530278352 at9a3de84a failed its player stories but uploaded successfully. Original selected loader/timing files here are byte copies from that verified ZIP; traces and full cohort logs remain in the original ZIP and selected/tmp storage. The complete ZIP is deliberately not committed. `selected-SHA256SUMS` covers these retained extracts and derived review files, separately from the original ZIP hash.

## Loader evidence

`renderer/image-identity.txt` matches both locked ARM digest824f1a…b321 and config7e1178…c9a in nix/renderer.nix. Browser path is `/ms-playwright/chromium-1228/chrome-linux/chrome`. `renderer/nix-ldd.txt` uses Nix glibc and reports unresolved browser libraries; `renderer/renderer-ldd.txt` resolves the image-native libraries without “not found”. The two probes are not equivalent successes. They confirm why the retained pinned image-native loader boundary matters; no renderer/library/baseline change is warranted by this evidence. Engine reports aarch64, overlay2,4CPUs/15.57GiB; this environment metadata does not establish a timing cause.

The diagnostics survived Playwright output cleanup under ci-evidence and were actually present/readable in the uploaded archive. The root-owned cohort upload failure from the earlier run is no longer blocking retrieval. This is scoped retention evidence, not visual, managed-key or release approval.

## Actual failed100-tick boundary

| Viewport | Recorded transaction calls | Median read ms | Median callback ms | Median total ms | Sum outside callback ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone |44|29.86|46.93|697.02|28281.39|
| desktop |52|22.57|41.74|594.94|28603.56|
| large |53|21.21|40.31|578.07|28481.38|
| short |55|20.92|39.87|562.49|28670.96|

Exact original events and derived statistics are retained in timing/ and timing-summary.json. All recorded callback attempt counts are1. Canonical reads take8.97–14.13ms; both browser-clock calls together6.12–9.79ms. Each first batch starts and never records completion, failure or repeat before worker termination. The30s step expires before the first96-tick batch finishes. Transaction instrumentation emits in finally, so recorded calls are not by themselves a count of acknowledged committed ticks; trailing events can occur during timeout teardown. No100-tick completion, repeat delivery, subsequent UI or privacy assertion is certified by this failed run.

Trace wall-time correlation in trace-log-boundaries.json locates the harness at16:48:27.552(phone),17:02:33.485(desktop),17:21:06.696(large),17:33:24.971(short)UTC, duration30000.42–30002.10ms. Matching cohort Firestore-log windows (one-second boundary allowance) contain only INFO routing notices, no warning/error. Connection-reset warnings elsewhere in the full cohort are not evidence of this timeout's cause.

The measured bottleneck is the transaction envelope outside its callback, not the measured clock update/canonical read. Current spans combine SDK setup/commit serialization, RPC/server processing and event-loop scheduling into that residual. They do not prove commit RPC itself, emulator storage, host load, retries or encryption is the cause. Callback attempt1 rules out callback-retry accumulation in these recorded calls, not lower-level transport retry. No production or timeout change is justified yet.

The smallest discriminating next boundary is a test-only span around the original SDK transaction commit/write-batch request and response, preserving arguments/results and recording only duration/count/outcome, correlated with server-side RPC timing if available. Do not rerun unchanged or widen the30s step. A local passing run cannot explain this Linux boundary. No new probe is launched in this review.

## Science archive

[Original0077be54 four-size science candidates](../../../tests/e2e/003-science/stories/candidates-0077be54/README.md) are now archived after67 original file hashes and all four clean/source/spec manifests verified. All24 PNGs are byte-identical to retained originals. No packaging rerun. Reviewer13:02 desktop010 sample remains scoped, not full24-image approval. Original disk-block report and failures are preserved.

No merge, baseline promotion, rule approval, monitor change or release certification. Linux missing references/pixels, historical ingress, transaction root cause, full visual/normal-motion/hosted/KMS gates remain open.
