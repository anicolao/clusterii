# Baseline path resolution — PR115

Reviewer00:42 identified an actual unsupported template token in failed story run39896097779 at 699ca61263ed407769299eec7da18f769085eac1. Original full failed log: /tmp/cluster115-0042-stories-failure.log, SHA256 086d43cc9a65a5b5a891b6e8e8cb5560fee023066efc14d8f2461c6d723e2427; run/job metadata /tmp/cluster115-0042-stories-run.json. No remote rerun or baseline generation.

## Installed API evidence and correction

Installed Playwright1.61.1 types/test.d.ts lines519–574 enumerate supported tokens and document relative paths resolving against configDir; configDir is not a substitution token. lib/worker/workerProcessEntry.js _applyPathTemplate at1289–1295 replaces testDir, snapshotDir, test-file/project/argument/extension tokens, then resolves against internal configDir. It never replaces {configDir}.

With testDir=tests, {testDir}/browser/story-baselines/{arg}{ext} resolves to the existing repository legacy baseline directory. Feature-local baselinePath continues resolving the spec directory/screenshots/name. Only path selection was extracted into a shared pure function so the metadata-only test exercises the same helper path as real captures. Missing-baseline, renderer, readiness, exact decoded RGBA and zero-tolerance checks are unchanged; verification remains read-only.

## No-browser regression evidence

The new metadata-only Playwright test requests no browser/context/page fixture and its config disables webServer. It inherits the real story template and projects, uses real TestInfo.snapshotPath, and checks both actual repository layouts with no braces. The old template fails deterministically on phone: received repository/{configDir}/tests/browser/story-baselines/... instead of repository/tests/browser/story-baselines/.... Original failure log and output retained at /tmp/cluster115-baseline-path-before.log and /tmp/cluster115-baseline-path-before/.

After correction four metadata cases pass1.8s, /tmp/cluster115-baseline-path-after.log. Each checks representative legacy local-presentation-settings and feature-local learn-and-return files for its viewport; every PNG and JSON in those reviewed family directories is byte-compared with committed HEAD, including renderer/review provenance. No PNG or provenance changes. This is path/API evidence, not rendered visual acceptance. test:baseline-paths is included in CI story policy before browser setup.

## Failed story run classification

224 complete failure blocks were classified,56 per viewport.157 legacy path failures contain literal /{configDir}/; correcting resolution does not prove an appropriate Linux file exists.8 feature-local missing Linux baselines have correctly resolved paths (entry and galaxy); these remain genuine missing reviewed candidates.4 exact RGBA entry comparisons fail independently.1 phone waiting-galaxy geometry check expected chart top<=70 and received111: actual composition mismatch remains open, no threshold change.4 zero-science harness steps exceed their existing30s leased-tick budget; unchanged and unresolved.

Remaining50 are concrete navigation failures:32 fleet entry (8 families ×4),8 construction entry (2 journeys ×4),3 Observation entry,3 decorative-star-prefixed selected-name lookups, and4 phone dock entries (History, Systems list). Their later gameplay/privacy/geometry checks were not reached. Detail classification is retained at /tmp/cluster115-0042-stories-classification.json with complete raw logs. Compatibility corrections follow separately, not a declaration that all missing paths or timing/pixel failures are solved.

## Gates

No browser/emulator/capture launched. Disk1,023,600KiB is below2,359,296KiB; all originals remain preserved. Prior current-layer fidelity, build/reload, Linux review, exact visual comparison, hosted/KMS/concurrency/performance and release gates stay open. No promotion or merge.
