# Cold story collection

Reviewer checkpoints 2026-10-23 16:04 and 16:14 identify the first phone collection failure as a separate boundary from the settlement deadline. This correction follows Prompt168; the preceding science evidence remains source-paired and unpromoted.

Original PR128 source8140935b, run40006959566, failed phone collection with `Cannot find package '@shared/crypto'` from `src/lib/campaign-history.ts`. The original log and artifact12527980871 remain preserved in [retained evidence](../testing/retention-12527980871/README.md). No phone settlement spans exist in that run.

The root tsconfig inherits `.svelte-kit/tsconfig.json`; Svelte generates the `@shared` paths there. The runner previously launched Playwright before generating that file. Playwright1.61.1 reads and caches TypeScript configuration before starting the Vite web server. Generation by that later build cannot repair the same process's cached missing aliases. Later viewport processes can see the generated file, consistent with the retained run's successful subsequent collection.

`run-stories.mjs` now awaits `svelte-kit sync` before the Functions build and before any emulator/Playwright cohort. A failed sync stops execution. No alias, renderer, service result, capture threshold, deadline or baseline changes.

The no-browser regression uses the installed pinned Playwright resolver with an isolated copy of the project's root tsconfig. It proves that late generated paths remain unresolved in the same process and that generation before its first read resolves the real fixture module. A runner-order guard requires the awaited sync before build/launch. Two tests pass under the established offline Nix shell (Node24.18.0, Bun1.3.13, Java21.0.11). The isolated probe preceding this correction is retained in [science evidence](../testing/science-ledger-motion/cold-config-diagnosis.json).

This supports the configuration ordering correction. Linux execution of the corrected runner remains pending; no unchanged browser or CI rerun was requested. It does not explain the separate roughly550–605ms Firestore commit-request durations, historical profile ingress, pixels or missing reviewed Linux references. Visual, hosted/KMS and release gates remain open.
