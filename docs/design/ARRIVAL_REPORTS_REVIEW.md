# Arrival reports review

Commanders open recipient-private arrival reports, inspect their own casualties and surviving forces, distinguish orbital occupation from surface conquest, and inspect the affected system. The report reads immutable authorized history and never moves the camera merely because a record arrives. Closing restores the opening control; Inspect surface opens current system knowledge, which can differ from the historical outcome.

## Contract and compatibility

Reports add optional `detail.format: 1` to the existing arrival record. New details contain the recipient's formations/melee effectiveness, transported infantry, capacity losses, landed infantry, ground casualties and surface survivors. Existing records remain readable and explicitly state that these phases were not recorded. There is no reconstructed history, retroactive production or rules migration.

The report retains separate before/after orbital and surface owners and the authoritative participant order already granted to that combat recipient. Opposing complements and effectiveness are absent. Uninvolved recipients receive no arrival report. A released escrow amount is added only to the conquering recipient's report in the same atomic production settlement that releases it. Contested balances and the amount received by another empire remain private. Output explanations follow the recorded owners; they do not claim current ownership.

The instrument combines current received reports and paged encrypted recipient records, deduplicated by tick/system. Earlier reports load explicitly. It does not call the first history page a complete archive. All participants' encrypted histories retain their own facts across encryption migration. The admission budget reserves the expanded future reports before accepting travel.

This adds reporting to the existing travel resolver. Square-law normalization, defender-first frontage, incumbent-first ordering, automatic landing at unclaimed/hostile surfaces, transport losses, and hostile arrival ending an onward route remain development rules under review. Implementation and test scenarios do not approve them. Alliance combat and information-sharing policies remain incomplete. Public campaigns remain closed.

## Presentation

The full-height aftermath illustration follows `09-combat.png`; actual UI shows named forces, losses, separate control and a safe-area commitment rail. Phone uses a separate crop and bounded report details. Arrival, orbit and surface use shared production icons. The same ArrivalReports component, reducer-resolved scenarios, motion implementation and image appear in the gallery and replay/reset/seek/speed/reduced-motion lab. Artwork provenance and the exact generation prompt are in `docs/art/PRODUCTION_ASSETS.md`; illustration is atmosphere, not intelligence.

## Evidence and limits

- Unit fixtures verify split-owner resource entitlement, withheld opposing-layer values, transport/ground casualty accounting, growing held credits, exact one-time release, no opposing receipt amount, uninvolved-recipient omission, and deterministic reload settlement.
- The ordinary-player browser journey creates four identities, admits a real roster, advances real research/production with an explicit service clock, forms and routes fleets, captures orbit, recovers reports after reload, and uses ordinary cargo commands between intermediate landings before conquest. No forces, ownership, research levels or reports are injected. Test inspection of canonical state asserts outcomes; planning uses the catalogue and participating players' known homes.
- Private service coverage extends the existing both-provider travel journey with exact report details and full recipient-history comparison after a second encryption migration containing settled reports. Lost settlement reply/replay and paused travel remain covered.
- Executed evidence: 68 unit tests / 1,309 assertions; both live-KMS travel/report cases / 212 assertions including full settled-report histories through migration; full default service regression 28 pass, 18 live-only skips, 1,584 assertions. Shared gallery/lab and ordinary report cohort: seven cases, 2.5 minutes. Final report reruns refresh the two-action footer and losing-player privacy capture. Types and lint pass.
- All five compatible consumers deployed before admission; six functions read back ACTIVE on Node22 without test flags. No ingress/rules changes are required for this additive reporting slice. Preview publication, exact-head CI, independent review, hosted Google/Scheduler and broader milestone/release acceptance remain separate gates.
