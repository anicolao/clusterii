# Cluster II implementation plan

Build the complete slow real-time conquest game defined in [VISION.md](VISION.md), preserving the architecture and interaction decisions recorded in [CLUSTER_II_DESIGN.md](CLUSTER_II_DESIGN.md). Deliver each milestone as a playable, tested increment. The predecessor supplies reusable code and assets; its mock encryption, random winner, single-owner stars, and display-only routes do not become game rules.

This plan defines work and acceptance criteria. It does not claim that the application exists or resolve gameplay choices still under review.

## Delivery sequence

| Milestone | Player-visible outcome | Depends on |
| --- | --- | --- |
| 0. Rules and design contract | A complete, consistent description of how to play and win | Current design review |
| 1. Application foundation | Open a versioned browser build and sign in | Infrastructure decisions from 0 |
| 2. Authoritative game service | Submit actions and recover the same game after reconnecting | 1 |
| 3. Lobby and galaxy | Join a faction, start a game, inspect a fair generated galaxy | 0–2; selected art direction |
| 4. Economy and construction | Develop systems, produce resources, and direct market focus | 3 |
| 5. Research and intelligence | Research all eight technologies and gather partial intelligence | 4 |
| 6. Fleets and travel | Assemble forces, plan routes, and arrive at other systems | 5 |
| 7. Combat and occupation | Fight in orbit and on the surface; capture production and escrow | 6 |
| 8. Diplomacy and cooperation | Negotiate privately, form alliances, and exchange permitted resources | 3–7; private chat can begin after 3 |
| 9. Victory and repeated games | Complete a game, share victory, and begin a different alliance contest | 7–8 |
| 10. Complete player experience | Play comfortably across supported devices and recover from absence | Throughout 3–9 |
| 11. Balance and endurance | Complete sustained multiplayer campaigns without exploits or runaway failures | 9–10 |
| 12. Release and operations | Run, monitor, recover, and update the public game | 11 |

Keep PRs small enough to review by behavior. Each milestone may span several PRs. Update the prompt log with each request and use continuation records for additional commits under the same request. Do not merge review PRs without instruction.

## 0. Complete the rules and design contract

Translate the recorded ruleset into a rules specification, worked examples, and versioned balance tables. Preserve the existing concepts; settle missing parameters before the affected mechanic is implemented.

| Topic | Decisions and examples required |
| --- | --- |
| Factions | Name the four factions; define the complete four-by-four faction/star affinity matrix, bonuses, selection rules, and starting assets. Keep avatar choice separate from mechanical faction choice. |
| Galaxy | Supported player counts, galaxy size, home-system placement, star distribution, resource richness, scene-unit/light-year conversion, and starting reachability. |
| Time | Retain the inherited 15-minute tick baseline. Define command cutoff, authoritative ordering, pauses, missed-tick catch-up, and when each action takes effect. |
| Construction | Costs, prerequisites, capacity, build duration, queues, cancellations, and who can build in a system with split control. |
| Resources | Define local versus empire-wide balances, storage, fractional production, spending, transport, and transfer. Separate troop counts from aggregate empire summaries. |
| Markets | Focus-point units and total allocation, payout per market, eligible construction events, payout timing, attribution to systems, escrow treatment, and anti-abuse rules. Include another player's construction and an attempted self-payout example. |
| Research | Starting levels, level costs, selection/switching, overflow, effective tick, and bonus order. Specify whether powers apply per system or to empire totals; settle terraforming's extraction and construction effects. |
| Scanning | Define detectable fields, distance origin, refresh frequency, stale reports, sharing, and probability bounds. Reconcile `level² * 10 / distance` with zero distance and certainty at close range. |
| Fleets | Transport capacity, loading/unloading, speed versus navigation range, route changes, interception, neutral occupation, and friendly passage. |
| Combat | Assign coefficients to sides, normalize survivors for unequal effectiveness, define rounding/ties, and resolve simultaneous arrivals and multiple factions. Reconcile defender-first infantry rounds with the linear casualty summary. |
| Control | Define capture conditions for each layer, production during combat, damaged/captured developments, and the exact trigger for paying accumulated credits. |
| Diplomacy | Alliance membership, information sharing, permitted trades/transfers, withdrawal, betrayal, and treatment of allied forces and shared systems. |
| Victory | Select star/resource metrics, thresholds, eligible alliance members, ties, elimination, surrender, abandoned players, and the final settlement tick. Define incentives for changing allies across games. |

Give each game an immutable ruleset version and starting configuration. Record the tick pipeline explicitly: command application, construction, travel/arrivals, combat, ownership changes, production/escrow, research, intelligence, and victory. Determine the order in this milestone rather than allowing module implementation order to decide it.

Resolve the technical review choices alongside the rules: Firebase project and preview-data policy; object encryption versus server-filtered visibility; authentication/admin roles; supported browsers/devices; runtime versions; and migration or archival of predecessor data. Preserve selective object access whichever privacy implementation is chosen.

Choose the art direction before detailed UX design. Use the separate faction-leader, ship, and planetary-art exploration; then specify the map, system inspector, fleet planner, economy/research panels, diplomacy, and results screens. Keep the 3D galaxy, named stars, animated stellar surfaces, and sliding information panels as the inherited interaction baseline.

**Acceptance:** Every gameplay formula has examples and boundary cases; every review decision has a recorded outcome or an explicit dependency on the milestone it blocks. No unresolved rule is silently encoded as a default. Infrastructure work can proceed while unrelated balance values are reviewed.

## 1. Restore the application foundation

Port the static SvelteKit/TypeScript client, Threlte/three.js scene foundation, Firebase integration, and shared TypeScript modules. Inventory reused code/assets against the reviewed predecessor commit and preserve authorship and license notices. Pin compatible dependencies and declare each package's dependencies explicitly.

Provide reproducible Bun development commands, strict type checking, Biome, unit tests, and an emulator launcher for Auth, Realtime Database, Firestore, Functions, and Hosting. Connect all development services to their emulators. Make normal and watch builds use the same module/alias contract. Integrate checks into the existing prompt hook rather than replacing it.

Restore Google sign-in, loading/signed-out states, version identification, and a small application shell. Establish CI builds and hosted previews under the selected backend policy. Separate versioning from deployment side effects.

**Acceptance:** A clean checkout builds and starts from documented commands; two browser sessions sign in through emulators; direct links and reload work; the hosted preview identifies its exact source revision. Local tests cannot accidentally write to production.

## 2. Build the authoritative game service

Keep the command → server transition → persisted changes → subscribed client flow. Define validated command envelopes with actor identity derived from authentication, stable command IDs, game ID, schema version, and server-assigned ordering. Separate player commands from scheduler/admin operations.

Implement serialized or transactionally protected transitions per game. Commit state, ordered history, command result, and relevant summaries consistently. Deduplicate retries, reject stale/illegal actions, and expose pending/accepted/rejected status to the client. Use monotonic revisions rather than millisecond timestamps as the ordering authority.

Preserve patch replay with bounded blocks, snapshots, retention, schema migration, and gap recovery. Supply time, IDs, and random draws explicitly to transition logic so fixtures are reproducible; persist authoritative outcomes. The server retains complete state while clients receive only their permitted view or encrypted objects under the chosen privacy contract.

Implement scheduler leases, catch-up boundaries, repeat-safe ticks, and recovery after failure. Add authorization tests for direct database access as well as commands. Test wrong actors, forged payload identities, unauthorized administration, hidden objects, and replay/history leakage.

**Acceptance:** Concurrent commands cannot overspend or overwrite each other; retries and duplicate ticks have one effect; snapshot plus replay reproduces authoritative state; reconnect and game switching cannot mix games or expose another player's information. A restart midway through processing neither loses nor duplicates an accepted action.

## 3. Deliver profiles, lobby, factions, and galaxy

Restore aliases and the eight avatar choices, then add mechanical faction selection. Implement authorized game creation, capacity limits, join/leave rules, start scheduling, soft archival, and exactly-once autospawn. Provide active/completed/joinable lists with clear start and next-tick information.

Port the spiral generator and naming data. Add a stored seed, configurable player count, sufficient home stars, legal starting assets, and checks for separation, connectivity, and equivalent access to useful stars. Extend entities to represent orbital owner, surface owner, local forces, developments, and escrow independently from the outset.

Restore orbit/zoom controls, galactic-plane guides, class colours, hover/selection, labels, and the system inspector. Replace fake development values with authorized state. Provide a keyboard-accessible system list alongside the canvas and distinguish star class, faction, and ownership without relying only on colour.

**Acceptance:** Every supported player count starts with legal, distinct home systems; a duplicate join cannot claim another home; the same seed/configuration produces the same galaxy. Multiple clients see consistent public state and their own private state, including after reload.

## 4. Implement construction, production, and markets

Build M/T/B/S construction commands and panels with cost previews, prerequisites, queues, and server validation. Implement markets → credits, camps → fighters, bases → infantry, and stations → science, each with base output one per tick before modifiers.

Apply the reviewed affinity/extraction rules and maintain explicit system and empire ledgers. Route fighters/science to orbital control and infantry to surface control. Hold credits locally while control is contested and release escrow once on unified ownership. Include neutral/unowned and zero-output states.

Add empire market focus, eligible construction-event accounting, and speculative payouts. Freeze the relevant focus at the specified effective time and prevent retries, cancellations, self-construction, or trade loops from manufacturing payouts. Explain base production, modifiers, speculative income, and escrow in the UI.

**Acceptance:** Ledger fixtures reconcile every credit and unit across production, construction, and escrow. Simultaneous purchases cannot overspend. Focus changes and a second player's construction produce exactly the reviewed payout; ownership changes never duplicate stored credits.

## 5. Implement research and intelligence

Build research selection, costs, progress, level completion, and effective-tick handling. Implement all eight technologies through shared calculation functions:

| Technology | Complete implementation |
| --- | --- |
| Scanning | Distance-based acquisition of permitted star/fleet reports; timestamps and explicit stale/unknown states. |
| Navigation | Reachable-leg validation using ten light years per level, integrated into route previews. |
| Terraforming | System extraction and development eligibility under the reviewed rules. |
| Investing | Credit production scaling with the defined aggregation and rounding order. |
| Formations | Fighter effectiveness coefficients consumed by combat. |
| Melee | Infantry damage consumed by ground combat. |
| Recruiting | Infantry production scaling. |
| Innovation | Science production scaling without same-tick feedback loops. |

Use `output^(1 + level/100)` where specified, with defined precision, overflow limits, and rounding. Handle scanning probabilities at zero distance, certainty, and long range. Persist acquisition outcomes so retries do not reroll intelligence. Feed research effects into economy immediately and expose navigation/combat effects for the following milestones.

**Acceptance:** Every level produces the reviewed effect; switching research cannot duplicate progress; research completion affects the correct tick. Unknown information is absent from unauthorized responses and histories, not merely hidden by the UI. Replayed intelligence matches the original acquisition.

## 6. Implement fleets and travel

Create persistent fleets with owner, fighter/infantry complement, location, route, departure/arrival times, and order status. Implement formation, split/merge, loading/unloading, cancellation/rerouting, and friendly/neutral arrival according to the rules contract.

Turn route drawing into an order workflow: select forces, add/remove waypoints, inspect range and ETA, confirm, and receive authoritative acknowledgement. Revalidate at submission and execution where the rules require it. Apply navigation range separately from travel speed. Render actual moving fleets and last-observed enemy positions without leaking authoritative hidden locations.

**Acceptance:** Units cannot exist simultaneously in a system and fleet. Invalid routes and over-capacity loads are rejected. Travel reaches the correct destination/tick through reloads, pauses, and catch-up. Neutral expansion works before hostile combat is enabled.

## 7. Implement combat and split occupation

Implement the reviewed Lanchester square-law fighter resolver and defender-first ground resolver. Cover unequal technology, zero forces, ties, simultaneous arrivals, allied forces, multiple enemies, and troop transport after orbital losses. Use one explicit resolution order for all clients.

Resolve orbital and surface control separately. Apply casualties, control changes, development consequences, resource routing, and escrow settlement as one coherent transition. Produce combat reports that explain forces, effectiveness, losses, survivors, and resulting control using information the recipient may know.

**Acceptance:** Worked combat examples and boundary fixtures pass; arrival ordering cannot be exploited; no resolver creates units or negative counts. A full browser scenario captures orbit, leaves the surface contested, accumulates escrow, captures the surface, and receives the credits exactly once. The former surface owner continues receiving infantry only while entitled to it.

## 8. Implement diplomacy and cooperation

Deliver private rooms with explicit invitations, membership, message ordering, unread state, and recovery. Preserve the predecessor's ability to share prior conversation history, governed by the reviewed admission/revocation policy. Replace raw `@UID` access commands with clear membership controls. Enforce visibility on the server or through the selected real key-distribution implementation.

Add alliance creation, invitations, acceptance, membership changes, withdrawal, and the effects defined in the rules contract. Implement permitted resource transfers/trades with offers, expiry/cancellation, atomic settlement, and an audit trail. Define what intelligence and military access allies share; do not automatically expose every private object upon joining an alliance.

**Acceptance:** Invited participants can negotiate and cooperate; outsiders cannot retrieve messages or intelligence through direct requests or old patches. Concurrent trade acceptance settles once. Withdrawal changes future permissions without pretending to erase information already seen. Membership changes cannot evade combat or victory rules.

## 9. Implement victory and the repeated-game loop

Replace the single random winner with the reviewed star/resource objective and alliance eligibility rules. Show progress and explain qualifying control, resources, and contributions. Evaluate victory at the specified point in the tick after the relevant settlement steps.

Implement elimination, surrender, abandoned-player handling, ties, shared winners, and terminal state. Freeze further gameplay mutations at completion while preserving authorized chat/history access. Provide a results screen, campaign history, and return-to-lobby/rematch flow.

Implement the chosen cross-game incentives for different alliances. Store only the history needed by that policy and expose its effects before players join; use repeated-game simulations and playtests to detect permanent-bloc advantages.

**Acceptance:** A multiplayer campaign can start, develop, research, fight, cooperate, and end with correct shared results. An alliance cannot add ineligible winners at the last instant. Completed games stop consuming tick work and retain a consistent replay and results record.

## 10. Complete the player experience

Develop this work alongside milestones 3–9. Apply the selected art direction to faction portraits, ships, star/system views, panels, icons, and reports, preserving asset provenance. Complete the full information hierarchy: galaxy, systems, fleets, economy, research, diplomacy, activity, and victory.

Support the selected desktop and phone viewports, touch and keyboard navigation, readable ownership/production displays, focus management, reduced motion, and useful loading/error states. Bound label density and rendering cost for the maximum supported galaxy. Provide textual access to all gameplay actions represented in the canvas.

Add first-game guidance and an in-game rules reference. A returning player sees what changed, pending orders, relevant messages, resource changes, and next scheduled events. Decide notification channels during UX review; notifications supplement the authoritative in-game activity history.

**Acceptance:** Representative players complete the entire loop without developer assistance. Every action is usable through the supported input methods; private information remains private in reports and notifications. Errors and stale views explain recovery without requiring a refresh or losing unsent work silently.

## 11. Verify balance, scale, and long-running play

Run deterministic simulations across map seeds, faction matchups, player counts, market focuses, research paths, combat ratios, and alliance compositions. Measure starting opportunity, snowballing, economic growth, dominant strategies, time to victory, and benefits of cooperation. Test adversarial trading/construction and alliance membership patterns against the selected rules.

Run accelerated full campaigns and real-cadence multiplayer soak sessions. Exercise background tabs, disconnections, server restarts, delayed schedulers, duplicate deliveries, deployments during active games, and restoration from backups. Measure database reads/writes, history size, tick duration, client memory/rendering cost, and hosting/function costs at the supported scale.

**Acceptance:** Publish the measured operating limits and balance results. Every supported configuration completes within those limits; recovery preserves accepted orders and resources. Version balance changes for new games and apply any active-game changes through an explicit migration policy.

## 12. Release and operate

Document deployment, compatible client/server/schema rollout, rollback, backup/restore, incident response, game administration, and retention. Establish alerts for overdue ticks, command failures, authorization violations, abnormal resource growth, and storage/cost limits without logging private chat content or keys.

Rehearse the selected predecessor-data migration or archive policy; do not silently replace existing games. Verify production authentication, roles, security rules, scheduler, indexes, secrets, and hosting against the reviewed environment policy. Publish player-facing rules, help, and support/reporting routes.

**Acceptance:** Restore a campaign into a clean environment, deploy and roll back a compatible change, and complete a hosted multiplayer smoke campaign. Release only after the full game loop, privacy checks, operating limits, and recovery procedures have evidence.

## Verification and completion standard

Each feature includes shared-rule tests, applicable Firebase emulator tests, and browser journeys through ordinary player controls. Add visual checks for changed screens using reproducible states. Use independent players/sessions for concurrency, diplomacy, and visibility tests; do not substitute admin-injected state for the main end-to-end journey.

| Layer | Required evidence |
| --- | --- |
| Rules | Worked examples, rounding/boundary cases, conservation invariants, seeded results. |
| Service | Authorization, validation, atomicity, retry safety, tick recovery, replay and migration. |
| Browser | Sign-in → join → build → research → travel → conquer → negotiate → win, with reload/reconnect throughout. |
| Privacy | Direct API/database attempts, unauthorized history access, alliance changes, and stale intelligence. |
| Presentation | Supported viewport/input coverage, readable state, no placeholder labels or fake values. |
| Operations | Hosted revision verification, scale measurements, backup restoration, and rollout/rollback rehearsal. |

The game is complete when all four factions, four developments, eight technologies, market speculation, fleets, both combat layers, credit escrow, diplomacy, alliance victory, and repeated-game incentives operate together in a sustained multiplayer campaign. Documentation, accessible controls, provenance, security, and operational recovery are part of that completion—not a separate follow-up project.
