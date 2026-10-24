# Single-head recovery acceptance ledger

Target: existing PR140, `0f09db62776368702fc4df7d7a73aeeb39d98be8`. Preserved local repair: `aae30e1f`, plus this commit's typed exporter correction and read-only inventory. `source.json` pins exact overlay file hashes. The gameplay, renderer, browser stories, dependencies and Nix configuration have **zero diff** from frozen140. This branch has no PR. No target update, workflow dispatch, browser/emulator run or baseline promotion occurred.

Main remains documentation-only.51 is a historical limited/non-Nix checkpoint, not a deployable fallback. No fully accepted integrated game is available.

## Measured gates

All commands used `nix develop --offline --option substitute false --option max-jobs 0 /tmp/pantheon-nix-env --command …`. Fresh disk27,420,168KiB exceeded2,359,296KiB. Java21.0.11, Node24.18.0, Bun1.3.13; Functions' declared Node22 mismatch remains a limitation.

| Gate | Exact observation | Acceptance boundary |
| --- | --- | --- |
| Initial `bun run check` | Failed:26 errors in preserved exporter JavaScript, plus one existing FleetRoute accessibility warning. `gates.log` retained. | Newly introduced overlay typing defect; not a140 gameplay failure. Focused runtime tests alone missed integration typing. |
| Corrected `bun run check` | Exit0;0errors, same1warning. Unknown exceptions narrowed; decoder/aggregate and subprocess parameters annotated. | No disabling of checkJs, diagnostic change, deadline change or blanket `any`. Existing accessibility warning remains open. |
| `bun run lint` | Exit0. | Source checks, not visual acceptance. |
| `bun run test:story-policy` | Exit0:55 Node tests and4 no-browser baseline-path cases. | Includes actual >1MiB full-index acquisition, prepare/wait artifact fixtures, cold installed resolver, actual JFR acquisition/export and failure categories. Existing legacy migration gaps remain. |
| `bun run test` | Exit0:113 tests. | Reducer/component helpers, not mounted/service acceptance. |
| `PUBLIC_BASE_PATH=/clusterii/pr4 PUBLIC_EMULATORS=true bun run build` | Exit0. Functions tsc also completed in check. | Built application only; no emulator execution. |
| `bunx playwright test --config playwright.stories.config.ts --list` | Exit0:280 tests in58 files. | Collection after sync; no browser or assertions executed. Cold-alias regression uses isolated installed-resolver fixture in policy tests. |
| Reference inventory | All172 previously absent PNG paths still absent;1055 retained manifests inspected;0 automatically source-equivalent Linux candidates. | Conservative production/shared-input equivalence, not a claim all old images need regeneration. Dependency-specific equivalence can be reviewed; no failed actual is eligible. |
| Current-source review leads |76 Darwin originals, two families/four sizes at343eb590, unchanged production/spec at140; SHA256 inventory retained. | Independent review pending. Cannot fill Linux references. |
| Historical setup timeout | Still open; no new settlement execution. | Exporter local repair is not a settlement root-cause fix. |

`corrected-gates.log` and `integration.log` preserve complete outputs; command groups exited0. The JFR load was not repeated: this correction changes types/error narrowing, and the meaningful six exporter checks already run within the55-test policy gate. Prior realistic load remains separately preserved.

## Existing remote results, read once at this boundary

| PR/head | Application | Strict stories | Interpretation |
| --- | --- | --- | --- |
|138 b0dbfaad |40036503409 success |40036503402 failure; job120697178728 log retained/classified | Again172 missing68 pixel8 timeout first failures. No new behavior/geometry first-failure class; later checks masked. |
|139 117a1277 |40039674163 success |40039674130 running at inspection | No current strict conclusion. |
|140 0f09db62 |40042533180 running |40042533270 running | Target counts/acceptance unverified. |

Generation checks being green do not establish generated candidate evidence. No giant artifact download was made. The completed138 log is3,230,856 bytes, compressed here; classification reconciles62 first-failing stories across four viewports. The earlier137 inventory remains intact. Do not reinterpret these as248 distinct root defects.

## Reference work required before integrated execution

Read `REFERENCE_ELIGIBILITY.md` and compressed `reference-inventory-final.json.gz`. They distinguish:

- absent PNG/renderer at frozen source;
- retained generation with stale/migrated spec, changed production/shared dependencies, missing source object, incomplete originals or different platform;
- existing references with observed pixel differences, not assumed wrong or approved;
- behavior after a first failure, not yet certified;
- current-source Darwin families that can actually be submitted for independent review.

The inventory is read-only and deliberately conservative. It records original paths, source/spec hashes, full renderer metadata and changed inputs. It does not establish transitive independence of unrelated components or silently approve old candidates. Current screenshots require independent design comparison, with eligible matching Linux evidence before promotion.

## Next bounded execution, not dispatched

`LINUX_SETTLEMENT.md` records the single feature010/phone command, existing runtime and current access/launcher gaps. No whole-suite wrapper is an acceptable substitute. Obtain a bounded entry to the existing pinned Nix Linux renderer, preserve exact overlay identity and fail-fast outputs, then execute the original240s test/30s step/10s assertion budgets. First failure stops. Do not use candidate generation to bypass earlier reference failures. If a missing reference blocks before settlement, report that boundary and review the reference first.

Only after this and reference/behavior gates converge should one complete integrated run be started. Required logs are consolidated in this non-PR commit; no feature expansion, history rewrite, PR closure or cancellation of unique evidence.

Packaging: Git normalizes CRLF in `linux-store.log`; its original subprocess bytes are preserved separately in `linux-store-original.log.gz`. SHA256SUMS covers the committed normalized text and raw compressed original separately.
