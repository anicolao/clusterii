# Candidate219 nonproduction integration audit

Base PR140: `d0804122e614b0b8c26351dee4593ec20cb6f731`. Frozen player-facing code:26d471d7; application execution began at2caac404. Later preparation changes only recovery orchestration, tests and records. No further player-facing expansion is included.

## Scope and review

The tracked inventory records every changed path and current byte hash. It includes accumulated evidence, original request records, prompt history and diagnostic code; a fast-forward includes that history rather than silently selecting only the four production files.

- Required `.github/workflows/verify.yml` and `stories.yml`, package/dependency inputs, production shared reducers/Functions, approved baseline paths and assets have no diff from PR140. Application and strict-story arms of `scripts/ci-in-renderer.sh` are unchanged. Recovery dispatch gains explicit case names only, with exact argument count and default rejection.
- Query/pair/selected-label workflows trigger only named request-file pushes on `investigate/jfr-export-load`, use contents:read, pinned ARM renderer, bounded jobs and always-upload artifacts. No PR/main trigger, deployment, secret use or auto-cancellation. Their requests are historical immutable records, not reusable instructions.
- Each request validator binds repository/event/branch/first attempt, exact request ID/case/mode, HEAD and immediate source parent, clean checkout and newly created file. Only request plus continuation may differ. Old files cannot be replayed by editing them or by documentation pushes. Normal FF to PR140's branch cannot match these recovery branch triggers.
- Query/retirement observation is opt-in diagnostic code. Only explicit recovery runners add the Java agent, after pinned emulator SHA validation. The wrapper invokes the original method with its original arguments, returns the original value and rethrows the original exception; it records bounded duration/count/outcome fields. There is no production import, broadcast suppression or transaction/deadline change. Diagnostic reports retain unavailable/cap failure and distinguish overlapping spans. This does not establish the unresolved timeout's cause.
- Contact/science story changes add actual keyboard resource navigation, ledger readings and measured overlay/selected-label assertions. Existing authenticated actions, acquired-history/force checks, reload, budget and zero-tolerance assertions remain. Their canonical-view corroboration is not upgraded to ordinary foreign-read proof.
- Unit changes exercise label obstacles; standalone retirement test is not added to required unit/service suites. Request/runner tests validate narrow scope and failure propagation. No check is removed or reclassified as passed.

##219 evidence batch

One new exact request will bind the preparation commit and an executor commit differing only by that request and its prompt continuation. The existing pinned renderer runs complete contact012 (96 images:24 each size) then live science003 (77 images:20 phone/19 each other size). Both use genuine services and their unchanged240s/30s/10s budgets, retries0/max-failures1 and update-snapshots=none. Each gets a fresh output directory and separately owned emulator lifecycle. Both outcomes are recorded even if one fails; any failure keeps the batch nonzero. Candidate generation is review evidence, never strict verification or promotion.

The new guarded workflow is branch/request-only and does not alter required checks. The old contact/science requests and originals remain intact. No request has been dispatched at this preparation boundary.

## Safe fast-forward boundary (not authorization to push PR140)

1. Verify the remote PR140 head is still exactly the base above and is an ancestor of the chosen clean recovery commit. Verify frozen production patch and unchanged required-check/reference diffs again at that exact commit.
2. Record completed full candidate application validation, the scoped orchestration checks, and both source-bound Linux family outcomes/manifests. A failed family must be investigated before claiming readiness.
3. Independently review complete image indexes against their contract/plates; generation alone is not design/reference approval. Keep approval status separate from code publication readiness.
4. Only after the requested integration review authorizes the update, a normal push of the selected descendant to `feat/admission-briefing-composition` is the history-preserving FF. No force/rebase/merge/newPR. PR140 is unchanged during219.

Open gates: timeout213, current strict reference/pixel backlog, ordinary foreign-read proof, full normal-motion/fidelity and hosted/KMS/release acceptance. The current PR140 application remains green and strict stories failed; local candidate results cannot relabel those checks.
