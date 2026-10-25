# Illustrated live credit exchange

The UX-11 migration separates ordinary exchange/withdrawal from interrupted offer recovery. Four independently authenticated players create and join through ordinary UI. Sender, recipient and outsider views show exact terms, issuer reservation, acceptance, atomic settlement and subsequent withdrawal. The interrupted story withholds only actual trade.offer transport frames, reloads the durable outbox, and releases the original encrypted command. Retransmissions must retain identical payload and command identity; acknowledgement must produce one canonical revision, one receipt and one reservation.

Named checks reconcile every illustrated balance against its authoritative wallet. Available plus reserved credits are conserved before settlement; after settlement, separately recorded production accounts for all new credits. Both sides transfer once and repeat delivery of the same tick has no effect. Withdrawal returns only the issuer reservation. Actual persisted member projections exclude private offer IDs, amounts and outcomes from the outsider. Reload preserves canonical state and Escape restores keyboard focus to Credit offers.

This is the development mock provider using actual ingress, reducers, encrypted canonical state, receipts and recipient grants. It is not a claim of cryptographic confidentiality or managed-key story acceptance. Existing procedural and service trade assertions remain unchanged. Eight-tick expiry, tick-phase settlement and admission ordering remain proposed rules; implementing this evidence does not approve them. Alliances and non-credit exchanges remain incomplete.

The guarded emulator-only domain clock is described in E2E_GUIDE.md. It changes only the time input for explicitly named campaigns; labelled harness steps invoke the actual leased tick service. No balances, seats, offers or outcomes are injected. Hosted Scheduler/OAuth, cutoff-edge timing and managed-key journeys remain separate gates. Candidate generation, visual review and exact verification are separate; no inherited expected image or comparison tolerance changes. The inherited identity-raster failure and current-head preview gates remain open.

Base: #53 (`feat/live-sharing-stories`). Local execution, four-viewport visual review, pinned Linux verification and independent acceptance are pending.

First generation passed eight journeys in 4.0 minutes (`/tmp/cluster-credit-generation.log`). Phone inspection found that the captured reading position hid outcome details, and the pending button's long acknowledgement word exceeded its narrow content width. The next generation adds keyboard reading with explicit outcome containment and a scoped commitment-button wrap rule. The full first candidate set is retained at `/tmp/cluster-credit-reading-before`; none was promoted. Types, lint and eleven story-policy guards pass. Final candidate review and exact comparison remain pending.

Final generation passes eight journeys/212 captures in 4.0 minutes. Separate visual review is recorded in [LIVE_CREDIT_BASELINE_REVIEW.md](../testing/LIVE_CREDIT_BASELINE_REVIEW.md); only the two new macOS sets are promoted. Exact comparison is running. Both previous review sets remain retained, and no inherited baseline changed.

| Dependency / acceptance | Evidence / remaining gate |
| --- | --- |
| Base | #53 `feat/live-sharing-stories` |
| PR | [#54](https://github.com/anicolao/clusterii/pull/54) |
| Local exact comparison | Eight journeys / 212 captures, four viewports, 4.1 minutes; `/tmp/cluster-credit-exact.log` |
| Financial/privacy/recovery | Actual encrypted service ingress and member projections; exact original command/payload; one receipt/revision/reservation; conserved balances; repeat settlement and reload without effects |
| Keyboard/geometry | Enter commit/accept/withdraw, focused acknowledgement, bounded terms/outcomes, Escape restoration, pending text containment and persistent footer |
| Static/guard checks | Types and lint pass; 11 story-policy and 13 prompt-history tests pass |
| Linux / independent review | Pending; generation and local review do not complete either gate |
| Preview | [PR54](https://anicolao.github.io/clusterii/pr54/) — current-head verification pending |
| Remaining scope | Managed-key illustrated journey, normal-motion parity, expiry/cutoff branches, hosted OAuth/Scheduler and inherited identity-raster diagnosis remain open. Existing procedural/service assertions remain. |

Eight generated walkthroughs are linked from STORY_INVENTORY.md. This completes the local illustrated subjourney, not all UX-11, milestone 8 or release. The only production edit is scoped pending-button wrapping; no resolver, authorization, command or proposed rule changes.

Publication follow-up: predecessor #53 run 39680103580 failed exact-head verification after observing HTTP 404 for expected `53e53873b836a95e03b7cf5381e7f2280bdea38e`. Failure log retained at `/tmp/cluster53-publication-implementation-failure.log`. The shared Pages queue still contains #54 publications, so a predecessor retry remains queued for coordination after it clears; no preview is described as verified. Linux layout diagnostics run 39672128592 remains queued, and the inherited raster diagnosis remains unresolved.
