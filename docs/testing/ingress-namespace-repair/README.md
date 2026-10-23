# Profile ingress observer namespace correction

Reviewer18:45 / Prompt178; child of PR1379de12d74. This repairs test instrumentation, not historical command delivery. PR137's original Linux post-marker observation is untouched.

## Demonstrated mismatch

The original observer accepted only `/functions/projects/demo-clusterii/triggers/us-central1-processProfile[-generation]`. Pinned RTDB4.11.2 GCFEmulatorPublisher's publish lambda passes `FunctionPayload.namespace()` into sendInEventLoop, and sendToFunctionsEmulator inserts that value into the URL's `projects` segment. This application's database namespace is `demo-clusterii-default-rtdb`. The inspected firebase-tools15.25.0 Functions listener accepts a wildcard project segment and resolves the trigger key; its numeric generation suffix is already supported. HttpBesieger preserves the supplied relative URI. Relevant disassembly is retained here.

A harmless Nix `bunx firebase emulators:exec --help` import probe confirmed NODE_OPTIONS import activation and presence of emulators:exec in argv. It did not start services or prove CI import execution. The first real local smoke then reported active observer, loopback listener,8 requests,0 matched,8 other-route requests, while the existing authenticated profile test passed. This isolates request filtering rather than absent activation or wrong local port for that run. The corrected matcher accepts the exact development project and its exact default namespace, not arbitrary projects/databases/functions.

The changed-source smoke reports8 requests,4 matched and4 unrelated routes. Four arrived/completed HTTP200 event-and-command tag pairs exactly equal the four handler-entry and transaction-settlement pairs. The original real service test passes16 assertions in1.90seconds: authenticated accepted profile receipt and bound digest, owner view decryption, replay rejection, concurrent CAS accepted/rejected receipts, invalid-envelope rejection, unauthorized foreign/private-key reads and direct-write denial. These are real commands/persistence/authorization; the observer never reads the body, rewrites headers, retries requests or supplies receipts.

This establishes the observer's namespace-filter defect and local integration correction. It does not resolve the historical missing ingress delivery, establish Linux correlation, or prove that every possible missing telemetry file has this cause.

## Explicit coverage, bounded output

The observer writes a separate fixed-schema `.status.json` immediately on installation. It reports active/coverage-limit, listener loopback/other-address/unobserved, and bounded counts for matching, other route, non-POST and non-loopback traffic. It contains no request URLs, headers, bodies, raw identities or keys. Request coverage writes stop after the configured limit plus one explicit limited status; event recording retains its existing cap. The artifact glob includes both status and events.

After successful application checks, `verify-profile-ingress-evidence.mjs` requires activation, observed loopback listener, positive matching coverage, and at least one tagged arrival/completed200 pair with identical sequence/event/command tags. Missing, malformed, unmatched or uncorrelated output cannot silently pass. A capped recording is explicitly reported, never claimed complete. This check certifies observer evidence, not client receipt semantics; those remain the unchanged application tests.

## Source and execution provenance

Established offline Nix only: Java21.0.11, Node24.18.0, Bun1.3.13. Functions declares Node22; retain this limitation. Fresh disk checks were above35millionKiB, versus required2,359,296KiB. All owned emulator ports were free. Functions compilation completed before emulator startup; no watcher-triggering build ran during either smoke. Each invocation used an outer180-second process bound and the existing60-second test/20-second receipt deadlines. No browser, full suite, hidden retry or deadline alteration.

Original diagnostics remain `/tmp/cluster-ingress-activation-smoke/`; corrected evidence remains `/tmp/cluster-ingress-namespace-smoke/`. Raw service/database logs include preexisting identity information and stay outside the committed diagnostic report; their hashes are retained in smoke-summary.json. Only fixed coverage, hashed event/command records and aggregated correlation are archived here. The first run's exact worktree hash was not captured: it used the original project-only filter plus status additions. It is preserved as diagnostic evidence, not an exact-source acceptance artifact.

Corrected smoke hashes were captured during execution after the initial manifest command assumed the wrong compiled entry path; no source changed between launch and hashing. The compiled entry path was read from functions/package.json. The observer and real service test still match those hashes. Subsequent changes only add the standalone evidence verifier/tests/workflow check; that verifier passes against the retained real smoke without another emulator execution. Test-source hashes distinguish those later unit changes.

Four focused instrumentation tests pass, including real loopback body/header/status preservation, namespace/foreign-route filtering, redaction/caps and missing/mismatched evidence rejection. All53 policy tests and4 baseline-path checks pass; static check passes; static check retains one existing FleetRoute warning. Original133 verified archive remains preserved with no observer output, and original137 profiling continues without rerun or cancellation.

| Dependency / acceptance boundary | Result |
| --- | --- |
| Base PR137 investigate/emulator-post-commit | Original Linux profile pending; untouched |
| Instrumentation unit/source |4 tests pass; source mismatch established |
| Real local profile integration |1 test,16 assertions;4 exact correlated event/command pairs |
| Historical delivery failure | Unresolved; successful smoke is not a cause fix |
| Current-head Linux application/preview | Pending publication and independent verification |
| Visual, baselines, KMS/hosted and release | No approval or scope change |

No merge, baseline promotion or gameplay-rule approval.
