# Cluster rules — v0.1.0

This is the step 0 rules contract for review. Its numeric configuration is [cluster-v0.1.0.json](rules/cluster-v0.1.0.json). Approval fixes a version; balance changes create a new version for new campaigns. Existing games retain their original rules. The [delivery table](docs/design/DELIVERY_REVIEW.md) records implemented slices and their acceptance limits.

## 1. Campaigns, factions, and the galaxy

Public campaigns contain 4, 8, or 12 players. Every faction has exactly one quarter of the seats. A player selects a faction and cosmetic portrait before claiming a seat. Duplicate joins are idempotent. A waiting player can leave and release their seat; a started game admits no replacements. Only an operator creates or archives public games. Full games start automatically on the next UTC quarter-hour boundary; there is no ready-up or manual Start control. Tick 0 assigns homes; the first production tick occurs 15 minutes later. Autospawn creates one replacement lobby when the full lobby starts.

| Faction | Species | M | G | A | O |
| --- | --- | ---: | ---: | ---: | ---: |
| Pelagic Concord | Aquatic | 1.4 | 1.0 | 0.8 | 1.0 |
| Heliac Assembly | Humanoid | 1.0 | 1.4 | 1.0 | 0.8 |
| Vesper Synod | Insectoid | 0.8 | 1.0 | 1.4 | 1.0 |
| Dracon League | Reptilian | 1.0 | 0.8 | 1.0 | 1.4 |

Affinity multiplies production, not combat or ship speed. A portrait adds no ability. Each home is the owner's favored class and begins with both layers controlled, 200 credits, 20 fighters, 20 infantry, two markets, one camp, one base, and one station. All other stars begin unclaimed with zero developments/forces/escrow. Every empire starts with scanning, navigation, formations, and melee at level 1; other technologies start at 0.

The generator creates 32 stars per seat in a shallow spiral. One scene unit is ten light years; gameplay uses actual 3D Euclidean distance. Each class occupies exactly one quarter of the map. Names are unique within a campaign; IDs, seed, generator version, and final coordinates are persisted once. The seed is server-private because it reconstructs hidden map information.

Generate repeated, rotated starting neighborhoods with the same distances and class mix, assigning each home to its favored class. A home has at least one of each of the other three classes within ten light years. Stars are at least two light years apart; homes are at least twenty light years apart. The graph connecting stars within ten light years is connected. Home-neighborhood class counts within twenty light years differ by at most one per class. Choose seat placement with recorded server randomness. Reject maps failing these constraints; after 1,000 attempts report generation failure instead of starting an unfair game. Resource richness is exactly 1 for every star in this version; planetary imagery adds no unlisted resource.

## 2. Time, commands, and tick order

Ticks occur every fifteen minutes on UTC quarter hours. The server clock is authoritative. An admitted command receives a server sequence and effective tick; receipt strictly before a boundary targets that tick, receipt at/after it targets the next. A pending browser submission has no guaranteed cutoff. An admitted command reserves costs/units; its tick execution revalidates ownership and prerequisites. Failure releases reservations and reports the reason without charging twice.

Economic and military commands execute at ticks. Chat, reading, and conversation invitations execute immediately in their own ordered stream; they cannot move resources or forces. Acceptance of alliance/trade offers is an economic command. Within a phase, use admitted server sequence, then command ID to break any impossible duplicate-sequence condition; no client timestamp decides priority.

For tick T, process these phases in order:

1. Freeze eligible commands, beginning-of-tick research levels, development counts, market focuses, and existing routes. A crash resumes this same frozen batch.
2. Resolve surrender and matured alliance departures, then alliance admissions and economic settings (focus/research target). Commands submitted after the boundary wait for T+1.
3. Execute trade acceptance, construction cancellation/new orders, fleet loading/splitting/merging and departures, in admitted sequence. Revalidate resources, capacity and ownership. Departures occur before arrivals; one-tick travel first arrives at T+1.
4. Resolve scheduled fleet arrivals, orbital combat, and automatic ground assaults. Process stars by stable ID; resolve multi-party combat as described below. Assign layer owners and release escrow on unified ownership.
5. Advance construction under the surviving owner's control; finish eligible developments. Captured queues are canceled before this step.
6. Produce base resources using the beginning-of-tick levels and the developments completed by this phase. Distribute dividends from today's noncanceled construction completions. Credit escrow or recipients as appropriate.
7. Allocate science to the selected track; complete levels, retaining overflow. New technology applies at T+1, including capacity, movement, and scanning.
8. Acquire intelligence using frozen levels and settled locations. Commit reports and activity. Compute elimination and alliance eligibility.
9. Evaluate victory/holding progress and campaign deadline after all settlement. Publish the complete revision and acknowledgements together.

No player can pause a public campaign. Operators can pause for maintenance; paused wall-clock time does not accrue ticks or advance deadlines. On recovery, replay missed unpaused ticks in order, at most 96 per worker batch, renewing the lease between batches. Commands admitted while catching up target the first future boundary after catch-up, not a historical tick. Show Awaiting next tick rather than calculating earnings in the browser.

## 3. Holdings, balances, and construction

Every layer has one player owner or is unclaimed. Alliance membership does not merge ownership. Orbital fighters and surface infantry are local units, not globally spendable balances. Credits are an empire-wide wallet; science is progress on technology tracks. Each system retains its own credit escrow and fractional troop-production remainder. A troop transfer requires actual transport, not a wallet update.

Credits and science use nonnegative integer milliunits (three decimals). Fractional fighters/infantry accumulate at their source until a whole unit exists. Use decimal arithmetic with at least 24 significant digits; floor to milliunits after each explicitly named production stage, never round with browser floating point. Units and levels are integers. Wallet arithmetic is checked for overflow; no accepted command produces a negative balance. Each player has a one-million-unit limit per force type; excess production is discarded with a ledger entry, not silently wrapped.

| Development | Required layer | Cost base | Build time | Base output |
| --- | --- | ---: | ---: | --- |
| Market | Surface | 80 credits | 4 ticks | 1 credit/tick |
| Training camp | Orbit | 60 credits | 4 ticks | 1 fighter/tick |
| Base | Surface | 60 credits | 4 ticks | 1 infantry/tick |
| Space station | Orbit | 100 credits | 4 ticks | 1 science/tick |

For a type at a system, price is `ceil(baseCost * 1.15^n)` credits, where n counts its completed developments plus accepted queued orders at the moment of admission. Reserve that quote; later cancellation of another order does not reprice it. Maximum completed-plus-queued count per type is `8 + terraformingLevel`. Each layer has one serial construction queue of at most four orders. No additional technology prerequisite exists. Starting structures count toward n.

An order accepted for T begins after T's arrivals and first advances at T+1; four advances complete it at T+4. A queued order starts when the preceding order finishes, with its first advance next tick. Construction completion produces output that tick. Canceling before its first advance refunds 100%; after progress begins it refunds 50%, floored to milliunits. A completed structure cannot be canceled or demolished for a refund. Changing layer ownership cancels all its queues, refunding nothing; completed structures survive and serve the new owner. An order invalid before its first execution releases its full reservation. Building on a layer you control remains legal while the other layer is hostile.

## 4. Production, escrow, and markets

For n completed developments of one type, using the controlling player's affinity A and terraforming level T:

`raw = floorMilli((n * A)^(1 + T/100))` (zero developments gives zero).

Fighter output is raw. Infantry output is `floorMilli(raw^(1 + Recruiting/100))`; whole units are placed locally and fractional remainders stay at that system. Surface capture transfers that layer's fractional remainder with it. Science and normal credit output have empire-level bonuses:

- Sum raw station science over the player's orbital holdings; apply `floorMilli(sum^(1 + Innovation/100))` once and add it to selected-track progress.
- For each surface owner, sum raw market income; apply `floorMilli(sum^(1 + Investing/100))` once. Apportion the result back to producing systems in proportion to raw income, flooring each share then assigning leftover milliunits by fractional remainder and stable system ID.
- Each system's credit share enters its surface owner's wallet only if that same player owns orbit. Otherwise it enters that system's escrow. An unclaimed surface has no production. Winning orbit alone never collects a rival's escrow.

Escrow pays once when the two owners become the same non-null player, before the new tick's production. Different allied players still count as split control. Markets on a surface remain productive while its orbit is hostile. Space camps/stations always produce for the orbital owner; bases produce for the surface owner.

Market focus consists of 100 integer points across Market/Camp/Base/Station, initially 25 each. It may contain zeros but must sum to 100. A focus command becomes effective in phase 2, but dividends for T use the focus frozen at the beginning of T; therefore it first affects dividends at T+1.

A construction completion creates one dividend pool equal to 10% of its actual paid price. For every market existing at the beginning of T and still under the same surface owner in phase 6, weight is `marketCount * focusForBuiltType / 100`. Exclude the builder's own empire; allies may qualify. Divide the pool by these weights, floor to milliunits, and distribute remaining milliunits by largest remainder then stable system ID. A zero-weight pool pays nothing. Credit shares follow each recipient system's escrow rule. Newly completed markets begin earning dividends the following tick.

Dividends are paid by the game, not charged again to the builder. They receive no further affinity, terraforming, or investing multiplier. Cancellation, capture-cancellation, a failed build, starting assets, or a duplicate completion pays nothing. This bounded pool prevents construction rings from minting more credits than their construction costs. It deliberately replaces an unlimited per-focus-point payout; review this choice explicitly.

## 5. Research and intelligence

All eight technologies are available from the start and cap at level 10. Level L → L+1 costs `20 * 2^L` science. Science goes to one selected track; changing the selection retains progress on the old track. Overflow can complete multiple levels of the selected track in phase 7, up to the cap; any remainder at cap stays banked on that track until a target switch moves that remainder to the new target and clears it from the capped track. Further science received while a capped track stays selected joins that same bank. No progress or science is tradable. The default target is Navigation. No investment applies itself again during the tick in which it completes.

| Technology | Effect |
| --- | --- |
| Scanning | Observation probability `min(1, 10 * L² / distanceLy)` per target/tick; own holdings/forces are current without a roll. Distance zero is certainty. |
| Navigation | Each route leg must be at most `10 * L` light years; it does not change speed. |
| Terraforming | Extraction exponent above; type capacity increases one per level. |
| Investing | One exponent on aggregated raw normal market income, before system apportionment. |
| Formations | Fighter combat coefficient equals level, minimum 1. |
| Melee | Ground frontage damage per round equals level, minimum 1. |
| Recruiting | Per-system infantry-production exponent above. |
| Innovation | One exponent on aggregated raw station science. |

The catalogue of star names, classes, and positions is public; it enables route planning. Ownership, developments, exact forces, queues, escrow, and hostile fleet positions are not public. Sensing originates at every star whose orbit the observer owns and every fighter fleet they own; use the nearest sensor and one persisted random draw per target/tick, not a roll per sensor. Unknown enemy fleets have no marker or count. A successful scan reports the target's current owners, completed developments, stationed forces, and (for fleets) position/composition. It does not reveal queues, orders, private destination, wallets, research, escrow, or messages. Own layers show their complete relevant state; own wallets and research are always current.

A report includes observed tick, recipient, and permitted source. A failed later scan leaves that report stale; no movement interpolation uses unobserved enemy positions. A report does not make future changes visible. Explicit intelligence sharing transfers selected observation versions, not live subscription rights. The server's random seed and draws never become public client replay inputs.

## 6. Fleets, passage, and arrival

A fleet contains at least one fighter; every surviving fighter transports up to ten infantry. There are at most 128 fleets per empire and sixteen waypoints per route. Departing consumes local units; splitting/merging at a stationary location conserves forces and preserves capacity. Only your own units can be loaded. Loading surface infantry requires your own unified control; unloading on an allied surface transfers no ownership and creates your supporting contingent there.

Travel speed is two light years per tick. Duration per leg is `max(1, ceil(distanceLy / 2))`. Validate all known legs against Navigation at admission; validate again on departure of each leg using the level then in effect. No fuel cost or mid-flight interception exists. Empty waypoints, repeated adjacent waypoints, and identical origin/destination are rejected. Traveling fleets cannot be split, merged, loaded, canceled, or redirected. Before departure, canceling releases reservations; at a waypoint an unstarted onward route can be edited for the next tick. Default friendly/neutral arrival ends movement until the next tick; no instantaneous multi-leg travel occurs.

Use Euclidean coordinates without rounding before range comparison. Render a rounded distance separately. A leg exactly at range is legal; one beyond it is rejected. An enemy destination can be targeted with unknown forces, with that uncertainty explicit in the review.

Alliance members grant mutual military passage/support. Nonallied fleets entering an occupied orbit are hostile automatically. Arrival at an unclaimed orbit captures it with surviving fighters; claiming an unclaimed surface requires at least one infantry. Hostile ground assault is automatic only after the arriving coalition controls orbit and has infantry to land. An orbital winner with no infantry leaves surface ownership unchanged. Friendly ground support may stay with the surface owner. No separate Attack button exists.

Orbit retains ownership without a garrison until another coalition arrives. Surface retains ownership without infantry until occupied by a hostile infantry force. On loss of an orbital battle, transported infantry attached to eliminated fighter contingents are lost; surviving fleet capacity is recalculated and excess transported infantry is lost, distributed proportionally. Infantry already on the surface survive the loss of orbit.

## 7. Combat and ownership

Combat resolves immediately within the arrival phase; rounds are mathematical steps, not fifteen-minute ticks. Coalition means one alliance or one unallied empire. Forces of one coalition at the same layer combine. Use their unit-weighted mean technology coefficient, floored to an integer, minimum 1. Only surviving fighter coalitions can land carried infantry for hostile/unclaimed surface occupation; landed survivors become local surface contingents and leave the fleet manifest. On a friendly surface, cargo stays aboard until an explicit unloading order. After combat, distribute total survivors among contributing owners in proportion to their initial counts, with largest-remainder allocation and stable player-ID ties. No contributor receives more than it supplied.

For fighters A and B with coefficients a and b, compare `a*A²` with `b*B²`. If A wins, survivors are `floor(sqrt((a*A² - b*B²)/a))`; if B wins, reverse the expression and divide by b. Equal weighted strength destroys both forces. A mathematically positive remainder that floors to zero leaves neither force. Coefficients improve the side that owns them; an enemy's coefficient is never accidentally applied as its own bonus.

Ground uses a single constrained frontage. Every round, defenders inflict d casualties, then surviving attackers inflict a casualties. Damage is coefficient per frontage, **not army size times coefficient**. Stop immediately when one side reaches zero; nobody attacks after being eliminated. This is linear attrition with a defender-first tie advantage. For A attackers and D defenders, let `q = ceil(A/d)` and `r = ceil(D/a)`: if r < q, attackers survive with `A - r*d`; otherwise defenders survive with `D - (q-1)*a`. Zero-force occupation needs no round. This precise model replaces the draft's unqualified linear subtraction when defender-first timing changes the answer.

For more than two hostile coalitions, the incumbent owner's coalition is defender. If none exists, select the first coalition by a recorded permutation derived from a server-private combat seed, tick, layer, and star. Resolve challengers in that same recorded order. A surviving defender keeps its place; a victorious challenger becomes defender against the next. When both vanish, the next coalition becomes defender. Apply final ownership once after the entire sequence; no intermediate winner collects escrow. This ordering is deterministic and auditable to participants, not chosen by network arrival speed.

An allied incumbent retains its title. Otherwise the surviving coalition member with the most survivors on that layer becomes owner (stable recorded tie-break). Capturing orbit uses fighter survivors; capturing surface uses infantry survivors. No title transfers through alliance admission alone. If all orbital forces are destroyed, orbit becomes unclaimed; ground defenders can retain surface control. Completed developments survive capture. Allied units sharing a layer when their alliance ends become hostile at the next arrival/combat phase, even without new fleet arrivals.

## 8. Conversations, alliances, and exchange

Conversation membership is separate from alliances. The room creator manages invitations/removal. An invitation chooses future-only history or named earlier message ranges; joining does not silently reveal everything. Removing a member revokes future messages, not knowledge already disclosed. Rotating membership creates a new key version. Messaging does not bind military, trade, or alliance terms.

An empire belongs to at most one alliance. Alliances contain 2 through floor(playerCount/2) members. Every current member consents to admission; the invitee consents too. Membership becomes active in phase 2 after all consents are present. Admission grants military passage/support and the ability to share victory, but no automatic live intelligence or conversation access.

Each alliance member must remain continuously admitted for 96 ticks before qualifying for victory. Requesting departure announces it immediately, matures after 96 ticks, and resets the alliance's victory hold immediately. During notice, passage and mutual nonaggression remain; a departing member is ineligible for victory. On departure, remove future shared grants and impose a 96-tick cooldown before joining/forming another alliance. No expulsion bypass exists; a two-member alliance dissolves when one departure matures. Consent does not transfer star titles or existing forces.

Offers exchange credits and/or explicit immutable observation reports. No stars, troops, research progress, or future promises can be bound in v0.1.0. A unilateral gift uses an empty return side. Each offer names counterpart, exact terms, report timestamps, and expiry; default expiry is eight ticks. Editing creates a new offer and withdraws the old one. The issuer reserves offered credits until settlement, withdrawal, or expiry. Acceptance reserves the counterparty's credits and settles both sides in phase 3 or releases all reservations on failure. Expiry occurs at the beginning of its expiry tick. Cancellation/acceptance races follow admitted sequence; settlement occurs once. No market dividend attaches to a trade.

## 9. Victory, departure, and repeated games

The objective is **shared territorial victory**. Resources support conquest and appear in ledgers but are not an alternative victory condition in this version. An alliance qualifies only when it has at least two noneliminated eligible members from distinct factions. A star counts only when one eligible member owns both orbit and surface; split ownership between allies does not count.

The threshold is `ceil(totalStars * (0.60 + repeatPenalty))`. Hold that many qualifying stars for eight consecutive settled ticks. Loss of a star below threshold, membership change, departure notice, loss of eligibility, or changed qualifying member set resets the hold. The repeat penalty is fixed at campaign start: for each pair, inspect their last three completed public campaigns in which both participated; each shared victory adds two percentage points, capped at six. The alliance uses the largest pair penalty among its members. Pair history and threshold are visible in the pre-join briefing and alliance review. Private development campaigns never affect it.

This rewards new partners through a lower objective rather than loot, a prestige currency, or a ranked ladder. It is an explicit balance hypothesis to evaluate over repeated games. No solo victory exists, and two alliances cannot both reach a threshold above half the map simultaneously. If corrupt or migrated state makes that possible, stop settlement for operator recovery rather than inventing a tie winner.

A campaign ends in shared victory after phase 9 or in a no-winner draw at tick 2,880 (30 days), with victory checked first. Surrender is explicit confirmation, becomes effective in phase 2, removes the player's forces, makes their layer titles unclaimed, cancels queues/offers without refunds, and forfeits their wallet/research. Structures and system escrow remain. The surrendered player leaves the alliance immediately, resetting its hold. Elimination occurs when a player owns no layer and has no surviving units; an eliminated member leaves their alliance immediately and resets its hold; credits alone cannot preserve participation. Elimination performs the same cleanup. Neither status grants omniscient history.

Offline players continue producing and following accepted orders. Seven days without access marks the player inactive for the roster; inactivity never automatically surrenders them or lets another identity take their seat. Operators can end a broken campaign as no-contest but cannot award a fabricated victory. Terminal games reject new gameplay commands, allow existing authorized conversations/history, and stop scheduled production. A new campaign never automatically recreates an alliance.

## 10. Worked examples and boundaries

These are review fixtures, not claims of a running reducer. Numeric results follow the versioned table and explicit rounding above.

| Case | Inputs | Result |
| --- | --- | --- |
| Home income | Two markets, favored affinity 1.4, Terraforming/Investing 0 | 2.800 credits/tick; zero markets gives 0, never `0^0`. |
| Recruiting | Two bases, favored affinity, Terraforming 0, Recruiting 5 | `floorMilli(2.8^1.05) = 2.947` infantry/tick; first tick yields 2 units and .947 remainder. |
| Investing | Raw empire market income 1,000, Investing 5 | 1,412.537 credits before proportional apportionment. |
| Construction | Third market at a system with two markets, no queued market | `ceil(80 * 1.15²) = 106` credits; accepted T=7 completes T=11 if control persists. |
| Cancel | Paid 106; no advance / at least one advance | Refund 106.000 / 53.000; captured queue refunds zero. |
| Market dividend | Completed purchase cost 100; other empires' qualifying weights 3 and 1 | Pool 10.000; payouts 7.500 and 2.500. Builder gets zero. No weights means zero payout. |
| Split control | Surface produces 2.800, orbit belongs to rival, escrow 60 | Escrow becomes 62.800; neither wallet gets it. Unified capture next tick pays 62.800 once, then normal production goes to the new owner. |
| Research | Navigation 1 with progress 39, earns 2.800 | Cost 40; reaches level 2 with 1.800 progress, range remains 10 ly this tick and becomes 20 ly next tick. |
| Scanning | Level 1 at 10/100/0 ly | Probability 1 / .1 / 1. At level 2 and 100 ly: .4. No successful roll means stale, not zero. |
| Travel | Navigation 1, distance 10 ly, departure T=4 | Legal, five ticks, arrival T=9. At 10.001 ly it is illegal; rounded UI text cannot legalize it. |
| Capacity | Ten fighters, 100 infantry; battle leaves six fighters | Capacity falls to 60; forty transported infantry are lost before landing. |
| Orbital advantage | A=1,000, B=500, a=b=1 | A retains 866 fighters after flooring. |
| Unequal formations | A=100, B=100, a=2, b=1 | A retains 70, not 100; divide surviving weighted strength by winner's coefficient. |
| Orbital tie | A=B=100, a=b=1 | Both zero; neither takes orbit. |
| Ground linearity | A=1,000, D=250, a=d=1 | q=1,000, r=250; attacker retains 750. |
| Defender-first tie | A=D=100, a=d=1 | Defender retains one; attacker does not get a final strike. |
| Unequal melee | A=100, D=100, a=2, d=1 | q=100, r=50; attacker retains 50. |
| Allied split title | Ally X owns orbit, ally Y owns surface | Escrow stays held and star does not count for victory. |
| Victory | 4 seats, 128 stars, no repeat penalty | Two distinct-faction members, each eligible for 96 ticks, hold 77 unified stars for eight ticks. |
| Repeat partners | Same map; pair won twice in their last three shared public campaigns | Four-point penalty; need `ceil(128 * .64) = 82` stars. |
| Failure/retry | Duplicate paid build or accepted trade command | One reservation, one effect, one result; no repeated dividend or escrow release. |

The closed-form ground resolver must be checked against explicit round simulation in milestone 7. Production examples use decimal flooring, and multi-party examples must assert final ownership before escrow release. Balance acceptance requires the campaign simulations in milestone 11; selecting constants here does not establish that they are balanced.
