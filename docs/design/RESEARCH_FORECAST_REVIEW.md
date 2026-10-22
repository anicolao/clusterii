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
| Forecast browser/visual | Independent review of corrected #89 family first | Not run. Disclosure, cap/rate/switch states, keyboard, reduced motion and four sizes still require TestStepHelper stories and separately reviewed candidates. No baseline changes. |
| #89 corrected candidates | Clean 826e63d, before forecast edits | Four journeys / 52 images passed generation; reviewer approved and strict verification passed all 52 captures on ea4a002. See RESEARCH_ORDERS_STORY_REVIEW.md for isolated restart and provenance. Old b6043bb family remains unapproved. |
| Hosted/current-head CI | Successor publication | Pending; no preview acceptance claimed. |

Local logs: `/tmp/cluster-research-forecast-unit2.log`, `/tmp/cluster-research-forecast-check2.log`, `/tmp/cluster-research-forecast-lint2.log`. No service authorization or receipt behavior changed. Existing private projections remain the data boundary. This verification does not close live completion/overflow/effective-tick coverage, profile-ingress delivery diagnosis, Linux visual acceptance, original raster findings or hosted scheduler/authentication gates.

## Next evidence

The isolated #89 review and strict comparison passed; extend research stories with named forecast facts and disclosure keyboard journeys on this successor, preserving predecessor acknowledgement, concurrency, privacy and recovery assertions. Generate only new or intentionally changed candidates with matching-source provenance and review separately. Do not use forecast captures as evidence for #89.
