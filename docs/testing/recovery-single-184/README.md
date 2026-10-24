# Single-case recovery entry and Linux reference review

Reviewer20:35 / Prompt184. Frozen target remains PR140 `0f09db62776368702fc4df7d7a73aeeb39d98be8`. This non-PR branch adds only recovery tooling, its local tests and evidence; no player source, story, renderer image, rules or baseline changes. The exporter repair overlay fromaae30e1f and typed correction fromf9ff09c2 remain separate from frozen140.

## Executable entry, not executed on Linux

The existing Nix renderer now accepts exactly:

```sh
nix run path:./nix#ci-renderer -- recovery feature010-phone
```

It uses the same pinned ARM image, private owned engine/containerd, loader checks, source mount and artifact ownership restoration. There is no new runtime installation, workflow or full-run dispatch. A future authorized invocation must use a fresh clean owned Linux checkout, free existing ports and sufficient disk, with `CLUSTER_STORY_FILTER`/`CLUSTER_STORY_COHORTS` unset and no generate mode. The current lack of dispatch/access is **not bypassed** by this command.

`scripts/recovery-settlement.mjs` allows exactly feature010/phone, forces verify/no updates/retries0/max-failures1, and leaves existing240s test/30s step/10s assertion budgets untouched. It records the clean source commit and renderer; serializes sync and Functions build; starts the real Firebase emulator command; and writes stories/traces into a fresh `ci-evidence/recovery-*` directory. Existing profile evidence causes refusal, not deletion/reuse. The outer launcher and inner dispatcher reject extra arguments. No grep, other project or full-suite fallback is accepted.

After Playwright exits, the inner process waits at most60s for the already-requested observer while the same owned emulators remain alive. This completion wait is outside all gameplay deadlines. A failed Playwright exit remains that exit even if profiling fails; a successful test with absent/unavailable diagnostics returns2, not timing acceptance. A not-reached observer is reported as not-requested. The observer itself keeps its35s recording and10s export bound. No command/transaction is retried or altered.

Local orchestration tests use controlled process/clock fixtures, **not service mocks or player acceptance**. Six tests cover exact argument/environment allowlists, an actual subprocess exit7, preparation order and short-circuit errors, post-test observer ordering,60s completion bound, unavailable/absent diagnostics, and actual shell rejection before engine ownership. The first extension accidentally inserted a function into the test's expected argument array; that local assertion failure is preserved in `orchestration.log`, corrected without changing production arguments. `local-gates.log` is earlier validation; `integration-final.log` is final type/policy validation. No browser/emulator case ran.

## Exact missing execution capability

Read-only GitHub API evidence is `workflows.jsonl`. Registered application/story workflows exist from PR activity, but current main contains only `.github/workflows/documentation.yml`. Neither the story nor application workflow defines `workflow_dispatch` in the stack. The only such declaration in this branch is `cleanup-previews.yml`, an unrelated destructive-purpose workflow absent from main; it must not be repurposed. No authorized dispatch can execute the bounded recovery branch today without a workflow/main capability change. No dispatch request was sent.

The existing local Nix Linux builder remains inaccessible to direct session use as recorded in step183. No SSH key was read/copied, permission changed, runtime installed or process cancelled. The next execution gate is an explicitly authorized bounded dispatch capability or an authorized existing interactive pinned-renderer session. **Do not launch the full story workflow to compensate.** Current140 stays frozen.

## Linux family eligibility progressed beyond the inventory

No new archive download. One small renderer manifest was read from the already verified PR137 artifact12539177641 (`test-results/stories/campaign-receipt-recovery/phone/linux-arm64/renderer.json`). Both candidate families below match its full renderer record except viewport: pinned image digest, Chromium149.0.7827.0, Playwright1.61.1, fonts, flags, UTC/en-US, DPR1 and reduced motion. Local Darwin's Chromium149.0.7827.55 is **not** substituted as the Linux criterion. This proves retained renderer compatibility, not current-source or visual acceptance.

| Family | Retained clean source / originals | Current source comparison | Review disposition |
| --- | --- | --- | --- |
| research-selection-lab |05a27a9607a8ca210590f497865b07550a4e8a99;4sizes/96 originals |Actual CampaignResearch adds exact next-effect/forecast and bounded reading, draft restoration, capability-aware text; story's history selector changes; shared lab label/Menu changes. |Renderer-compatible but source-incompatible. Not eligible for promotion to140. |
| production-ledger-lab |cbf67363a4575f127308d2190b03b404a9a72873;4sizes/48 originals |Story spec still matches, but actual CampaignEconomy changes pending schedule text/time markup and shared lab label/Menu changes. |Matching spec alone is insufficient; source-incompatible, no promotion. |

`linux-family-review.json` contains every original path/SHA256, per-viewport renderer, source/spec and match result. Two narrow production/component diffs are retained. Self-review of the first phone original in each family confirms the visibly retired `SAME OUTCOME · NONE` overline; research additionally shows the old reduced track description. These are concrete source/content differences, not an inferred renderer glitch or merely unrelated changed files. Only two phone originals were visually inspected here; no full144-image visual approval is claimed.

Next reference work is independent review of already current-source Darwin briefing families, and source-specific preparation of replacement Linux evidence for these proven changed families once a bounded generation capability is authorized. Preserve their old approved/reference/candidate history. The remaining28 retained Linux generation families have not received this narrower dependency review.172 absent references and other pixel/behavior/timing gates remain open. Inventory, matching renderer, or a passing generation job alone cannot close them.

All existing138–140 unique runs remain untouched. No new PR/feature, target push, baseline promotion, history rewrite, closure or merge.
