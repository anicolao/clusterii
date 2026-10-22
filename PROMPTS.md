# Project prompts

User prompts are recorded verbatim below, in conversation order.

## Prompt 1: Define Cluster

We're going to be working on a space conquest game inspired by "Neptune's Pride" with different, slightly more complex mechanics. Write a brief README.md and VISION.md for this project. Here is the draft of the ruleset: Cluster
The central goal of Cluster is to be an obsessive slow real-time strategy game in which the players compete to dominate the galaxy, but in which no single player has the resources or power to win on their own, making diplomacy and cooperation key to establishing a winning alliance or a winning play.
Like many diplomacy games, Cluster games are likely to have their share of betrayals but I believe the better game experience will be one that rewards alliance formation and meta-game play so that the dominant experience of the game is one where players are challenged to form alliances that win the game, and yet are incentivised to form alliances with different players each time ensuring uniqueness and “fairness” for gameplay.
Cluster’s game concepts are meant to be few in number, with richness of choices and game flavour provided by subtypes within each concept that create matrices of possibility, exploding the game complexity or collapsing it as desired by having fewer or more elements of each type.
Central Concepts
The game will be built around the following central concepts:
Stars, the proxy for territory, need to be controlled and their planetary systems’ resources harvested efficiently in order to win the game. Ultimately, control of either a sufficient number of stars or a sufficient number of resources will be the metric for victory.
Stars will have types according to the real classification system for stars, which include class O, B, A, F, G, K, M. Possibly not every class will be needed to create sufficient flavour, for the starting game I think we should select 4 classes of the 7 and see how that plays.
TODO: Make female and male versions, and/or androgenous versions.
TODO: Remove backgrounds (eg: the square and circle backgrounds)
M - Red Dwarf eg: Betelgeuse (coolest, smallest)
Slimy water creatures

G - eg: Sol
Humanoid creatures

A - White Dwarf
Insectoid creatures

O - Blue (hottest, largest)
Reptilian creatures

Factions, each with a bias towards a particular star type that enables better use of those stars’ planetary systems.
Faction names and powers will be arbitrary and a potential source of story/flavour text for the game.
Possibly it will be desirable to have two faction types per star type so that there is variety even within a certain star type choice
To start, 4 factions seem desirable.

Just between 4 star types and factions we already have a matrix of 16 possibilities for game play, each cell of which can affect all other parameters of the game.
Developments, which one can think of as “buildings” that harvest planetary resources and turn them into currency that can be spent in some way.
Galactic credits can be produced by markets, which also enable interstellar trading and speculation
Fighter pilots can be produced by military satellite training camps, and are the main mechanism for taking over orbital space around a system
Infantry can be produced by military bases, and are the mechanism for taking over control of a system’s production facilities
Scientific research is conducted in space stations, which produce science knowledge for the empire

In other words, at each star the user can build M/T/B/S - Markets, Training Camps, Bases, and/or Space Stations, which each will produce credits, fighters, infantry, and science respectively. These global resources will be one way to gauge a player’s position within the galaxy, with more being better and faster production of each being superior. It might be easier to parse as M/B T/S, because (M/B) produce on the surface, and T/S produce in space.
Fleets, which are organised groups of fighters and infantry that can be sent off through hyperspace to conquer an enemy system. 
Combat and Control
It is the player’s goal to control as many star systems as possible, but control of a star system is determined by control of two entirely orthogonal levels: control of the space surrounding the planets, and control of the ground surface of the planets.
Controlling space enables harvesting all the research results of satellites that produce science, while also containing all production of galactic credits and isolating them to the system in question. Once ground control and space control are established in the hands of a single faction, any accumulated credits will be granted to the victor; but while a star system is contested in terms of space versus ground control, accumulated credits are sequestered and increase the value of the eventual conquest.
Fighter pilots, similar to science, are produced in space and go to the faction that controls space around a system, while infantry are produced on the ground and credited to the faction that controls the surface of the system.
Lanchester’s laws provide a way of modelling these two types of fights, where we assume that taking a planet consists of infantry fighting in narrow corridors to control space elevators or other constrained access points and therefore should be modelled with Lanchester’s linear laws, while we assume that fighter pilots engage in ranged combat and should follow Lanchester’s square law. Here is a nice youtube ,overview of these combat types.
Markets 
Markets are developments which enable the transfer of goods and services required to build all developments including markets themselves. As part of “market making” the markets you own naturally collect a percentage of the value of all those transactions, enabling your empire to invest in further developments.
For each market you build, it will produce one galactic credit per tick on its own. In addition, in your market focus screen you can configure the percentage of focus your markets have on each of the development types, M/T/B/S, and each time one of those developments is built by any other player, your market produces 1 credit per focus point. If you are sufficiently prescient to guess where other players will put most of their investment, your markets will extract correspondingly more value from the underlying transactions.
If you research investing, the total credits produced by your markets is taken to the power 1.XX where XX is your investing research level. So if you were producing 1,000 credits but had researched investing 5, your empire would collect 1412.53 credits.
Training Camps
Your space bound explorations require satellite training camps to entice bright young minds to learn how to pilot your fighter ships to effectively dominate space. In space, there are so many dimensions for combat, and the range of the lasers is vast, that all units can attack all other units in a star system at any given time, lending much weight to the tactics and formations that can be learned in training camps.
Each training camp produces one fighter per tick. When combat between fighter groups A and B happens, the number of survivors is sqrt(αA2 - βB2), and the order of the subtraction determines who wins (that is, if αΑ2 - βB2 < 0, A loses; reverse the equation). Here is a sample table of outcomes to give a sense of this with both players at tactics 1:
A
B
A Wins
B Wins
1000
250
968


1000
500
866


1000
750
661


1000
950
312


1000
1001


45
1000
1250


750
1000
1500


1118
1000
1750


1436


As can be seen in the above table, small edges in fighter ships lead to decisive victories in space. If you research formations, each research level increments your coefficient β by one.
Bases
Training camps are developments which produce infantry units suitable for defending your systems planetary resources or being transported in fleets to conquer other systems. Each training camp produces one infantry per tick on the system where the training camp was built. In combat, each infantry unit does 1 damage to the other party per round.
If you research recruiting, your produced infantry are taken to the power 1.XX where XX is your recruiting level. If you research melee fighting, the damage of an infantry unit is XX where XX is your melee level. Melee fighting is done in rounds, with the defenders doing first damage, until one side is reduced to nothing. Similar to the space case, this can be summarised as the remaining troops are αA - βB for initial sizes A, B and the positive orientation of this formula tells you who would win. For two armies with melee 1, here is an example set of outcomes:

A
B
A Wins
B Wins
1000
250
750


1000
500
500


1000
750
250


1000
950
50


1000
1001


1
1000
1250


250
1000
1500


500
1000
1750


750


Here we see that victory is directly proportional to the size of the invading army and casualties are directly proportional to the size of the defending army.
Space Stations
Each space station you build produces 1 research point per tick towards your chosen area of research. The possible research areas are:
Scanning
Navigation
Terraforming
Investing
Formations
Melee
Recruiting
Innovation
Scanning gives you a probability of sensing data about star systems and fleets X light years away from you at (level2 * 10) / X, so at level 1 scanning you can sense information within 10 light years accurately every tick, while at a distance of 100 light years your chances are only 1/10 of acquiring any sensor data.
Navigation enables your fleets to travel to far away systems. Each level of navigation enables your captains to successfully reach systems that are level * 10 light years away.
Terraforming enables you to build developments on planets. Each level of terraforming  takes your resource extraction for the system to the power 1.XX where XX is your terraforming level.
Investing, formations, melee and recruiting are technologies that affect markets, training camps, and bases respectively as already described.
Finally, Innovation takes the total science produced by your empire to the power 1.XX where XX is your innovation level.

## Prompt 2: Assertive Design

remove verbiage like "initial" "tentative" "provisional" etc from these documents. Write as though the end state is determined. It isn't "Affinities should create complementary strengths..." it's "Affinities create complementary strengths". Be brief and assertive.

## Prompt 3: Adopt Prompt Hygiene

let's adopt the prompt hygeine of ../beyond for this project. Review that, create PROMPTS.md and put up PR#1 for this project, which also needs a new GPLv3 public github repo created by gh

## Prompt 4: Share Repository

this repo should be shared with AndrewBlackledge, same as my TODO repo, he should have maximum permissions. please fix

## Prompt 5: Clarify Continuation Log

OK we can't figure out what PROMPT_WORK.md is about. IT isn't referenced, is empty, and appears to serve no purpose. this is blocking landing the PR

## Prompt 6: Preserve Prior Design

We had a prior partial implementation in ../cluster. We probably want to preserve almost all if not all of the technical and design decisions in that project. Write CLUSTER_II_DESIGN.md that captures all you can learn from that project for us to review in case there are things we want to do differently. Put that up as PR2 (PR1 is merged)

## Prompt 7: Art Direction

You are going to be in charge of artistic and UX direction for this project. You'll need a new worktree to design in. Review the art style and overall plan in the old cluster project, but don't be constrained by it. For starters, let's make an art board of faction leaders, in at least 4 different art styles for us to choose between. Also generate some space ship and planetary space art in these art styles. Our goal is to choose an artistic direction before we start in on UX design. The old cluster project is in ../cluster, let's put our new art direction stuff in docs/art/ART_DIRECTION_OPTIONS.md and choose any logical location for generated images.

## Prompt 8: Plan Full Implementation

We are reviewign this summary. Write an IMPLEMENTATION_PLAN.md to lay out the steps to implement this game in full.

## Prompt 9: Refine Forward Design

OK also review the design and implementation of ../pantheon for its ideas regardign deployment (github pages) and UX (app-focused design aesthetic). Update the implementation plan accordingly. Let's rename the CLUSTER_II_DESIGN.md to CLUSTER_I_DESIGN_REVIEW.md as it is almost fully a backwards lookign document and instead have a CLUSTER_II_MVP.md that defines our forward looking design decisions without reference to the past or external artifacts. let's preserve the fake encryption as a means to testing the system, with the intent that when it is replaced with proper encryption the system will actually be secure; this should be something we can turn on and off on a per-game basis during development. Update teh PR accordingly.

## Prompt 10: Cinematic UX

OK we like cinematic realism. In a level of detail and overall flow style similar to the design of ../pantheon, but without referencing it, write UX_DESIGN.md with mockups in this style.

## Prompt 11: Prepare Approval

this looks good, let;s make sure it is rebased on current main and ready for us to approve

## Prompt 12: Define Step Zero

pull hte latest main. Review the UX_DESIGN and IMPLEMENTATION_PLAN and put up a PR for step 0 of the implementation plan for us to review.

## Prompt 13: Build Production Tracer

let's put step 1 on the same PR. In general, we want to always implement "tracer-bullet" style; that is, do not implement anything that isn't visible in the UI, and always implement things that are meant to survive to prdouction, never temporary scaffolding or fallbacks or mocks. the UI should be final - matching in fidelity with the mockups as closely as possible - and reducers/actions/database code should implement the full mock encryption system. I'd like to see a pr preview on setp 1 that we can click on and interact with.

## Prompt 14: Link Billing

Link Firebase Payment

## Prompt 15: List Projects

list other projects linked to this and I'll tell you what to unlink

## Prompt 16: Unlink Project

mbgames-478115

## Prompt 17: CLI Only

don't use the browser, use the CLI only

## Prompt 18: Autonomous Authentication

Can't you set up authentication without my help?

## Prompt 19: Reviewer Takeover

Delegated instruction from the reviewer; human authorization: meta-prompts.md, “Supervisory takeover”.

Reviewer handoff — supervisory takeover, 2026-10-20. Human authorization is recorded in meta-prompts.md under “Supervisory takeover”. Read AGENTS.md; log this delegated instruction in PROMPTS.md explicitly attributed to the reviewer, referring to that meta entry. Preserve direct human entries and use PROMPT_WORK.md continuations correctly. Include meta-prompts.md in the next related commit and push; never merge review PRs.

You were idle after 6b23501 on PR #4. Resume implementation now. First correct/review the foundation on PR #4, then create small stacked successor PRs with each base set to the preceding branch. Preserve existing history; no destructive splitting of PR #4. Keep a dependency/acceptance table and preview links. Continue through IMPLEMENTATION_PLAN.md in final-quality vertical slices, with milestone 10 UX work alongside mechanics. Do not silently treat rules marked review as owner-approved; make material unresolved choices explicit while continuing unaffected work.

Initial review findings at 6b23501:
1. src/routes/+page.svelte renders Reconnect for every profile error using location.reload(). This can discard the explicitly preserved draft after a conflict or connection error. Implement state-preserving resubscription/recovery and distinguish validation, conflict and network remedies. Add browser evidence for two-device conflicts and retry/pending commands without duplicate writes or draft loss.
2. open() always focuses the destination heading. Closing Learn/identity should restore focus to the opening control, per UX_DESIGN/CLUSTER_II_MVP. Test keyboard journeys, focus restoration and reduced motion. Existing geometry checks only check button size and horizontal document overflow; cover target overlap, viewport containment, radio targets and bounded scroll in phone/desktop/4K/short identity and error states.
3. Compared actual entry-desktop baseline to docs/ux/concepts/01-entry.png: scenery broadly matches, but generic gold Play and plain Learn omit the large illustrated inset navigation treatments. Bring production controls closer to the approved composition, using semantic buttons and real labels, and retain separate phone composition. Omit Continue until campaigns exist. Do not regenerate baselines as a substitute for review. The phone identity is readable; preserve that legibility. Require independent actual rendered review at supported sizes.
4. docs/design/STEP_0_REVIEW.md still says this PR does not start step 1 or provision/deploy anything, now false for combined PR #4. Correct implementation-status claims while retaining proposed-rule status. Hosted Google end-to-end login/persistence remains unverified; do not claim full hosted acceptance from the OAuth URL probe.

Create a production-component gallery and interactive animation lab in a small stacked PR before advancing deep gameplay. Inspect /Users/anicolao/projects/games/pantheon/src/routes/dev/animations, src/routes/gallery and Gallery.svelte, and locate the comparable todo lab. Use actual shared production components, icons and animation code, not parallel mock implementations. Lab needs deterministic scenarios, replay/reset, pause/seek or frame inspection, speed control and reduced-motion comparison with outcomes unchanged; include pending/accepted/rejected/reconnect transitions as applicable and extend with gameplay. Gallery must cover every shipped reusable icon/control and real states (focus, selected, disabled, pending, error), sizes, semantic labels and asset provenance. Keep development tooling out of normal player navigation. Ship cinematic faction/ship/system assets as their real interactions arrive, never placeholders or generated lettering.

After foundation corrections and lab/gallery, proceed into milestones 2/3 with authoritative campaign create/join/recover and actual galaxy interaction, real authorization, private views, persistence and shared versioned rules. No fake game state or unused service infrastructure. Public campaigns require real cryptography; development mock mode must remain explicitly scoped. Require relevant rule/service/browser tests and illustrated journeys with acknowledged outcomes, plus independent visual review for each PR. Send concise progress with commit/PR, evidence, remaining gaps and next step. A supervisor will check every ten minutes; continue useful work between checks instead of waiting for a new human prompt after each increment.

### Verification and delivery checkpoint

Supervisor independently ran npm run check successfully (zero Svelte errors/warnings; TypeScript functions check passed), all 10 prompt-hook tests passed, and step-zero validation passed. PR #4 documentation, publish and verify checks are green. Bun unit/service/browser suites were not rerun by the supervisor because bun is absent from this shell PATH; CI results and committed captures are evidence with that limitation. Exact handoff was pasted and submitted to clusterii:1.2; tmux shows Working, confirming the agent resumed (completion not yet claimed). Supervisor scratch handoff was moved outside the repository. Agent owns staging/committing this log with its attributed PROMPTS.md entry to avoid concurrent Git mutations. Local monitoring requires this Mac and desktop app available; ten-minute cadence is scheduled, not a guarantee of uninterrupted execution.

## Prompt 20: Reviewer Privacy

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. Finding recorded under “Reviewer progress — 2026-10-20 16:15 Toronto”.

Reviewer finding during campaign work: shared/campaign.ts campaignView filters systems where either layer is owned, then spreads the entire SystemState into holdings. That exposes opposing-layer fighters/infantry/developments when ownership is split; replacing only orbit/surface labels with Unknown does not redact those values. Before this slice is accepted, project fields explicitly by layer entitlement and authorized intelligence, and add a split-owner fixture proving hidden opposing values are absent from serialized views, not just unlabeled in the UI. Keep this in the current privacy review while continuing the slice; do not mark the two current reducer tests as complete authorization coverage. Also carry the latest main-worktree meta-prompts.md supervisory checkpoints into the stack without dropping entries. PRs #4/#5 are green, and the initial hosted gallery/lab interaction review passed with the limitations recorded there.

## Prompt 21: Reviewer Composition

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. Finding recorded under “Reviewer progress — 2026-10-20 16:36 Toronto”.

PR #6 supervisory review at bfc7520: visual acceptance is WITHHELD. Correct this slice before extending deeper gameplay. I inspected actual test-results galaxy-desktop.png, galaxy-phone.png and factions-phone.png. Galaxy is embedded below roughly 225–250px of persistent website-style branding/title/status chrome; phone faction capture shows neither briefing/portrait nor Claim your seat, and the galaxy places roster/Leave below the scene. This violates UX_DESIGN.md full-screen galaxy surface and persistent phone commitment rail. Recompose desktop around a slim integrated campaign rail and contextual inspector; phone needs one focal task, bounded scrolling details and a safe-area-aware commitment rail keeping Claim your seat visible while reviewing faction/portrait. Preserve explicit development/rules-review disclosure but place technical provider details in developer diagnostics rather than large player chrome. Do not invent unavailable gameplay actions. The uniform dotted spiral is also not yet the approved cinematic stellar presentation: improve visible stars, selective labels/class/ownership cues, depth and scene composition against 03-galaxy while preserving the actual authoritative catalogue and privacy. Keep this work in #6 and propagate safely to successors; no merge.

The geometry helper scrollIntoViewIfNeeded makes every target reachable in sequence but does not prove the required primary action remains visible while selecting. Add assertions before automatic scrolling for the action rail at phone and short desktop, bounded-panel scroll and no document overflow, then retain exact rendered before/after evidence. Also test independent players filling a roster and seeing scheduled start/home assignment through ordinary UI (service-only invocation is not the browser journey); keep partial milestone status honest. Privacy projection fix and split-owner regression source look correct; service/browser execution evidence still requires review. Record this delegated finding attributed to reviewer in PROMPTS.md and carry main-worktree meta-prompts.md updates into the stack.

## Prompt 22: Reviewer Layering

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. Finding recorded under “Reviewer progress — 2026-10-20 16:56 Toronto”.

Follow-up visual review of /tmp/cluster-composition-final3 captures:full-height galaxy, slim rail and fixed Claim your seat are substantially improved. One remaining concrete issue: galaxy-phone.png renders the map label “Taiyangshou · O” over the inspector near its stellar-class/title area. Clip map HTML labels to the map viewport or layer inspector/sheets above every map label (and keep decorative layers noninteractive); test labels at the inspector boundary. Full visual acceptance remains pending that correction and final captures. The four viewport failures in cluster-composition-final3.log are duplicate campaign-name selectors after reused emulator data: give each journey a unique campaign name/ID and recover that exact campaign; do not weaken to first() or last(). The current four-player test is legitimately waiting for the next quarter-hour; no restart needed. Independent prompt-hook suite passed all 12 tests, including historical continuation validation. Preserve this review in PROMPTS.md and the next related commit.


## Prompt 23: Reviewer Recovery

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. Finding recorded under “Reviewer progress — 2026-10-20 17:26 Toronto”.

Reviewer finding for PR #8 at ec6b8a0: acceptance pending two entry-recovery corrections. UX_DESIGN.md:61 and UX-01 require distinct Play (campaign selection), Continue (last accessible active campaign), and Learn; several active campaigns require naming the last campaign and Change campaign. Current entry replaces Play with unnamed Continue for any membership, including waiting memberships, and multiple memberships open the directory. Implement the approved semantics from authoritative accessible campaign metadata and persisted last selection, with safe handling of removed/inaccessible/finished memberships. Preserve waiting-campaign access through Play. Cover zero, one, multiple and waiting-only memberships and retained selection after reload; inspect final phone/desktop/short/large compositions.

Second, source review finds play() always opens profile after login and recover() never resumes an invitation when an existing saved profile arrives. The new invitation test covers only first-time profile creation. Add a signed-out returning-player browser journey with an existing saved identity and ensure authentication/profile readiness returns directly to the preserved invited campaign without requiring an identity resave or closing/reopening the editor. Test denied/missing invitation recovery and preserve existing identity revision. This is a source-based finding, not a newly reproduced live failure.

You may continue independent encryption work, but correct #8 and propagate safely to successors before claiming entry recovery accepted. Record this delegated instruction attributed to reviewer in PROMPTS.md, referring to the 17:26 supervisory checkpoint; include latest main-worktree meta-prompts.md in the related commit/push with proper PROMPT_WORK continuations. Never merge.


## Prompt 24: Reviewer Retransmission

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. Finding recorded under “Reviewer progress — 2026-10-20 17:36 Toronto”.

Reviewer checkpoint 17:36 Toronto: PR #7 verification failed in run 39498918915, recovery.spec.ts:83. It expected one transport write but observed two frames with the SAME profileCommands path/command UUID and identical encrypted payload (transport request numbers 5 and 7). This evidence does not establish duplicate logical commands; reconnect may retransmit. Diagnose using the retained trace and verify one logical command identity, unchanged payload, one acknowledged revision/effect and preserved draft. Correct the brittle assertion only with those stronger semantic checks, then rerun affected recovery tests and CI on #7 and propagate to successors. Do not merely rerun until green or weaken duplicate-action coverage. PR #8 current published head is green but prior design hold remains pending your in-progress corrections. I see Prompt 23 attribution and the two-campaign boundary wait; continue that healthy work without restarting. Include latest main meta-prompts.md in related committed/pushed histories, with reviewer-attributed instructions and required continuations. Never merge.


## Prompt 25: Reviewer Fencing

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. Finding recorded under “Reviewer progress — 2026-10-20 18:36 Toronto”.

Reviewer migration validation request: source review sees a 120-second lease, sequence/lease fencing, paged history and cleanup. Current service coverage exercises concurrent initiation, completed-task replay and corrupted-history rollback, but does not demonstrate a worker dying after claim or an expired lease being reclaimed while the old worker later returns. Before accepting migration, add targeted fault/recovery coverage for that boundary: replacement worker completes, stale worker cannot write/activate/abort the replacement, exactly one receipt/epoch activation occurs, and staged failed-attempt cleanup cannot delete a later successful epoch. Exercise history beyond the 10-record page boundary and compare complete authorized history/recipient sets after migration. Use test-level fault control with real service semantics; no production fallback or weakened fencing. Keep this in the migration slice, document precise evidence and remaining limits, and retain reviewer attribution plus latest meta-prompts.md in committed/pushed logs. No interruption of healthy current work needed; never merge.


## Prompt 26: Reviewer Checkpoint

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. This delivered checkpoint refers to the 2026-10-20 15:46 review of ce79813; subsequent progress is recorded separately.

Reviewer checkpoint: healthy progress confirmed at ce79813; independent type checks and lint pass. Updated desktop/phone entry baseline composition reviewed favorably, with remaining viewport/error/motion and hosted acceptance still open; latest CI pending. I appended the detailed checkpoint to meta-prompts.md; include it in your next related commit with the required attributed prompt/continuation record. Continue the existing plan; no need to stop current work.


## Prompt 27: Delivered Layering

Delegated instruction from the reviewer; authority is recorded in meta-prompts.md under “Supervisory takeover” and the 16:56 checkpoint. This preserves the delivered wording exactly; the earlier transcription in Prompt 22 omits the space after “captures:”. That historical entry remains unchanged.

Follow-up visual review of /tmp/cluster-composition-final3 captures: full-height galaxy, slim rail and fixed Claim your seat are substantially improved. One remaining concrete issue: galaxy-phone.png renders the map label “Taiyangshou · O” over the inspector near its stellar-class/title area. Clip map HTML labels to the map viewport or layer inspector/sheets above every map label (and keep decorative layers noninteractive); test labels at the inspector boundary. Full visual acceptance remains pending that correction and final captures. The four viewport failures in cluster-composition-final3.log are duplicate campaign-name selectors after reused emulator data: give each journey a unique campaign name/ID and recover that exact campaign; do not weaken to first() or last(). The current four-player test is legitimately waiting for the next quarter-hour; no restart needed. Independent prompt-hook suite passed all 12 tests, including historical continuation validation. Preserve this review in PROMPTS.md and the next related commit.


## Prompt 28: Composition Acceptance

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. This scoped acceptance is recorded under the 2026-10-20 17:06 checkpoint.

Reviewer checkpoint at 2ff8864: inspected committed after-captures for phone galaxy/faction, map-label boundary, short desktop galaxy/faction, 4K galaxy and assigned-home desktop. The identified map-label overlap is corrected; galaxy rail and persistent join control satisfy the specific composition corrections reviewed. The composition hold for those findings is lifted. This is scoped acceptance of this development admission slice, not approval of proposed rules/map geometry, hosted scheduler/authentication, full milestones 2/3 or release. Independent npm run check and lint pass. The recorded four-player UI admission/start run passed in 6.1 minutes with distinct homes after real-time boundary and emulator scheduler HTTP delivery; this is observed run evidence, not supervisor rerun or hosted Scheduler certification. Exact latest-head CI is pending; preserve that gate. Continue the stacked navigation work and remaining plan, retaining these fixes and all prompt histories; never merge without human instruction.


## Prompt 29: Entry Acceptance

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. This scoped acceptance refers to the 2026-10-20 17:56 checkpoint.

Reviewer checkpoint at 3ab9165: independently inspected corrected active-entry captures at phone, desktop, short and 4K. Distinct Play/Continue/Learn, readable named campaign and Change campaign are present and contained; source restricts Continue to active accessible memberships and persists account-scoped selection. Returning-invitation source/test covers preserved identity revision and denied/missing recovery. Final affected logs show 8 tests passed and returning-invitation rerun 1 passed; the earlier broad run had a fixture account-lookup failure, now corrected. Independent npm run check passes. The specific PR #8 entry design hold is lifted for these reviewed corrections, while latest-head CI and hosted Google acceptance remain gates. PR #7 replacement CI is green. This is scoped acceptance, not completion of full milestones or release. Continue diagnosing secure-campaign ingress without relaxing authorization/envelope validation; no need to restart healthy work. Carry this checkpoint into the next related committed/pushed log with required attribution/continuation. Never merge.


## Prompt 30: Forward Continuation

Delegated instruction from the reviewer; human authority is recorded in meta-prompts.md under “Supervisory takeover”. This handoff is recorded under the 2026-10-20 19:26 checkpoint.

Reviewer continuation checkpoint: the remaining queued historical handoffs (17:56 scoped entry acceptance and 18:36 migration fault coverage) have already been addressed via meta-prompts.md and implemented; do not rerun completed suites or create more evidence-only commits solely because those old queue items are now delivered. Preserve their existing attribution and latest scoped acceptance limits. PR #11 is now green. Finish any current reconciliation once, then resume forward implementation from IMPLEMENTATION_PLAN.md in the next small stacked PR based on feat/command-receipt-binding. Select the next material incomplete service/gameplay tracer bullet from the delivery acceptance table (including required scheduler recovery or account/key lifecycle gaps where prerequisites demand them); do not wait for a fresh human prompt. Keep unresolved proposed rules explicit and continue unaffected development work. Carry latest supervisory log forward, commit/push, and never merge. Provide a concise next-slice objective before implementing so progress is reviewable.


## Prompt 31: Maintenance Selectors

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and the 2026-10-20 20:06 checkpoint in meta-prompts.md.

Reviewer CI finding: PR #13 at 76ec04b failed verification run 39517211446. All four maintenance viewport tests fail because getByRole('status') now matches both CampaignStartStatus and the acknowledgement notice; 32 other browser tests pass and 5 live tests skip. Correct the maintenance test to target the specific acknowledged pause/resume status (prefer meaningful accessible naming/scoping or text-filtered status), preserving assertions that the actual command was accepted. Do not use first()/last() or remove the start-status live region to hide ambiguity. Check other affected broad status selectors, rerun the maintenance cohort, fix #13 itself and propagate to session-revocation, then let full CI validate. Log this attributed reviewer finding and carry latest main meta-prompts.md into the related commit/push. Continue healthy session work; no merge.


## Prompt 32: Production Compatibility

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and the 2026-10-20 20:36 checkpoint in meta-prompts.md.

Reviewer rollout direction within the existing implementation authorization: preserve existing development campaigns on their recorded behavior; implement production for newly created campaigns with an explicit stored rules/schema capability boundary. Do not reconstruct unrecorded historical pause intervals or retroactively award production. Document the compatibility policy and show a clear explanation when an older campaign lacks production; retain its history/access and allow normal creation of new development campaigns. This is a conservative reviewer implementation choice, not new human approval of game rules. Continue the production tracer bullet and both-mode authorization/repeat-safe tick/catch-up/ledger verification; a future explicit migration can be reviewed separately. Log this attributed instruction and latest meta-prompts.md, commit/push, and never merge.


## Prompt 33: Recovery Continuation

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and the 2026-10-20 22:57 checkpoint in meta-prompts.md.

Reviewer recovery checkpoint: the model-capacity error stopped this turn. Retry the current construction work from its existing state; do not repeat historical handoffs. The old schema rollout instruction is already implemented and logged. PR #17 is now green; #18 verification remains pending. Resume diagnosing construction completion settlement (zero instead of five ticks), inspect existing background journey output first, preserve tests and drafts, then complete review evidence and stacked PR. Record this attributed continuation and current main meta-prompts.md in the related commit/push; never merge.


## Prompt 34: Availability Retry

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and the 2026-10-20 23:07 checkpoint in meta-prompts.md.

Reviewer availability retry: resume the existing construction work and 22:57 recovery checkpoint if capacity has returned. PR #18 is now green. Background construction-browser.log finished with the production journey passing in 29.0 minutes and one lab geometry failure (the previously corrected document-scroll helper); reconcile against the newer passing lab run rather than repeating resolved work. Construction completion settlement remains unverified. Preserve current edits, carry main meta-prompts.md into the next commit, and continue without merging.


## Prompt 35: Construction Feedback

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and the 2026-10-20 23:17 checkpoint in meta-prompts.md.

Reviewer visual finding: retained docs/ux/reviews/construction/construction-phone.png shows “Your seat is confirmed.” in the construction commitment footer. Scope feedback to the relevant action/panel so a previous join/research acknowledgement cannot appear as construction feedback. Preserve actual build/cancel pending, acceptance and error messages; refresh the affected captures after fixing. The composition/art and fixed cost/balance/actions otherwise look readable in this phone sample. Log this attributed finding and carry latest meta-prompts.md into the related commit/push; continue completion validation, no merge.

## Prompt 36: Cargo Acknowledgement

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and “Reviewer progress — 2026-10-21 01:57 Toronto” in meta-prompts.md.

Reviewer finding for cargo PR #23 e167364: docs/ux/reviews/fleet-cargo/fleet-cargo-loaded-phone.png shows completed “Infantry loaded · 3 infantry.” while the commitment rail still says “Cargo order accepted. Transfer scheduled.” Reconcile the acknowledgement with the matching authoritative outcome so settled orders no longer claim a future transfer; preserve genuine pending/accepted/retry states and the separate next-load capacity message. Add a focused regression and refresh affected captures, carry through the stack, log reviewer attribution and current meta checkpoint, and commit/push without merging.

## Prompt 37: Travel Continuation

Delegated instruction from the reviewer; authority is recorded under “Supervisory takeover” and “Reviewer progress — 2026-10-21 02:57 Toronto” in meta-prompts.md.

Reviewer continuation: the old construction and cargo feedback findings are resolved and recorded; do not duplicate them. Resume the authorized implementation plan from clean feat/fleet-cancellation (70938de), creating the next small stacked PR on that branch for milestone 6 travel/routing. Read the approved design and distinguish unresolved gameplay choices from approvals. Deliver a real route-preview/commit/acknowledgement/settlement tracer bullet with range separate from speed, conservation, privacy, reload/pause/catch-up and ordinary-player evidence, shared gallery/interactive lab and phone/desktop/large/short keyboard/reduced-motion review. Continue monitoring replacement CI for #23–25 and repair actual failures without weakening assertions. Record this attributed handoff in PROMPTS.md, continuations in PROMPT_WORK.md, and carry main meta-prompts.md into the next commit/push. Continue through the plan without waiting after each completed slice; never merge.


## Prompt 38: Gallery Measurement

Delegated instruction from the reviewer, referring to meta-prompts.md “Reviewer progress — 2026-10-21 05:27 Toronto”:

Reviewer CI finding: #27 a1fb904 verification run 39567435352 failed. Retained log /tmp/cluster27-review-failure.log shows gallery/lab viewport cases timing out at 45 seconds while iterating hundreds of button/input/select bounding boxes (lab.spec.ts:102; short case nth459). Diagnose trace and preserve all geometry/accessibility assertions; consider batching DOM measurements rather than weakening coverage or blindly increasing timeouts. Fix on #27 and propagate through successors, retain failure/pass evidence and attributed logs, carry latest main meta-prompts.md, commit/push without merging. Continue conversation work around this diagnosis; no need to repeat resolved earlier handoffs.

## Prompt 39: Resource Headroom

Delegated instruction from the reviewer, referring to the 2026-10-21 06:46 Toronto resource finding in meta-prompts.md:

Reviewer resource finding: independently confirmed only 855 MiB free on the Data volume at 06:46 Toronto. Before further large test/deploy output, inspect task-owned disposable build/test caches and avoid exhausting disk. Preserve failure traces, review captures, source, worktrees and credentials; do not broadly delete user files. If safe task-owned cleanup cannot restore headroom, report the exact blocker. Continue fixing the observed browser geometry failure without weakening assertions. Record this attributed handoff and carry latest main meta-prompts.md into related committed/pushed logs; no merge.

## Prompt 40: Receipt Recovery

Delegated instruction from the reviewer, referring to meta-prompts.md “Reviewer progress — 2026-10-21 08:07 Toronto”:

Reviewer CI finding at 08:07 Toronto: #29 2f446ab is green; #30 67244aa run39587974767 and #31 30fb0ff run39589188027 both fail all four campaign-collision viewport cases in receipt-binding.spec.ts:16. Logs retained at /tmp/cluster30-review-failure.log and /tmp/cluster31-review-failure.log. Choose your faction never appears after the preserved-galaxy collision recovery flow; diagnose the actual trace/state and whether durable outbox recovery or the fixture violates command identity. Preserve original proposed payload and retry identity/conservation assertions; do not just weaken the assertion or extend timeout. Fix first on #30 and propagate through successors, retaining failure/pass evidence and attributed logs; carry latest meta-prompts.md, commit/push, no merge. Continue other work around the diagnosis without duplicating prior resolved handoffs.

## Prompt 41: Commander Identity

Delegated instruction from the reviewer, referring to meta-prompts.md “Reviewer progress — 2026-10-21 08:57 Toronto”:

Reviewer identity finding at 08:57 Toronto: src/lib/return-briefing.ts:175 finds own commander by first roster faction match. The new co-faction trade test proves multiple commanders may share a faction. For a later same-faction seat this suppresses messages from the first commander and includes its own messages as incoming activity. Use authoritative seat identity (now projected in #34) with an explicit safe policy for historical records lacking that field; do not infer identity from faction. Add an eight-seat same-faction briefing regression for own-message exclusion and other-commander inclusion. Fix and propagate on the appropriate stack branch, retain attributed logs and latest meta-prompts.md, commit/push without merge.

## Prompt 42: Illustrated Stories

Delegated instruction from the reviewer, referring to meta-prompts.md “Reviewer finding and handoff — E2E story contract” and its human source “Human request — E2E story conventions”:

Reviewer acceptance correction prompted by the user: UX_DESIGN.md:349 explicitly requires a shared illustrated-story helper, normal player action -> authoritative acknowledgement -> named game-fact and geometry assertions -> settled capture, plus an illustrated story document. IMPLEMENTATION_PLAN.md:190 repeats this. Current tests/browser/helpers.ts is login/geometry utilities, not that story helper; monolithic specs and loose captures do not satisfy the requirement. After the current co-faction correctness repair, prioritize closing this testing-contract gap before another gameplay PR: inspect the actual TestStepHelper implementations in /Users/anicolao/projects/todo/tests/e2e/helpers/test-step-helper.ts and /Users/anicolao/projects/games/pantheon/tests/e2e/helpers/test-step-helper.ts; adapt a Cluster TestStepHelper with named narrative steps, named verifications, acknowledged outcomes, explicit font/image/finite-motion readiness, viewport captures and generated ordered story documents covering all player viewpoints. Preserve existing privacy/conservation/recovery assertions and real service journeys; keep admin clock/fault controls explicitly separated. Map existing journeys to UX-01 through UX-15 inventory (and any remaining inventory IDs), make gaps explicit, and migrate existing coverage in reviewable commits rather than merely wrapping an entire long test as one step. Enforce exact pinned visual comparisons and separately reviewed baseline generation per UX_DESIGN, not screenshot attachment alone. Do not blindly inherit sample-project masks or unrelated tabletop behavior. Document the mandatory convention in AGENTS/testing guidance, record this attributed instruction and human source in meta-prompts.md, commit/push evidence and carry latest supervisory log. No merge. This is an acceptance gap previously missed by supervision, not new approval of gameplay rules.

## Prompt 43: E2E Guide

Delegated instruction from the reviewer, referring to meta-prompts.md “Reviewer handoff — Dedicated E2E guide” and its human source “Human request — Dedicated E2E guide”:

Reviewer follow-up explicitly requested by the user: write a root E2E_GUIDE.md for Cluster II, reading /Users/anicolao/projects/todo/E2E_GUIDE.md and /Users/anicolao/projects/games/pantheon/E2E_GUIDE.md as references. Make the illustrated user-story/TestStepHelper convention mandatory and hard to miss: link the guide from AGENTS.md, README.md and IMPLEMENTATION_PLAN.md, and require reading it before writing/changing browser tests. Include a concrete runnable-style Cluster story example with named steps/assertions and generated story output, helper/artifact locations, real service/player setup versus explicitly labeled fault/clock controls, deterministic capture readiness, exact visual verification versus separate baseline review, viewport/keyboard/motion requirements, commands, and a PR acceptance checklist. Separate required convention from migration status honestly; document existing gaps rather than claiming procedural tests already comply. Implement this alongside the previously requested helper/story migration before another gameplay PR. Record this delegated instruction with reviewer attribution and carry the latest supervisory log; commit/push without merging.

## Prompt 44: History Keyboard

Delegated instruction from the reviewer, referring to meta-prompts.md “Reviewer progress and CI handoff — 2026-10-21 09:38 Toronto”:

Reviewer CI finding at 09:38 Toronto: #30 aac1d04 and #31 19e896c are now green. #32 46307c6 run39599629028 and #33 8a9ae26 run39600113448 fail history.spec.ts:20 in all four viewports: focusing Saved campaign records then Shift+Tab no longer focuses Return to galaxy. Logs retained /tmp/cluster32-review-failure.log and /tmp/cluster33-review-failure.log. Diagnose actual keyboard order after briefing changes, distinguish stale expected order from accessibility regression, preserve meaningful keyboard/focus/containment assertions, and propagate the appropriate fix through the stack. Do not simply drop the check or raise timeout. If changing legacy specs on the story branch, honor the new migration policy rather than silently refreshing exceptions. Record attributed instruction and continuation, carry latest meta-prompts, commit/push without merge. Entry/identity local exact comparison is useful progress, but Linux and independent full visual acceptance remain pending.

## Prompt 45: Preview revision

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 14:48 Toronto”.

Reviewer finding 2026-10-21 14:48 Toronto: #43 publication run39652784195/job119406158620 failed hosted-revision verification: expected4cfaebf but observed source/build a9951bd. Log retained /tmp/cluster43-publish-review-failure.log. Coordinate a publication retry after the shared Pages queue clears, then verify the exact current head before claiming preview readiness. Preserve the revision assertion. Log this reviewer-attributed handoff in PROMPTS.md and continuations per AGENTS.md; carry latest meta-prompts checkpoint. No merge.

## Prompt 46: Roster comparison

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 15:08 Toronto”.

Reviewer finding 2026-10-21 15:08 Toronto: #43 job119405166506 now fails two snapshots with70 passing26.1min. In addition to known1994-pixel short session fresh-sign-in text difference, desktop campaign-scheduled-start/026-started-rosters-1-dawn-envoy-1.png differs5688 pixels. Retained log /tmp/cluster43-repeat-review-failure.log. Inspect and retain the distinct roster actual/expected/diff before deciding whether it shares the text cause; do not regenerate baselines or relax comparison to pass. #43 publication retry now succeeded. Log this reviewer-attributed finding and carry checkpoint; no merge.

## Prompt 47: Preview retries

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 15:38 Toronto”.

Reviewer finding 2026-10-21 15:38 Toronto: current #43 publish39660439181 failed expected d3e34c4 versus hosted4cfaebf; #46 publish39660570655 failed revision fetch with ECONNRESET. Logs retained /tmp/cluster43-publish-latest-review.log and /tmp/cluster46-publish-latest-review.log. Coordinate retries after shared publication queue clears and retain exact-head checks; do not describe current previews as verified until those checks pass. Log reviewer attribution/continuation and carry latest checkpoint. No merge.

## Prompt 48: Capture deadline

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 15:58 Toronto”.

Reviewer finding 2026-10-21 15:58 Toronto: current #43 d3e34c4 story job119431708321 fails large campaign-start at the180000ms total test deadline,71 pass27min; no pixel failure in this run. #44/#45 also have campaign-start deadline failures plus known1994-pixel mismatches. Retained logs /tmp/cluster43-current-review-failure.log through cluster45-current-review-failure.log. Diagnose retained trace timing and current CI resource contention before changing any deadline; keep named readiness checks and exact pixels. Prioritize closing inherited failures alongside migration, and record root cause/evidence separately. Log reviewer attribution and carry latest checkpoint; no merge.

## Prompt 49: Raster diagnosis

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 16:28 Toronto”.

Reviewer continuation 2026-10-21 16:28 Toronto: your queued historical handoffs are drained and pane is idle. Resume authorized work. Prioritize the unresolved short identity paragraph raster mismatch inherited from #42: use retained Linux actual/expected/trace and renderer/layout evidence to establish a reproducible cause; preserve existing baselines, zero tolerance and failure artifacts. Continue independent remaining illustrated-story/implementation work while CI queues drain, and coordinate exact-head preview retries when publication clears. Do not wait indefinitely for CI when useful local diagnosis remains. Carry main meta-prompts checkpoints through16:28 into related committed/pushed logs, attribute this handoff in PROMPTS.md and continuations per AGENTS.md. No merge or full-release acceptance without remaining evidence.

## Prompt 50: Lab continuation

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 16:48 Toronto”.

Reviewer continuation 2026-10-21 16:48 Toronto: diagnostics e350e11 are pushed and pane is idle since16:39. Continue authorized implementation while Linux evidence queues: take the next unmigrated production/sharing lab or live player journey in STORY_INVENTORY.md as a small successor to #50, preserving real shared components, named acknowledgements, exact candidate review and predecessor assertions. Keep identity-raster diagnosis open and inspect its new Linux layout artifacts when available; do not claim a fix from negative local probes. Coordinate current-head preview retries as the shared queue clears. Carry latest main meta-prompts checkpoints, log reviewer attribution and continuations, commit/push; no merge. Continue useful independent work rather than ending solely because CI is pending.

## Prompt 51: Live consent

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 17:08 Toronto”.

Reviewer continuation 2026-10-21 17:08 Toronto: pane idle after #52; continue authorized work with the next live multiplayer illustrated journey, preferably UX-10 selected-history consent through actual authenticated commands and recipient/outsider viewpoints, as a small successor to #52. Preserve procedural assertions until replaced, use TestStepHelper and named authoritative acknowledgements, exact captures across four viewports, privacy/recovery and keyboard/motion evidence. Component lab completion is not live acceptance. Current #43 6d6b005 story CI is green; #45 41d28ef fails two short identity captures by exactly1994 pixels (identity-validation and profile-recovery), retained /tmp/cluster45-1708-review-failure.log, no campaign timeout in this failure. Keep raster diagnosis open; compare new Linux layout artifacts when available without baseline/tolerance changes. Coordinate exact-head previews after queue clears. Carry main meta checkpoints through17:08, attribute this handoff in PROMPTS.md and continuations per AGENTS.md, commit/push logs. Continue useful independent work while CI is pending; never merge.

## Prompt 52: Linux gallery

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 17:28 Toronto”.

Reviewer finding 2026-10-21 17:28 Toronto: #47 current story verification completed with four missing Linux identity-component-gallery baseline failures, not pixel mismatches; generation succeeded. Log retained /tmp/cluster47-1728-review-failure.log. After current consent verification, review the separately generated Linux candidates and provenance, promote only approved new gallery images, then propagate through successors and verify strictly. Do not regenerate inherited baselines or weaken exact comparison. Carry latest meta checkpoints and attributed logs in committed/pushed changes; no merge.

## Prompt 53: Live exchanges

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 17:48 Toronto”.

Reviewer continuation 2026-10-21 17:48 Toronto: pane idle since17:37, clean53e5387 and thirteen prompt-history tests pass. Resume the next live illustrated migration from STORY_INVENTORY, preferably UX-11 credit offer/accept/withdraw/settlement with actual sender, recipient and outsider views, as a small successor to #53. Preserve existing procedural assertions until equivalent coverage exists; require named authoritative acknowledgements, conserved balances, privacy and interrupted/reload recovery, four viewport captures and keyboard access. Keep candidate review separate from strict verification and distinguish proposed rules from approved behavior. Inspect Linux layout diagnostics when available; retain unresolved raster and current-head preview gates. Carry main meta checkpoints through17:48 and attributed PROMPTS/PROMPT_WORK, commit/push logs. Continue useful independent work while CI queues; no merge.

## Prompt 54: Linux diagnosis

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 18:48 Toronto”.

Reviewer finding 2026-10-21 18:48 Toronto: #51 current4f8cb6a story run39680090423 completed with20 missing Linux baseline failures across history/lifecycle/production/research and one known1994-pixel mismatch. Retained /tmp/cluster51-1848-review-failure.log. This successor includes the layout instrumentation, so inspect its completed failure artifacts now for passing/failing identity layout comparison rather than waiting only for #50. Continue your active Linux candidate review with provenance checks and unchanged inherited baselines. Record the diagnosis separately; green runs do not establish a raster fix. Carry latest main checkpoint and attributed logs, commit/push; no merge.

## Prompt 55: Live construction

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 19:08 Toronto”.

Reviewer continuation 2026-10-21 19:08 Toronto: pane idle since19:00 after successful baseline propagation, clean698aa51. Continue authorized work. Take the next live UX-05 construction/development story from the inventory as a small successor to #55, covering actual reservation, completion/cancellation and owner/other-player privacy through named acknowledgements, recovery, four viewports and keyboard access; retain procedural assertions until replaced. Also continue targeted identity-raster diagnosis from the instrumented Linux pair when useful evidence can be gathered; identical post-capture geometry is not a fix. Avoid broad CI reruns or baseline changes as a substitute for diagnosis. Preserve current-head publication checks and coordinate retries after shared queue clears. Carry main checkpoints through19:08 and attributed logs, commit/push; continue useful independent work while CI queues, no merge.

## Prompt 56: Fleet continuation

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 19:59 Toronto”.

Reviewer continuation 2026-10-21 19:59 Toronto: clean0bd3936 and pane idle after #57 completion. Continue next live UX-08 fleet travel/cancellation or reorganization story as a small successor to #57, with authoritative conservation, private owner/observer projections, interrupted/reload recovery and four-viewport keyboard evidence, keeping procedural regressions. Also inspect why CI jobs have remained queued for hours using read-only run/runner status; record whether capacity or workflow dependencies explain it, without cancelling unrelated jobs or launching broad duplicate reruns. Retain exact-head preview gates and targeted raster diagnosis; second identical-layout pair is not a fix. Carry latest checkpoints through19:59 and attributed logs, commit/push. Continue useful independent work; no merge.

## Prompt 57: Fleet journeys

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 20:39 Toronto”.

Reviewer continuation 2026-10-21 20:39 Toronto: #59 is pushed clean943fdce and pane idle since20:35. Continue live fleet travel/cargo/arrival coverage next as a small successor to #59, preserving authoritative force conservation, owner versus observer privacy, recovery and four-viewport keyboard evidence. Keep existing procedural assertions until equivalent stories replace them. Maintain explicit rule-approval boundaries and label clock harnesses. Continue targeted raster investigation when evidence permits and retain current-head preview checks; do not duplicate broad CI runs into the documented backlog. Carry main checkpoint through20:39 with attributed PROMPTS/PROMPT_WORK, commit/push. No merge; keep progressing independently while CI waits.

## Prompt 58: Travel stories

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 20:59 Toronto”.

Reviewer continuation 2026-10-21 20:59 Toronto: #60 is published clean03a2a8e on #59; pane idle since20:50. Continue live fleet travel/arrival stories as a small successor to #60. Use TestStepHelper user-story actions, authoritative acknowledgements, force conservation, owner/observer privacy, reload and interrupted recovery where supported, and phone/desktop/large/short keyboard evidence. Keep navigation range distinct from speed and proposed rules distinct from approvals. Preserve procedural assertions until equivalent coverage exists and label guarded clock harnesses. Cargo currently proves accepted-order reload, not interrupted-draft recovery. Maintain targeted identity-raster investigation and exact-head preview gates; do not launch broad duplicate CI runs into the documented queue. Carry main checkpoints through20:59 into attributed PROMPTS/PROMPT_WORK and committed/pushed meta log. Continue useful independent work while CI waits. No merge.

## Prompt 59: Route recovery

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 21:19 Toronto”.

Reviewer continuation 2026-10-21 21:19 Toronto: #61 published clean6504a4a on #60, pane idle. Continue a small successor addressing interrupted route-command recovery. Independent inspection confirms campaigns/+page.svelte restores fleet.split/merge only, while Galaxy keeps routeDrafts locally; UX_DESIGN recovery requires preserved route choices while access remains valid and same-command discovery/retry. First reproduce interruption before/after acknowledgement with TestStepHelper, then restore the accessible matching campaign/fleet and original route without inventing state, duplicating command identity, or overwriting a newer user edit. Verify stale/retired fleet and access-loss handling, authoritative receipts/conservation/privacy, four viewport keyboard captures and unchanged procedural regressions. Distinguish durable submitted-command recovery from unsent memory-only drafts. Preserve rule boundaries, exact comparisons, targeted raster diagnosis and exact-head preview gates; no broad duplicate CI. Carry checkpoints through21:19 into attributed PROMPTS/PROMPT_WORK and committed/pushed meta logs. Continue useful independent work while CI waits; no merge.

## Prompt 60: Travel catch-up

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 22:10 Toronto”.

Reviewer continuation 2026-10-21 22:10 Toronto: #62 published cleanff1d616 on #61; pane idle since21:59. Continue milestone6 pause/catch-up travel acceptance as a small successor to #62 using TestStepHelper user-story journeys. Cover real leased delayed/batched tick settlement, correct departure/arrival timing and conservation, repeated/concurrent delivery idempotence, private owner/observer views, reload and keyboard access across four viewports. Preserve procedural checks and explicit harness boundaries; do not certify hosted scheduling from an emulator clock. After that slice continue remaining IMPLEMENTATION_PLAN work rather than stopping solely for queued CI. Keep targeted identity-raster investigation, exact-head previews and independent visual/Linux gates open. Latest GitHub retrieval had a TLS timeout, so recheck read-only when available, without broad duplicate runs. Carry checkpoints through22:10 into attributed PROMPTS/PROMPT_WORK and committed/pushed meta logs. No merge.

## Prompt 61: Capture diagnosis

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-21 23:46 Toronto”.

Reviewer continuation 2026-10-21 23:46 Toronto: pane stopped with workspace routing discovery timed out at cleaneeb84e6. Resume the existing pause/catch-up slice and trace diagnosis; do not restart or duplicate work. Reviewed correction to zero stationed fleets after departure, retaining selection of the actual traveling fleet. Diagnose the 4K ten-second step using completed trace timing and bounded diagnostic scope; preserve assertions, exact pixels and original failure artifacts. Finish candidate review, strict comparison and appropriate regressions before publication. Carry checkpoints through23:46 into attributed logs and commit/push. Current CI has no newly completed failure beyond recorded #52 raster recurrence. No merge; retain full independent/Linux/preview gates.

## Prompt 62: Linux failure triage

Delegated reviewer instruction, attributed to the reviewer; see meta-prompts.md “Reviewer progress — 2026-10-22 00:09 Toronto”.

Reviewer finding 2026-10-22 00:09 Toronto (queue after current diagnostic): #58 and #62 Linux verification completed with36 and70 failures. Logs retained /tmp/cluster58-0008-failure.log and /tmp/cluster62-0008-failure.log from jobs119568677251/119594903701. These include missing reviewed Linux baselines AND additional admission/identity/maintenance locator timeouts plus function socket hangups; do not classify all as baseline or known raster failures. At a natural boundary inspect first causal service/trace failure and compare generation artifacts; review/promote only new candidate families with matching provenance, retain strict verification. No broad duplicate rerun or timeout relaxation. Carry this attributed finding and checkpoint into committed/pushed logs; no merge.
