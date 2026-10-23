# PR131 first-failure inventory

Reviewer17:36 / Prompt173. Source d27e3df6, run40018251102, job120635813926. This is a new classification of the retained complete compressed log in [the runtime archive](../ci-runtime-1706/131-current-job.log.gz), not a reclassification by assumption of older counts. No artifact download or browser rerun was needed.

| Cohort | Missing reviewed reference | Pixel mismatch | Behavior/locator | Geometry | Timeout | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| phone | 43 | 17 | 0 | 0 | 2 | 62 |
| desktop | 43 | 17 | 0 | 0 | 2 | 62 |
| large | 43 | 17 | 0 | 0 | 2 | 62 |
| short | 43 | 17 | 0 | 0 | 2 | 62 |
| Total | 172 | 68 | 0 | 0 | 8 | 248 |

These are62 first-failing stories repeated across four viewports, not248 independent bugs. Each cohort also reports5 passed and2 skipped. First failures mask later assertions; zero observed behavior/geometry failures is not proof of their absence later in the journeys.

The [complete inventory](first-failures.json) retains every named test/step and exact first error. All172 missing-reference paths resolve under the expected repository tests directories, contain no literal braces, and lack both the requested PNG and sibling renderer.json in the tested Git tree. This establishes missing reviewed source references, not permission to generate/promote substitutes. All68 pixel failures reached exact comparisons (legacy snapshot or feature-local decoded RGBA); none is relabeled an acceptable redesign or a known raster cause without image review.

The eight actionable runtime failures are the two100-tick harness steps in feature010 zero-science and feature011 contextual aftermath, in every viewport. Each hits its unchanged30-second step budget. The log alone does not identify the server/transport scheduling cause. PR132's original40020084890 is the existing discriminating observation; at the last check during this classification it remained in Exact verification. No speculative production correction, new instrumentation or duplicate run is justified from this inventory. In particular there is no observed new stale-selector regression to patch here.

Pre-story execution passes36 policy tests,4 path checks and the tooling suite; the explicit closed-page diagnostic is an intentional passing fault test, not a startup failure. All four cohorts collect69 tests. The prior alias-collection failure is absent. The orchestrator's final nonzero status follows the reported cohort failures and is not an additional independent bug. Original128 had no phone story execution and only six observed settlement timeouts; this run adds actual phone evidence and must not inherit that earlier denominator.

Reproduce offline in the established Nix environment:

```sh
nix develop --offline --option substitute false --option max-jobs 0 /tmp/pantheon-nix-env --command node scripts/classify-story-log.mjs docs/testing/ci-runtime-1706/131-current-job.log.gz d27e3df6
```

The classifier checks complete ordinal sequences and reconciles every cohort against its reported failure total, then checks missing paths against the actual source Git tree. An initial local inventory command exceeded Node's default Git-output buffer; it produced no classification, changed no evidence, and was corrected with a bounded16MiB tests-only tree read. This is offline tooling, not a test deadline change.

Java21.0.11, Node24.18.0 and Bun1.3.13 verified in offline Nix; declared Functions Node22 remains a local limitation. Fresh disk46,356,568KiB exceeded the2,359,296KiB gate. No cleanup, baseline change, preview certification, merge or release approval. Original132 RPC artifact analysis remains the immediate next evidence priority when available; all independent visual/Linux/hosted/KMS and ingress holds remain open.
