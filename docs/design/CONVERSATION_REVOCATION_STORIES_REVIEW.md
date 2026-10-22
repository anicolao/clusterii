# Live conversation removal and retained history

Small successor to draft #70 (`feat/live-arrival-archive-stories`,417bb62). This extends the actual selected-history consent story with removal confirmation, acknowledged access revocation, a creator-only message during absence, former-member reload and keyboard return. It preserves the predecessor's ordinary player setup and assertions. Serialized former-member/outsider projections must exclude the new message; previously shared history remains available. Each accepted action increments the canonical revision once; reload does not. Existing procedural retry, drafts, re-invitation, managed-key and revocation checks remain unchanged.

This is test migration, not new gameplay behavior or rule approval. Four-size candidate review and exact verification pass locally: four journeys,100 captures in1.4 minutes at13939f3. The inherited #70 seven-pixel original failure remains unresolved; two negative telemetry reproductions do not close it. Full independent/Linux/hosted acceptance remains open. No merge.

## Linux evidence coordination

At417bb62232403a3a841245b2e6aabdd34f9701dc, #70 had no candidate label and queued story run39742635676 would skip generation. That specific queued run was cancelled, then the existing `baseline-candidates` label gate was enabled once. Replacement run39743227540 targets the same exact head and is queued. Older queued runs were not cancelled or duplicated manually. No subsequent source change is being pushed to #70 while this deliberate generation is outstanding. A green generation job still requires a successful candidate step and eligible artifact with matching provenance; failed verification images cannot be promoted. Remove the label after the generated evidence is reviewed/promoted, not before inspecting provenance.

Scoped #67 log triage (`/tmp/cluster67-0349-failure.log`) finds52 missing-baseline failures and three distinct phone pixel failures: chart keyboard orbit1066 pixels, scheduled-start second roster259 pixels, and selected-history return273 pixels. Remaining Error entries are cohort/orchestration exits. These are not all missing baselines or the known1994-pixel identity issue. The navigation baseline intentionally predates #68's correction; Linux candidate review must distinguish that change from the roster/consent failures. No baseline update or root-cause claim follows log-only inspection.

## Review evidence

[PR #71](https://github.com/anicolao/clusterii/pull/71), base draft #70 at417bb62. [Preview](https://anicolao.github.io/clusterii/pr71/) has not passed current-head serving verification. [Baseline review](../testing/CONVERSATION_REVOCATION_BASELINE_REVIEW.md) records40 new frames,59 unchanged predecessor frames and one explained287-pixel phone label propagation change. The generated stories under `docs/testing/stories/selected-history-consent/{phone,desktop,large,short}/darwin-arm64` contain all22 named steps and actual creator/former-member/outsider viewpoints.

Strict log `/tmp/cluster-revocation-exact.log`; retained evidence `/tmp/cluster-revocation-exact-results`. Svelte/types0 errors;28 policy checks pass. No service or production component changes; existing procedural regressions remain unmodified and were not rerun as evidence for new behavior. Actual command, canonical revision, projection privacy, history recovery, fixed-footer/bounded reading, keyboard and motion outcomes execute within the four stories.

The deliberated Linux run39743227540 remains queued; generation job119705315798 has no executed candidate step or artifact yet. No Linux promotion is claimed. Current-head CI, full independent review, managed-key/fault matrices and hosted acceptance remain open. Prior draft #70 and identity raster holds are unchanged.
