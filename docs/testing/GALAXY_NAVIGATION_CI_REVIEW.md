# Galaxy navigation compatibility — PR115

Run [39896097763](https://github.com/anicolao/clusterii/actions/runs/39896097763), job120226802239, exact source699ca61263ed407769299eec7da18f769085eac1. Application failed2026-10-23 04:15UTC;14 failed,22 passed,3 skipped. Full original failed log retained at /tmp/cluster115-0022-application-failure.log (SHA256 7ae5b007acb25ccfbb2f500316e5566ad3dde3289ec0407b85d1e4a548ce66dc); run/head/job metadata at /tmp/cluster115-0022-run.json, text-only normalized copy at /tmp/cluster115-0022-application-clean.log. No large artifacts downloaded, local browser launched or remote run retried.

Every complete failure block was inspected independently. In this run all14 stop at the same removed visible text; this does **not** establish that their later assertions pass or that other remote runs share the cause.

| Failed case | Observed first failure |
|---|---|
| arrival-reports.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| briefing.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| construction-completion.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| construction-feedback.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| conversations.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| credit-offers.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| fleet-cancellation.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| fleet-contacts.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| fleet-reorganization.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| fleet-travel.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| fleets.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| market-focus.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| observations.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |
| production.spec.ts | Removed Campaign begun locator; 5,000ms visibility assertion |

## Compatibility correction

Shared galaxy-navigation helpers use actual controls: Roster → scoped Began status → Close roster; Inspect → Orbit/Surface → applicable Build; Inspect → View forces; global dock and phone More; Observation within expanded inspection. They perform no commands, fabricated responses, state injection, forced clicks or deadline changes. Former Fleets · N checks still assert the same count via the actual labelled map marker for the selected system; force totals are checked independently in their named Orbit/Surface rows. Construction receipt, conservation, replay, privacy, authorization, pending, geometry and focus assertions remain. Production's already-open Economy is explicitly closed before reading Roster, then reopened; returning-entry focus is checked before navigation changes it.

Source review exposed a production navigation defect separate from the CI stopping point: arrival Inspect surface selected a star but never opened the expanded Surface instrument. It now expands Surface and dismisses the phone command tray so the instrument can receive focus. A briefing system destination likewise opens its Observation view and dismisses the tray. No facts, campaign revisions, draft values or service logic change. Arrival regression retains bounded-details focus and now asserts selected Surface expansion; rendered execution remains pending.

## Explicit legacy exception / remaining migration

Prompt132 explicitly authorizes updating legacy setup/navigation while preserving all existing tests. This bounded compatibility correction updates the14 manifest hashes with prior hashes and this review reference; policy code is unchanged. This is an explicit, documented exception to automatic migration-on-edit, not silent exception refresh or claimed illustrated compliance. Existing procedural screenshots remain procedural evidence; no new story wrapper, baseline replacement or fake migration. Existing feature-local tests/e2e/002-galaxy continues as the separately held real illustrated design journey, following Pantheon organization. Broader inherited story navigation compatibility remains separately incomplete.

## Verification and remaining gates

Nix Java21.0.11/Node24.18.0/Bun1.3.13; Node24 is not pinned Node22 certification. Production check0 errors/0 warnings and lint pass; explicit no-emit TypeScript check of helper plus all14 files passes; Playwright discovery39 tests/17 files without launching browser. Final policy/static checks recorded at commit boundary. No local browser execution is authorized in this slice; disk1,967,580KiB is below2,359,296KiB capture headroom. Live corrected flow, four-size spatial instruments, acknowledged construction/reload, independent design, exact comparison, Linux/KMS/hosted/concurrency/performance and release remain open. No baseline promotion or merge.

Final source audit preserves every test declaration, explicit test deadline and skip condition across all14 files (TypeScript AST comparison against699ca61). Original remote service phase separately passed35/skipped22/failed0 with2508 assertions; that does not execute the corrected browser paths. Final Nix check/lint/policy passed; disk fell to1,473,096KiB, so no browser/capture was launched.
