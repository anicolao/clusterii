# Research forecast review

UX-08 requires next cost, exact next effect and estimated completion with stated rate assumptions. The selection panel now exposes these through a keyboard-operable disclosure using the player's authorized research and last completed production ledger. No new projection, service command, storage or rules capability is introduced.

## Recorded behavior

`shared/research.ts` supplies the same integer milli-science cost to settlement and presentation. Estimates use the ceiling of remaining science divided by the last completed tick's science. A paid level still needs one settlement tick. They are funded ticks, not a promised date: output must remain unchanged, future science must stay allocated to the selected track, and pre-switch time is excluded. Pending or accepted-but-unapplied selections, pause, unknown/zero rate, capped tracks and capped-track bank transfers have explicit explanations instead of a misleading estimate.

The selected track's next effect states its recorded coefficient, units, rounding or range. Navigation range remains separate from speed. Historical capability flags do not promise unavailable observations, construction or travel. Investing describes base production separately from construction dividends. These describe current development rules; they do not approve proposed gameplay rules.

## Dependency and acceptance

| Slice | Dependency | Evidence / remaining gate |
| --- | --- | --- |
| Forecast source | #89 `test/live-research-orders`, f47bfe4 | Shared cost, real private ledger, eight effect descriptions, shared production component in gallery/lab. |
| Calculation verification | Existing authoritative reducer | 47 focused tests / 1366 assertions pass, including all eight tracks at each uncapped completion boundary and a 28-tick estimate checked against actual production. |
| Static verification | Forecast source | Type/Svelte checks and lint pass. |
| Forecast browser/visual | Independent review of corrected #89 family first | Shared-gallery keyboard disclosure generation passed four sizes / 28 captures on b7e629a; independent review and strict comparison pending. Live forecast integration, cap/zero/unknown-rate browser states and normal-motion comparison remain open. No forecast baseline changes. |
| #89 corrected candidates | Clean 826e63d, before forecast edits | Four journeys / 52 images passed generation; reviewer approved and strict verification passed all 52 captures on ea4a002. See RESEARCH_ORDERS_STORY_REVIEW.md for isolated restart and provenance. Old b6043bb family remains unapproved. |
| Hosted/current-head CI | Successor publication | Pending; no preview acceptance claimed. |

Local logs: `/tmp/cluster-research-forecast-unit2.log`, `/tmp/cluster-research-forecast-check2.log`, `/tmp/cluster-research-forecast-lint2.log`. No service authorization or receipt behavior changed. Existing private projections remain the data boundary. This verification does not close live completion/overflow/effective-tick coverage, profile-ingress delivery diagnosis, Linux visual acceptance, original raster findings or hosted scheduler/authentication gates.

## Next evidence

The isolated #89 review and strict comparison passed; extend research stories with named forecast facts and disclosure keyboard journeys on this successor, preserving predecessor acknowledgement, concurrency, privacy and recovery assertions. Generate only new or intentionally changed candidates with matching-source provenance and review separately. Do not use forecast captures as evidence for #89.

## Separate forecast gallery candidates

Source `b7e629a` generated four passing stories / 28 candidates with `research-forecast.story.spec.ts`. Retained directory: `/tmp/cluster-research-forecast-gallery-candidates`; log: `/tmp/cluster-research-forecast-gallery-generation2.log`. Each manifest records clean source and exact spec/renderer identity. The story checks pending, paused and applied forecasts through native keyboard disclosure, recorded 20-science cost, 1.01 effect, 18.6 remaining science and 14 funded ticks at 1.4 science/tick. Views explicitly scroll the developer gallery and prove disclosure containment. They are component evidence, not live command receipts. The implementer inspected the phone applied frame: full text and action are readable/contained. Independent matching-source review is requested; no forecast family promotion or strict verification has occurred.

The first attempt failed the helper's mandatory-viewpoint contract before capture; artifacts remain at `/tmp/cluster-research-forecast-gallery-initial-failure`, log `/tmp/cluster-research-forecast-gallery-generation.log`. The corrected opening step captures the real gallery scope. Type/lint and story-policy checks pass. Existing real research orders and privacy/receipt assertions remain unchanged. Latest-head CI and publication remain pending, and green skipped-generation jobs do not establish candidate evidence.

## Gallery strict result — 12:19 approval

On clean `dc7bb0e`, all four gallery journeys and 28 exact captures passed in 23.2 seconds. Log `/tmp/cluster-research-forecast-gallery-strict.log`; ordered stories and capture hashes are archived under `docs/testing/stories/research-forecast-gallery`. Archive validation rechecked decoded pixels. This supersedes the gallery review/strict pending status above only. Live integration and other listed gates remain open; initial failed generation and predecessor held candidates remain preserved.
