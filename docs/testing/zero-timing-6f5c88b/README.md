# Isolated settlement timing attempt

The user requested diagnosis of the100-tick30s failures in story run39931091215. Source review and retained older traces identify only the outer harness timeout; the earlier opt-in timing probe failed admission before recording any transaction. No cause or deadline change is supported by those artifacts.

One current-source phone diagnostic at clean6f5c88b enabled the existing bounded redacted `settlementTiming` wrapper, retaining240s total/30s step/10s assertions and captures,220-tick maximum, retries0/max-failures1. It delegates real lease/transaction semantics without altering state/results. Functions compilation completed before owned emulator startup inside established Nix. The checked ports4173/19099/19000/18080/15001/14400 were free; disk21,282,032KiB exceeded2,359,296 gate.

**This attempt never reached the browser or settlement.** Firestore exited1 while initializing its HTTP server: `java.net.BindException: Address already in use`. Exact original startup and Java stack logs are retained alongside checksums/spec provenance. Post-failure read-only listener inspection on18080/9152/15001 returned no listener. No conflicting owner/port was identified, no unrelated process was killed or restarted, and no unchanged rerun occurred. Other unrelated emulator processes were observed and left untouched; their existence is not evidence of causation.

There are zero player journeys, zero ticks, zero captures and no timing JSONL from this invocation. This is a new emulator-start boundary, not reproduction or resolution of the historical100-tick timeout, nor missing profile ingress evidence. The legacy zero-science administrative projection reader also must not be represented as ordinary-player authorization evidence.

Next evidence needed: establish the exact startup listener/socket ownership at launch, then a separately bounded single timing invocation that reaches the unchanged100-tick batch and records existing clock/canonical/transaction/commit-overhead spans. Transaction total minus callback time includes retries/scheduling and must not be called pure network time. Preserve the failed CI trace and original budgets; do not infer root cause from a later pass.

The preserved invocation, **not automatically rerun**, is:

```sh
nix develop /tmp/pantheon-nix-env --command sh -c '
  bun run --cwd functions build &&
  CLUSTER_SETTLEMENT_TIMING=1 CLUSTER_STORY_MODE=generate \
  NODE_OPTIONS="--import=$PWD/tests/browser/story-helpers/emulator-catalogue-register.mjs" \
  bunx firebase emulators:exec --project demo-clusterii \
    --only auth,database,firestore,functions \
    "bunx playwright test --config playwright.stories.config.ts tests/browser/zero-science.story.spec.ts --project=phone --max-failures=1"
'
```

Fresh disk/owned-port preflight and preservation of existing test-results/emulator logs are required before a future invocation. Node24 locally versus declared CI Node22, Linux rendering, hosted Scheduler/KMS and full release remain explicit limitations.
