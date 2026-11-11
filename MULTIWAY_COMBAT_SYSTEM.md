# Multiway combat system

**Status: proposed design for owner review; no gameplay implementation or active campaign changes.**

This proposal replaces the sequential multi-party duels in [RULES_SPEC.md §7](RULES_SPEC.md#7-combat-and-ownership) with one simultaneous engagement per layer. It preserves normalized two-party square-law fighter combat and defender-first, constrained-frontage infantry combat. All eligible participants fight from the start; nobody waits for two enemies to finish fighting.

The two-party laws do not uniquely determine a multiway model. They leave unanswered how a force divides its offensive capacity among several enemies. This document selects that policy explicitly, derives the resulting equations, and distinguishes mathematical consequences from new game decisions. Approval would require a new combat ruleset version; this document does not amend the existing contract by itself.

## 1. Participants and boundaries

A participant is a **coalition**: one alliance, or one unallied empire. Aggregate all of its eligible forces on the layer before combat. Splitting the same force into more fleets, or changing the order of a fleet list, cannot change the battle.

For this version, alliance membership partitions participants into disjoint coalitions. Different coalitions are mutually hostile. This is a complete hostility graph, not a general network of independent nonaggression agreements. A future nontransitive diplomacy model needs an explicit extension; it must not be approximated by silently merging connected allies.

For coalition `i`, define:

| Symbol | Meaning |
| --- | --- |
| `N_i(0)` | Initial eligible fighter or infantry count on this layer |
| `N_i(t)` | Remaining mathematical force strength during space combat |
| `n_i` | Remaining mathematical force strength during a ground round |
| `f_i` | Formations coefficient, minimum 1 |
| `m_i` | Melee coefficient, minimum 1 |
| `D` | Coalition holding the surface at engagement start, if it fields defending infantry |

Use the existing contract's initial-unit-weighted mean technology coefficient, floored to an integer, for allied contingents. Freeze that coefficient for the engagement. Do not improve a coalition's technology halfway through combat by assuming that its less advanced members died first. Assign final casualties to members only after the coalition outcome is known.

Zero-force coalitions do not shoot, absorb fire, or affect target shares. A title without a garrison is not a phantom combatant. With fewer than two positive-force coalitions there is no battle; apply occupation and title-retention rules instead.

Combat time and ground rounds are mathematical resolution steps inside one authoritative arrival phase. They are not additional game ticks. Player latency, command sequence, UID order, and database iteration order do not select combat priority.

## 2. Proposed targeting policy

**Each coalition shares its total offensive capacity equally among its live hostile coalitions.** It does not receive a full extra offensive budget for every enemy.

This is a game-design choice, not a theorem of Lanchester's laws. It gives a neutral, reproducible default without introducing player targeting orders or combat randomness. A small hostile coalition initially receives the same attention as a large one. That distraction effect is a balance consideration, not an implementation accident.

Allied members count as one coalition. Breaking an alliance can change targeting and create mutual hostility; merely splitting fleets cannot. The model does not promise that adding an enemy, or reorganizing alliances, leaves existing participants' outcomes unchanged.

For space, targeting shares update continuously as coalitions are eliminated. For ground, each strike subphase caps allocations to available target strength and redistributes that attacker's excess allocation equally among its other targets. Incoming attacks from different shooters then combine simultaneously.

Do not replace this policy with any of the following without a new rules decision:

- Full offensive capacity against every opponent: duplicates firepower as enemies are added.
- Seeded or UID-ordered duels: reintroduces the participant waiting advantage.
- Focus fire on the weakest or strongest opponent: introduces a different targeting strategy.
- Damage proportional to the opponent's coefficient: rewards the wrong side's technology.

## 3. Space: simultaneous aimed-fire equations

Every surviving fighter contributes fire. If `k >= 2` coalitions remain, the total fire from coalition `j` is `f_j N_j`, divided among its `k - 1` enemies:

```text
fire(j → i) = f_j N_j / (k - 1),  i ≠ j

dN_i/dt = -Σ[j ≠ i] f_j N_j / (k - 1)
```

All derivatives use the same current force vector. Every coalition fires and suffers losses concurrently. An incumbent has no space first-strike bonus.

### 3.1 Exact reduction to the existing two-party law

With only A and B:

```text
dA/dt = -b B
dB/dt = -a A

d(a A² - b B²)/dt = 0
```

Consequently, if A wins:

```text
A_final = sqrt((a A_initial² - b B_initial²) / a)
B_final = 0
```

Reverse the expression for a B victory. Equal weighted strength eliminates both. Floor the final surviving strength once to obtain actual fighters, matching the existing normalized resolver. For example, `A=100, B=50, a=2, b=1` leaves 93 fighters for A. Neither technology nor conversion from weighted strength creates units.

There is no general multiway shortcut that compares each coalition's square strength to the sum of every enemy's square strength. Its enemies also shoot one another. The coupled equations account for that interaction.

### 3.2 Extinction events, ties, and termination

While the live set is unchanged, write `N' = M N`, with:

```text
M_ii = 0
M_ij = -f_j / (k - 1),  i ≠ j

N(t + u) = exp(M u) N(t)
```

Find the first time one or more coordinates reach zero. Advance every coordinate to that same time, remove all coalitions eliminated at that event together, rebuild `M` for the remaining live set, and continue. Never integrate through negative strengths and then repair the result by clipping: the eliminated coalition would have fired after death.

Some exact ties approach zero asymptotically rather than hitting it at finite mathematical time. Three equal forces are an example. Detect a balanced state by testing whether all positive participants have the same exact relative loss rate:

```text
λ_i = (Σ[j ≠ i] f_j N_j / (k - 1)) / N_i

λ_i = λ > 0 for every i
    ⇒ N_i(t + u) = N_i(t) exp(-λ u)
    ⇒ every final strength is zero
```

This is an annihilation result, not a timeout, ceasefire, or randomly selected winner. Under the specified complete-hostility, constant-coefficient model, a positive state outside this balanced ray reaches an extinction boundary in finite time. Between events the matrix is diagonally similar to a symmetric matrix with one negative and `k-1` positive eigenvalues; only its positive decaying eigenvector stays in the positive orthant forever. Do not carry this termination claim into a different targeting or hostility model without rederiving it.

Once exactly two coalitions remain, their exact two-party solution is an equivalent way to finish the same simultaneous model. This is not an ordered-duel tournament: both have already fought every other participant throughout the preceding engagement.

### 3.3 Worked multiway examples

**Three equal hostile fleets:** A, B, and C each have 100 fighters and formations 1. Every fleet supplies 100 units of fire, half to each enemy. Each receives 100 units of incoming fire initially. By symmetry:

```text
A(t) = B(t) = C(t) = 100 exp(-t)
```

The result is mutual annihilation. There is no untouched third fleet collecting the system after the other two duel.

**One larger fleet:** A has 200 fighters; B and C each have 100; all coefficients are 1. Let `x=A` and `y=B=C`. Then:

```text
x' = -y
y' = -(x + y)/2

x(t) = (200/3) exp(t/2) + (400/3) exp(-t)
y(t) = -(100/3) exp(t/2) + (400/3) exp(-t)
```

B and C reach zero together at `t = (2/3) ln(4)`. A's remaining strength is `100 × cube_root(4) ≈ 158.740105`, so **A retains 158 fighters**. B and C have damaged A and each other from the start.

## 4. Ground: shared frontages with defender-first rounds

Ground preserves the original constrained-access interpretation: **a coalition has one total frontage budget equal to its melee coefficient per round, regardless of its army size**. More infantry supplies endurance; it does not multiply frontage damage. Several hostile fronts share that budget.

The incumbent defending coalition receives the first strike in **every** round while it survives. The other surviving coalitions then strike simultaneously. This generalizes the existing defender-first rule, rather than replacing it with simultaneous two-party infantry combat.

If there is no defending coalition, all coalitions strike simultaneously from the first round. If the defender dies, subsequent rounds have no privileged coalition. Do not promote an attacker to defender based on array order, random rank, or an intermediate ownership change.

### 4.1 Capped equal-share allocation

Define `Allocate(b, targets)` for one shooter's damage budget `b` and a snapshot of its live enemies' strengths `n_i`:

1. If no targets exist, allocate nothing.
2. Set `B = min(b, Σ n_i)`.
3. Choose the unique allocation represented by `d_i = min(n_i, λ)`, where `λ` satisfies `Σ min(n_i, λ) = B`. If every target is exhausted, simply use `d_i=n_i`.

Operationally, divide the budget equally; exhaust any targets smaller than their share; distribute the remainder equally among the others. This capped equal-share rule needs no target ordering or random tie-break.

For example, melee 5 attacking enemy forces of 2 and 3 assigns damage 2 and 3, eliminating both. It does not waste half a damage point on the smaller force and allow a retaliating survivor merely because the opponents are separate coalitions.

Each shooter allocates from the same pre-strike snapshot. If two shooters together overkill a target, excess **combined** damage is discarded. They do not sequentially redirect their shots after learning which other attack killed it.

### 4.2 One round

Let `n` be the complete start-of-round vector.

**Defender subphase:** If D remains alive, calculate `Allocate(m_D, enemies of D)` from `n` and apply its losses simultaneously, producing `u`. D itself suffers no loss in this subphase. Eliminate zero-strength attackers before they can retaliate.

**Other-coalitions subphase:** Each surviving coalition `j ≠ D` calculates `Allocate(m_j, live enemies of j)` from the same vector `u`. Those targets include D if it survived, and every other hostile attacker. Sum all incoming allocations before applying any of them:

```text
incoming_i = Σ[j ≠ D, j ≠ i, u_j > 0] Allocate_j(i)
n_next_i = max(0, u_i - incoming_i)
```

With no live defender, the second subphase includes every live coalition. A coalition alive at the beginning of that simultaneous subphase fires even if it dies in the subphase. A coalition eliminated by the defender's earlier subphase does not fire.

Repeat until at most one coalition remains. Budgets are positive; an opposed round removes positive strength, and sufficiently small opposing forces are exhausted by the capped allocations. An implementation must handle large battles with exact event batching or another demonstrated equivalent acceleration, rather than putting an arbitrary round cap into the game rules.

### 4.3 Exact two-party compatibility

With A attackers, D defenders, attacker melee `a`, and defender melee `d`, allocation has only one target. Each round becomes:

```text
A ← max(0, A - d)
if A > 0:
    D ← max(0, D - a)
```

For positive starting forces, let `q=ceil(A/d)` and `r=ceil(D/a)`. If `r<q`, attackers retain `A-rd`; otherwise defenders retain `D-(q-1)a`. This is exactly the existing two-party closed form.

In particular, **5 defenders at melee 5 kill any single attacking force of at most 5 before it retaliates**. All five defenders remain, regardless of attacker melee. Equal initial counts do not generally imply one surviving defender.

### 4.4 Worked multiway examples

**Defender plus two attackers:** D has 5 infantry at melee 5. A and B each have 5 infantry at melee 1.

| Round / subphase | D | A | B | Explanation |
| --- | ---: | ---: | ---: | --- |
| Initial | 5 | 5 | 5 | All participate from the start. |
| 1: defender | 5 | 2.5 | 2.5 | D shares its five damage equally. |
| 1: other coalitions | 4 | 2 | 2 | A and B each deal 0.5 to D and 0.5 to one another. |
| 2: defender | 4 | 0 | 0 | D exhausts both remaining forces; neither retaliates. |

**D retains 4 infantry.** Fractions here are internal attrition strengths; the committed result contains whole infantry.

**Small attackers:** D again has 5 infantry at melee 5, but A has 2 and B has 3. D's first strike allocates 2 and 3, killing both. **D retains all 5**, regardless of the attackers' melee levels.

**No incumbent:** A, B, and C each have 5 infantry at melee 1. Each round, each coalition deals 0.5 to each rival and receives a total of 1. All three reach zero together after five rounds. No coalition becomes a privileged defender during the engagement.

## 5. Precision, rounding, and reproducibility

Both models use nonnegative real-valued intermediate strengths and commit whole-unit survivors by flooring **once at the end of the layer engagement**. Fractional strengths are a mathematical combat abstraction, not a new stored unit resource. A positive final strength below one commits as zero; do not award that coalition ownership as a surviving army.

Ground starts from integer counts and coefficients. Capped equal shares are rational; exact rational arithmetic defines the reference outcome, including all subphase ties. Do not round each allocation to whole casualties: that could erase every half-point shot in a multiway battle. Internal fractional forces retain their frontage until eliminated, another explicit consequence of this abstraction.

Space uses the exact piecewise ODE as its reference semantics. Two-party cases use the normalized integer-square-root solution. Fully balanced cases use the exact decay result. Other cases require deterministic event solving, including simultaneous-extinction detection and final integer-boundary checks.

Before production implementation, pin and version a numerical arithmetic profile: solver, operation order, precision escalation, event isolation, symmetry detection, error bounds, and resource budgets. Demonstrate that its final survivor integer and extinction classification match the mathematical model. A fixed timestep plus an undocumented zero epsilon is insufficient. If error bounds straddle an outcome boundary, refine the calculation; if certification still fails within the operational budget, fail the transition without publishing a guessed outcome. This is a delivery gate, not a claim that the continuous model is already an operationally accepted resolver.

Canonical sorting may stabilize arithmetic and serialization. It must not allocate a first strike, decide an extinction tie, or choose which faction survives. Permuting coalition labels must permute the result without changing the corresponding casualties. No combat seed or target lottery is needed for these models.

## 6. Integration with fleets, layers, and ownership

1. Freeze the due arrival batch, coalition memberships, eligibility, and combat coefficients for this tick. Group all eligible forces at the same system before resolving it.
2. Resolve one multiway orbital engagement using fighters and the space model. Finalize coalition losses before assigning any orbital title.
3. Apply surviving transport capacity and infantry losses using the existing carrier-loss rules. Destroyed transports cannot land their infantry.
4. Assemble the legally present surface combatants. Resolve one ground engagement only if at least two hostile coalitions actually have infantry on the surface or can legally land in this phase.
5. Assign final titles and publish both layer outcomes, development consequences and escrow settlement atomically. Never pay escrow to an intermediate contestant.

**Important eligibility boundary:** the current rule allows hostile landing only after the arriving coalition controls orbit. With a sole orbital victor and one surface defending coalition, an ordinary invasion still produces a two-party ground battle. A multiway ground kernel does not authorize losing orbital coalitions to land. Multiple surface coalitions require an actual permitted state, such as previously co-located contingents made hostile by alliance departure. If the intended game allows several mutually hostile armies to land together before orbit is decided, that is a separate arrival/landing rule change requiring approval.

Allocate a coalition's final integer survivors among its contributing owners using their initial layer counts, proportional allocation, and the existing largest-remainder rule. Bound every owner's result by its contribution. Resolve equal member remainders using the existing stable member rule; this chooses allocation within an allied winner, not a winner between hostile coalitions. Do not invent a casualty preference for high-tech members.

Retain the incumbent title when an allied coalition survives, following the existing contract. Otherwise apply the existing surviving-member ownership rule. With no surviving fighters after orbital combat, orbit becomes unclaimed. Surface title retention without a garrison remains governed by the current occupation rule: mutual infantry annihilation does not let a dead attacker capture the surface. No hostile survivor means no new surface claimant. Split control continues to hold credits in escrow.

Combat reports must show participant eligibility, initial counts and coefficients where authorized, coalition membership, actual losses and survivors, the ground defender if any, and final layer ownership. Retain the authoritative input/outcome and combat-rules version for replay. Redact opponents' information according to existing intelligence grants; a mathematical report format does not expand player access.

## 7. Validation and review gates

The reference checks for this document were executed as scratch calculations, not added as production services or represented as shipped gameplay tests:

- An exact-rational implementation of the ground allocation/subphase equations matched the existing two-party closed form for **21,609 cases**: A and D each 0–20; attacker and defender melee each 1–7.
- The ground walkthroughs above were executed with exact fractions, including the 5-versus-5 melee-5 result and the two smaller attackers killed before retaliation.
- The space two-party example gives 93 survivors; the three-party 200/100/100 closed-form example gives `158.740105…`, committed as 158. The symmetric three-party annihilation result follows directly from the equations.

Before accepting an implementation, additionally require:

| Property | Required evidence |
| --- | --- |
| Two-party equivalence | Unequal coefficients, empty forces, weighted ties, integer-square-root boundaries, and defender-first cases. |
| True multiway participation | Three-plus participants exchange fire from the start; no hidden tournament or intermediate ownership. |
| Label and fleet invariance | Input permutations and splitting/rejoining allied fleets preserve coalition outcomes. |
| Symmetry | Equal hostile forces without an incumbent have equal outcomes; no stable-ID winner. |
| Budget conservation | Space outgoing fire sums to `f_i N_i`; ground outgoing allocation never exceeds `m_i`; no negative counts or unit creation. |
| Numerical correctness | Near-balanced space cases, simultaneous extinctions, near-integer survivors, exact-rational ground comparisons, and bounded runtime at supported maximum force sizes. |
| World integration | Carrier losses, legal landing, existing hostile surface contingents, final titles, escrow exactly once, private reports, retry and replay. |
| Balance | Small-coalition distraction, allied aggregation versus independent hostility, unequal technology, concentrated forces, and ground frontage under several attackers. |

The main owner decisions are the equal-coalition targeting policy, capped ground allocation, one total ground frontage per coalition, continuing defender-first subphases, and whether arrival eligibility should ever permit several hostile landing forces. These are explicit proposal choices. They are not implied by the old two-party formulas, and mathematical consistency is not evidence of balance acceptance.

## 8. Relationship to the existing documents

- [VISION.md](VISION.md) and [CLUSTER_II_MVP.md](CLUSTER_II_MVP.md) retain their square-law space and constrained, defender-first ground concepts.
- [RULES_SPEC.md §7](RULES_SPEC.md#7-combat-and-ownership) currently specifies ordered coalition duels. This proposal replaces that mechanism only after owner approval and versioning.
- [The step 0 decision table](docs/design/STEP_0_REVIEW.md#decisions-requiring-particular-attention) understates the multiway design choice and overgeneralizes the melee-1 ground example. This proposal states the replacement assumptions directly; it does not silently rewrite the historical review.
- The later `shared/travel.ts` resolver uses ranked participant duels and the two-party survivor functions. It does not implement this proposal. The oldest open PR's runtime contains identity work, not a combat service.
- Existing campaigns retain their recorded combat semantics. Adoption requires an explicit compatibility/migration decision; visiting a newer client cannot change a running game's combat law.

## 9. Mathematical background

[N. J. MacKay, *Lanchester combat models* (2006)](https://arxiv.org/abs/math/0606300) reviews the two-party aimed-fire equations and related combat abstractions. [Moshe Kress, *Lanchester Models for Irregular Warfare* (2020), including its multilateral-conflict discussion](https://www.mdpi.com/2227-7390/8/5/737) illustrates why targeting assumptions matter when extending attrition models. These are background references, not authorities for Cluster's targeting policy, defender-first rounds, landing permissions, or rounding choices. The particular combined game model above is this proposal.
