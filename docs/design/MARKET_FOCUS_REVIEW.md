# Market focus

Economy opens Market focus, an empire allocation instrument with four labeled whole-number controls, plus/minus buttons, allocation bars and distinct shared development icons. Allocated/remaining points and Apply focus stay visible while details scroll. The illustrated header reuses the production market scene. Back restores focus to the opening economy control. Incoming revisions preserve the draft; invalid totals, unchanged allocations, pause and pending commands explain or disable commitment.

## Authority and timing

`market.focus` carries only the expected canonical revision and the four allocation values. Membership and development access remain authoritative. Values must be integers from zero to 100, include exactly Market/Camp/Base/Station, and sum to 100. Actor fields, fractions, excess keys, invalid totals and stale revisions fail without an allocation change. The owner's encrypted view/history contains only their own focus and orders.

Acceptance queues a private order with its command identity, canonical sequence and eligible tick. The same boundary rule as construction/research applies: before the boundary, the next tick; at/after the boundary, the first future tick. Up to 64 outstanding focus orders bound the encrypted state size; admission rejects further orders until settlement rather than discarding previously acknowledged commands. Settlement applies due orders in sequence and retains the last applied order and that tick's applied list.

Dividends use the beginning-of-tick allocation from the immutable input state. A focus applied at T first affects dividends at T+1. No focus change pays money itself. The existing completion pool, builder exclusion, beginning-market eligibility, stable milliunit apportionment and escrow rules continue unchanged. All-zero weights for a development pay nothing, even though the allocation across all four types still sums to 100. Credits and scientific production do not gain a speculative multiplier.

## Compatibility and scope

New production states store equal initial allocation explicitly. Production campaigns created before editable focus have the recorded ruleset's equal 25/25/25/25 behavior. Missing focus data denotes that recorded allocation; it is materialized when the next real order/tick is committed. Existing encrypted historical records remain intact. Reading an older member projection presents that same allocation without creating a command or inventing past settings. Schema-1 campaigns remain without production or focus editing; no retroactive awards or reconstructed pause intervals occur.

The bounded-pool formula and focus timing remain proposed v0.1.0 rules, not owner-approved rules. This slice adds editable focus to the existing construction/production interaction. It does not complete transfers, intelligence, capture/combat, account-key rotation, public admission, balance validation or release acceptance.

## Evidence

Thirty unit tests pass with 443 assertions, including strict allocation validation, boundary timing, ordered/bounded admission, private serialization, old equal-focus interpretation, unchanged application-tick dividends, changed following-completion dividends and zero-weight pools.

Four construction/focus service cases pass with live Cloud KMS: 390 assertions in 108.02 seconds (`/tmp/cluster-focus-live.log`). They exercise both providers, forged fields, stale commands, repeated handler/tick delivery, private grants, exact payouts and both-direction migration. Complete history for all four recipients is compared across multiple ten-record pages. These extend, rather than replace, the prior lease/recovery coverage.

The ordinary UI focus journey passes in 21.1 seconds with four separately authenticated players. It creates/joins through normal controls, then invokes the real start/settlement services using an explicit test clock. Invalid allocation disables Apply; accepted focus survives reload. Tick 5 still pays 2.3 credits from the old allocation, while the next eligible camp completion pays this investor zero. Credits reconcile to 216.3 and 230.3. This is controlled service-clock evidence, not a hosted or real-time Scheduler certification.

Visual inspection found a generic CSS class collision stretching allocation rows and unstyled secondary controls. Those were corrected, then numeric fields widened to preserve all three digits of 100 and introductory copy shortened for phone. The refreshed phone capture shows all four rows and the full three-digit value; the supervisor independently sampled that composition at 23:47. Final four-size renders retain the before/after evidence. Primary-action geometry is checked before automatic scrolling, and numeric text width is checked against the field width. Production controls/icons are shared by the gallery and deterministic animation lab; replay/reset, accepted/applied states and equal reduced-motion outcomes pass. Existing image baselines were not regenerated.

The full default suite passes 21 service tests/1,150 assertions in 62.68 seconds, with 11 live-only skips. Seven browser/gallery/lab tests pass in 31.9 seconds (`/tmp/cluster-focus-final.log`). The later confirmed-income refinement passes both focus browser tests in 21.4 seconds; the final heading/return-focus run passes both focus tests in 20.5 seconds (`/tmp/cluster-focus-keyboard.log`). Type checks and lint pass.

## Rollout and gates

Update every bundled canonical/view writer first: maintenance, migration admission/worker, scheduled start and production. Then update `processCampaign`, the additive ingress rule and the preview client. Once focus orders exist, rollback must preserve their application and frozen-weight semantics; use authoritative pause and a compatible forward fix. Old clients can keep reading their supported fields. Hosted Google/Scheduler, exact-head CI and independent security/rendered acceptance remain gates.

The compatible deployment completed on 2026-10-21 UTC: all five consumers/view writers, then command admission, then additive database rules. Hosted acceptance remains separate.

## Economy geometry correction

Run 39543627680 at 220916e passed 46 browser tests but failed the production journey's 4K overlap check. The retained trace shows the sticky Queue investing action painting over the Innovation radio row. The original CI frame and local before captures are retained in `docs/ux/reviews/economy-geometry/before/`.

Research choices now scroll within a bounded fieldset; the commitment follows outside that scroller. Keyboard focus reveals the complete choice row and its form. The former 80px sticky-action scroll margin is removed. The production component is unchanged across campaign, gallery and lab.

The focused ordinary-UI journey now submits research, settles one authoritative tick with an explicit service clock, and checks all eight keyboard selections at phone, desktop, short and 4K sizes. Both selected radio and action corners must be unobscured before automatic geometry scrolling. The general overlap helper intersects target bounds with ancestor scroll clips; it still rejects overlapping visible edges, demonstrated by a negative regression whose target centres remain reachable. It retains minimum target size, viewport, hit-testing and document-overflow checks.

Intermediate rendered review caught a short-screen commitment clipped despite passing viewport bounds, followed by a partly clipped selected radio. Both prompted stricter hit-target assertions and layout/focus corrections; intermediate passing tests were not treated as acceptance. Final captures live in `docs/ux/reviews/economy-geometry/after/`. The focused service-clock journey does not certify hosted Scheduler behavior or replace the real-time production CI journey. Exact-head CI and independent visual acceptance remain pending.

Final focused verification passes seven browser/gallery/lab tests in 34.3 seconds (`/tmp/cluster20-geometry-verified.log`), including the 18.0-second four-commander service-clock journey. Type checks and lint pass. The implementer inspected all four final captures; independent rendered acceptance remains open.
