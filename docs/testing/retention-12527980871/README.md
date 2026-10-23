# Actual Linux commit/request timing — PR128

Original source8140935bb03da909b3f5d455b622689c498bb95a, story run40006959566, verify job120597205802. Failed, completed2026-10-23T19:47:39Z. Existing artifact12527980871 downloaded once:1,443,522,879 bytes, SHA2561d4d869fb45cc75f7d7b7e6e58a96a72e1d5db2151326dfa7754f46fd794a993, both match GitHub metadata. Original ZIP remains /tmp/cluster128-artifact-12527980871/artifact.zip; selected original files are preserved here, not failed images promoted as baselines.

Six actual timing files survived upload: zero-science and contextual-aftermath, desktop/large/short. All stop inside the first96-tick batch at the unchanged30-second harness deadline. Phone never reaches a story: collection fails `Cannot find package '@shared/crypto' imported from .../src/lib/campaign-history.ts`. There is no phone transaction evidence; do not count it as a settlement timeout. This collection failure is distinct from missing references/pixels and the six measured tick deadlines. Full cohort classification is not claimed here.

Medians below include only normal five-read/seventeen-write production transactions; lease-claim transaction is excluded. Counts are recorded transaction-finally events, not proof of a completed96 batch or every eventual post-timeout outcome. Each recorded production callback has one attempt, one commit call and one commit request, with no recorded commit/request rejection. The first lease claim completes its commit request in roughly6ms.

| Journey / viewport | Recorded production transactions | Callback ms | Commit ms | Commit request ms | Total ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| zero / desktop | 49 | 44.743 | 567.624 | 567.388 | 626.13 |
| zero / large | 51 | 41.254 | 558.361 | 558.207 | 598.421 |
| zero / short | 51 | 40.642 | 547.565 | 547.348 | 590.036 |
| aftermath / desktop | 46 | 42.614 | 605.491 | 605.318 | 650.447 |
| aftermath / large | 49 | 41.521 | 571.883 | 571.66 | 617.413 |
| aftermath / short | 48 | 40.253 | 581.85 | 581.688 | 622.83 |

This discriminates the earlier outside-callback envelope: most observed latency is inside the original Firestore `request("commit", ...)` promise, not callback work or argument/protobuf preparation preceding that request. Median commit-minus-request overhead is below0.3ms, while request medians are hundreds of milliseconds. The request includes SDK/RPC/emulator/server/event-loop scheduling; this is NOT wire latency or proof of which layer causes it. No production batching/lease/authorization change or deadline increase is justified by this measurement alone. Next useful evidence would correlate server receipt/response or transport spans with these same commits under the failing environment, preserving the exact request/results. No unchanged rerun launched.

The helper remains opt-in/test-only and forwards original receiver/arguments/results/errors; no payloads, credentials, document names or identity values appear in the timing records. Existing test coverage validates those boundaries. [Derived summary](timing-summary.json) preserves read/callback/commit/request/total medians and outside-envelope residuals.

Loader files also survive: pinned image824f1a…b321/config7e1178…c9a retained; image-native renderer-ldd resolves libraries, while Nix-host ldd missing-library diagnostics are retained separately. Runtime progress is not renderer/visual acceptance. Application result and broader Linux missing-baseline/pixel failures are separate gates. No promotion, merge, root-cause fix or release claim.
