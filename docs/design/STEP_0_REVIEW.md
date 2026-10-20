# Step 0 review — rules and design contract

Based on main `90704dd` and the selected cinematic UX. This PR completes the written rules/design deliverables for step 0 and leaves them open for owner review. PR #4 also implements step 1, provisions Firebase, and publishes a Pages preview; see [step 1 review](STEP_1_REVIEW.md) for implementation evidence and outstanding acceptance. No old games are imported. The rules remain proposed, and neither balance nor full hosted security acceptance is claimed.

## Read in this order

1. [Rules specification](../../RULES_SPEC.md): complete campaign rules, exact timing, formulas, ownership, and worked examples.
2. [Versioned balance data](../../rules/cluster-v0.1.0.json): machine-readable numeric selections; status remains `review` until approved.
3. [Technical contract](../../TECHNICAL_CONTRACT.md): identity, admission/replay, environments, encryption, and concrete UX bindings.
4. [Implementation plan](../../IMPLEMENTATION_PLAN.md): the remaining milestones consume these contracts.

## Decisions requiring particular attention

These are explicit choices made for this PR, not pre-existing approvals or conclusions established by the concept art.

| Decision | Selection | Reason and review impact |
| --- | --- | --- |
| Public campaign size | 4, 8, 12 seats, equal faction quotas | Supports four complementary factions; excludes a two-player public conquest mode. Development fixtures can use fewer identities but do not award public results. |
| Factions | Four names; 1.4/1.0/.8/1.0 cyclic affinity | Simple, equal-total asymmetry. Names and numbers can change in review without changing the architecture. |
| Starting economy | 200 credits; 2 markets, 1 camp/base/station; 20 fighters/infantry | Allows all core systems to operate immediately, unlike zero-market/zero-science starts. |
| Map visibility | Star catalogue public; ownership/forces/production private | Preserves navigable maps without turning poor scans into unknown coordinates. Scanning reveals observations, not private orders or live subscriptions. |
| Economy | Three-decimal fixed ledgers; local troops, global credits; track-specific science | Makes production/transport and display totals unambiguous. Research science is not a tradable global wallet. |
| Market speculation | 100 points; a 10%-of-price pool divided by weighted market focus at completion | Bounds construction-ring profits. Replaces unlimited per-focus-point generation; investing applies to normal income, not this bounded pool. This is a material change to the draft formula. |
| Build lifecycle | Four ticks per development; serial per-layer queues; 100%/50% cancellation refund | Creates understandable pending/completion states and removes unspecified timing. Capture destroys queued investment but preserves completed buildings. |
| Fighter combat | Normalize survivor count by winner's coefficient | Prevents unequal-technology combat from creating units. |
| Ground combat | Single-frontage defender-first damage rounds, closed-form equivalent | Preserves linear scaling and defender-first advantage. Equal forces leave one defender; some draft subtraction examples therefore change. |
| Simultaneous combat | Recorded coalition order; incumbent defends; final ownership once | Makes resolution replayable without rewarding network timing. Sequential multi-party combat remains a balance point for simulation. |
| Alliances | 2 to half the roster; consented admission, 96-tick eligibility and departure notice | Makes commitments meaningful and prevents last-second victory membership. No expulsion shortcut. |
| Victory | Distinct-faction alliance holds at least 60% of unified stars for eight ticks | Selects territorial victory over resource scoring. No solo victory; split allied titles still hold escrow and do not count. |
| New partners | +2 percentage points per recent shared pair win, capped at +6 | Creates an explicit incentive to vary allies, without adding a reward currency or ranked ladder. This policy needs repeated-game testing. |
| End conditions | 30-day draw; explicit surrender; inactivity does not surrender | Avoids a game that cannot end while preserving asynchronous players' holdings. |
| Deployment | New Firebase project; main and retained Pages previews share canonical game identity | Leaves Cluster I untouched; project identifier/billing are provisioning dependencies, not invented credentials. |
| Encryption | Same mock/real interfaces; server-trusted KEK delivery; fresh object keys per version | Allows inspection in dev without leaking future object revisions to former recipients. Mock success cannot satisfy real confidentiality acceptance. |

## Step 0 coverage

| Plan requirement | Contract location | Review evidence / gate |
| --- | --- | --- |
| Factions, affinity matrix, starts | Rules §1; JSON | Four complete rows, equal totals, independent portraits, explicit seat quota. |
| Map size, fairness, units and resource richness | Rules §1 | 32 stars/seat, explicit separation/connectivity, bounded generation failure. |
| Tick cadence/cutoff/order/recovery | Rules §2; Technical §4 | Nine ordered phases, frozen levels/focus, reservations and failure behavior. |
| Construction and layer permissions | Rules §3 | Cost, capacity, duration, cancellation/capture and completion timing. |
| Production and resource scope | Rules §3–4 | Fixed rounding stages, local forces, science tracks, proportional bonus apportionment. |
| Speculation, escrow and abuse limits | Rules §4 | Other-player completed builds, bounded pool, no cancellation/retry dividend. |
| Research/scanning | Rules §5 | All eight tracks, level costs/caps, next-tick effects, zero-distance and stale-report cases. |
| Fleets and travel | Rules §6 | Capacity, speed/range distinction, route limits and exact edit/arrival rules. |
| Combat and control | Rules §7 | Normalized square law, exact linear rounds, coalition ordering and final escrow settlement. |
| Diplomacy and exchange | Rules §8 | History scope, independent memberships, binding consent and atomic credits/report trades. |
| Victory and repeated games | Rules §9 | Threshold, eligible members, hold reset, pair history, surrender/elimination/deadline. |
| Formula examples and boundaries | Rules §10 | Hand-checkable production, cost, research, sensing, travel, combat and victory cases. |
| Versioned configuration | JSON; Technical §2,4 | Ruleset immutable per game; source data is review-only until approval. |
| Environments/runtime/access | Technical §1–4 | Selected Node family, new project, no legacy migration; remaining pins/provisioning have named gates. |
| Grants, keys and mock/real mode | Technical §5–6 | Recipient isolation, recovery/rotation, old-version disclosure and failed-migration recovery. |
| Screen/input and art contract | Technical §7; UX_DESIGN | Screen-to-rule mapping, no invented resources or manual combat, exact visual acceptance retained. |
| Explicit remaining dependencies | Technical §8 | Provisioning/patch pins in 1; measured budgets/security review in 2; balance in 11; deletion disclosure in 12. |

## UX review findings

Reviewed the full written UX flow and the galaxy and split-control concept plates. Preserve the separate desktop inspector and phone task sheet, the distinction between orbital/surface owners, and exact semantic values over cinematic artwork. The pictured world names, resource icons, costs and force counts remain illustrative.

The step 0 rules resolve conditional controls: no manual start/readiness, no manual scan, no mid-flight reroute, and no extra Attack action for automatic assaults. Research switches retain track progress. Conversation admission chooses future-only or selected earlier history. Results show shared territorial winners or a deadline draw; the generic UX's individual-winner variant is unreachable under this ruleset and needs no invented test game.

UX-01 through UX-16 remain acceptance IDs. Their exact screenshot policy, four viewport sizes, input equivalence, privacy boundaries and ordinary-player full campaign journey remain unchanged. Production implementation must compare rendered screens with the concepts as well as checking rules; step 0's document review is not visual acceptance of the application.

## Step 0 verification

- Parsed the configuration; checked supported player counts, full affinity rows, equal faction strength totals, starting technologies, focus sum, and thirty-day tick duration.
- Recomputed production/cost/victory examples independently with decimal arithmetic.
- Compared the ground closed form against explicit defender-first rounds in 168,100 cases: each force count 0–40 and each coefficient 1–10.
- Checked 50 local document links, prompt history and whitespace; all ten existing prompt-enforcement tests pass. Reproduce configuration/arithmetic/link checks with `python3 scripts/check-step-zero.py`; CI runs the same check.

Step 0 selects the written contract. Step 1 adds the application and encrypted identity tracer on the same PR; [its review guide](STEP_1_REVIEW.md) records implementation evidence and deployment dependencies. Balance simulation and playable campaigns remain later milestones.
