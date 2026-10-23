# Story verification after navigation and path corrections

Reviewer01:53 requested complete classification, not another run. Exact source is `3d0ef793d819d6d9ce5af8af8d24bd43278bcc3f`. [Application39902571706](https://github.com/anicolao/clusterii/actions/runs/39902571706) succeeded. [Stories39902571717](https://github.com/anicolao/clusterii/actions/runs/39902571717), verification job120247220930, failed. Application success is not visual acceptance.

## Complete first-failure classification

| Boundary | Predecessor39896097779 at699ca61 | Current39902571717 at3d0ef79 |
| --- | ---: | ---: |
| Literal `{configDir}` missing paths | 157 | 0 |
| Correctly resolved missing baseline/renderer | 8 | 104 |
| Pixel comparisons | 4 | 95 |
| Obsolete navigation first failures | 50 | 0 |
| Waiting phone rail height | 1 | 1 |
| Zero-science leased100-tick step30s deadline | 4 | 4 |
| Total failures | 224 | 204 |

Current phone, desktop, large and short each report51 failures,5 passes,2 skipped. Cohort durations are9.5,10.8,17.2,10.1 minutes respectively. Earlier navigation failures now reach later boundaries; that does not prove their remaining gameplay assertions pass.

All104 missing paths were checked against the exact committed Git tree: both PNG and sibling renderer.json are absent, with no literal braces. This is actual missing evidence, not a surviving path-template defect. Candidate existence, source compatibility and independent approval have not been established; this review does not authorize generation or promotion.

Of95 pixel failures,91 are legacy snapshot comparisons and4 are feature-local exact decoded-RGBA comparisons. Every one of the91 legacy expected PNGs and renderer manifests exists at3d0ef79; all manifests parse. The shared helper checks renderer equality before either comparison path, and the run reports no renderer mismatch. These are not missing-reference errors. Actual/expected/diff images still need independent examination; neither redesign nor the historical identity raster cause is presumed acceptable or causal.

The four zero-science failures remain the existing30-second leased progression boundary. No deadline or harness change, retry or claim of causality was made.

## Waiting rail production correction

The phone waiting-galaxy check requires a rail at most70px and measured111px. Source renders a second resource row even before an empire exists: Credits/Science placeholders and Next tick After start. Waiting/scheduled campaigns now omit that unavailable resource row. Active campaigns retain every resource field; Roster, Campaigns, Menu and development/rules disclosure remain present. Pre-start phone map, expanded inspector and acknowledgement offsets follow the compact rail. No height clipping or geometry assertion was introduced to hide overflow.

The original rail assertion remains unchanged. Nix static checks and lint pass; rendered height and composition are unverified. Active science still explicitly reports last-tick output, not the design's production rate. The current Orbit/Surface instruments, genuine layer Build/reservation/reload journey and normal-motion review remain open.

## Evidence and restart boundary

Original complete log: `/tmp/cluster115-0153-stories-failure.log`, SHA256 `6eeda4eece0230f368c0cd514b949597fcfbc0a51a5ea22242da2cc972647dfb`.

Per-failure classification and committed-path/manifest audit: `/tmp/cluster115-0153-stories-classification.json`, SHA256 `4fca64703e091fa08dd3bd8552a2242e0ab4d0d4025621393fd58e58b4bac2b2`. Run metadata and application result are retained beside it. No image artifacts were downloaded or removed.

Nix `/tmp/pantheon-nix-env` verified Java21.0.11, Node24.18.0 and Bun1.3.13. Node24 is not pinned CI Node22 evidence. Static logs: `/tmp/cluster115-0153-check.log` and `/tmp/cluster115-0153-lint.log`.

Disk measured1,264,492KiB, below the2,359,296KiB capture gate. No local browser/emulator/capture was launched. Resume only after measuring sufficient floor/headroom, checking owned ports4173/19099/19000/18080/15001/14400, serializing compilation and recording clean source/spec provenance. Preserve original budgets, exact RGBA and first failure. Independently review changed composition before promotion; do not use a broad CI rerun as diagnosis.

From the implementation worktree, preserve previous output before this bounded restart:

```sh
nix develop /tmp/pantheon-nix-env --command bun run --cwd functions build
nix develop /tmp/pantheon-nix-env --command sh -c 'CLUSTER_STORY_MODE=generate NODE_OPTIONS=--import=file:///Users/anicolao/projects/games/clusterii-conversation-history/tests/browser/story-helpers/emulator-catalogue-register.mjs bun x firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions "bunx playwright test --config playwright.stories.config.ts tests/e2e/002-galaxy/galaxy.spec.ts --max-failures=1"'
```

Existing candidate families and approved PNG/provenance bytes remain untouched. Linux visual evidence, mounted layer/recovery, normal motion, actual scene fidelity, privacy/concurrency, hosted/KMS/performance and full release gates remain open. No merge or baseline approval.
