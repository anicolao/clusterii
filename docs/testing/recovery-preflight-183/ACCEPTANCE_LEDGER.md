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

Step184: [bounded entry and narrowed Linux family review](../recovery-single-184/README.md) implements the missing single-case launcher with local orchestration checks. Execution remains blocked on an authorized dispatch/session; no full run substituted. Two retained Linux families now have confirmed renderer compatibility but concrete source/content incompatibility.

## Recovery overlay update — reviewer21:25,2026-10-23

Earlier tables above are preserved snapshots, not assertions that the later overlay has zero source diff. Frozen140 remains0f09db62. Current executed recovery overlay59d9ba374edbaaf23e423f5f3f4b0c360136f623 adds the measured gallery layout correction and narrowly bound Linux request; it does not update140 or establish integrated green.

| Boundary | Exact evidence | Status |
| --- | --- | --- |
| Original140 large gallery/lab capture | Before Linux40042533180 and locala64947a6 fail; after localfd435caa passes20.6s and pinned Linux40049852223 passes32.8s. Original spec hash b2833ba4… unchanged;3840×2160/45s/fullPage and all assertions retained. | Scoped capture blocker resolved on recovery overlay. |
| Actual Linux size and contents |3840×37385 gallery,3840×2160 lab;525 controls,152 decoded images. Same correction reduced prior measured165992px gallery. | Artifact12542539892 verified once by68,074,608byte size/API SHA256/ZIP CRC; originals preserved. |
| Gallery visual approval | Native briefing/roster reviewed as readable separate sections; bounded briefing partial.16 Darwin current-source component candidates retained. | Independent whole-family/platform approval still open; no promoted references. |
| Formation references |104 retained Darwin candidates share current feature010 spec but cannot fill absent Linux references. Smallest existing generation unit is one full phone story, not a failed013 image. | Exact-source generation/review plan prepared; not executed. |
| Integrated acceptance | No new full application/story run;172missing/68pixel/8timeout counts remain historical classified instances, current aggregate unverified. | Open. Single capture pass is not integrated green or a historical settlement fix. |

See [Linux capture evidence](../linux-gallery-188/README.md) and [formation generation plan](../linux-gallery-188/FORMATION_GENERATION_PLAN.md). No unchanged rerun, baseline promotion, new PR, target/main change or merge.

## Frozen140 first-failure reconciliation — reviewer21:45

Completed stories40042533270/job120716690219 at exact frozen0f09db62 now classified from the complete retained log:64 first-failing stories ×4viewports =256 instances, not256 independent bugs. Per viewport43missing references,18pixel differences,1geometry failure,2timeouts; totals172missing/72pixel/4geometry/8timeouts. These supersede the earlier138 aggregate for frozen140 only; current recovery overlay has not run a full cohort.

The new concrete geometry boundary is feature003 science gallery Return-to-galaxy at components.spec.ts83: contained:true,hits:false in all four sizes. Painting element is not identified by the summary; retained trace inspection is required before a correction. Mismatched receipt recovery now has four pixel failures; faction gallery adds four absent references while science shifts from missing to geometry. Timeout boundaries remain feature010/011100ticks30s. Generation job's candidate step was skipped despite overall green status: no eligible candidates resulted. See [complete reconciliation](../formation-candidates-189/140_RECONCILIATION.md) for source/log hashes, normalized boundary changes and preserved uncertainty.

### Complete feature010 phone Linux candidates — recovery189

Request ae6f476309e846147bf902ab3de0746481275f46/run40051429026 passed the entire unchanged phone story (1.4m), producing26 complete source-paired Linux originals/narrative with actual later privacy/recovery/zero-rate checks. Artifact12543601794 size/digest/CRC verified; originals archived under feature010/stories/candidates-ae6f4763, **not screenshots references**. Independent visual approval and subsequent strict comparison remain pending. First100ticks9.098s is isolated non-reproduction, not closure of the full-cohort timeout. No integrated green, baseline promotion, new PR, merge or140 target update follows.

### Prompt191 science control recovery

The feature003 Return obstruction is now measured: frozen140's oversized Admission briefing paints over both corners and center; existing gallery repair returns the actual button at all three points. Four Darwin component journeys pass on c74579e3,24 held candidates. Reviewer identified unreadable gallery opener; production secondary styling fixed89bd6ff9, focused phone keyboard/both-motion journey passes11.5s. Six new local candidates remain held. One pinned Linux four-size request40054302899 at1ef11c27 is executing; no strict reference approval or integrated-green claim. See science-controls-191 and science-hit-190 for exact provenance, original failures and scope. The earlier statement that painting element was unknown is superseded by these measured before/after values.

## Current integrated target — Prompt192 supersedes freeze

The user/reviewer authorized one normal fast-forward of existing PR140, feat/admission-briefing-composition, from failed0f09db62 to the commit enclosing this update. Exact runtime input head5935d489 passed clean local integration gates; the enclosing commit only adds retained logs/review documentation. The former opening zero-diff/frozen statements describe the initial183 checkpoint, not current state. No new PR/merge/rebase/force-push. Recovery branch and target update together once.

Application: pending new integrated execution; last completed0f09db62 FAILURE. Strict stories: pending new integrated execution; last completed0f09db62 FAILURE. Scoped science40054302899 SUCCESS is not either required check. Its24 complete Linux originals are verified and held alongside26complete zero-science originals. Current whole-cohort failure counts remain unmeasured. The172missing/72pixel/4geometry/8timeout frozen-head classification is preserved, not asserted as current or arithmetically reduced by isolated passes.

Source gates on5935d489: check/lint,113unit tests,61policy tests+4path cases,20request/orchestration tests, build and280story collection pass. First policy failure from our omitted science-dispatch expected arm is retained and concretely corrected without accepting arbitrary cases. Required application/story workflows, renderer constraints, verification helpers and thresholds unchanged. See integrated-recovery-192/README.md and REFERENCE_REVIEW_QUEUE.md for precise code/evidence and independent review backlog. No baseline promotion.
