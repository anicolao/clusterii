# Cluster II MVP

Cluster is a slow real-time multiplayer space conquest game. Players develop star systems, research new capabilities, move fleets, and negotiate alliances. No empire has everything it needs to win alone. Cooperation drives victory, while changing alliances keep repeated games varied.

The MVP delivers a complete campaign: join, develop, research, explore, conquer, cooperate, win, and return for another game. It includes the operational and privacy foundations needed for sustained multiplayer play.

## Galaxy and factions

The galaxy is a seeded spiral with neighborhoods of stars and shallow three-dimensional depth around a galactic plane. Player count determines its size and number of home systems. Starting positions provide comparable access to useful stars and reachable expansion routes.

Four stellar classes—M, G, A, and O—support aquatic, humanoid, insectoid, and reptilian factions. A four-by-four affinity matrix defines each faction’s strengths across stellar classes. Faction selection determines mechanics; portrait selection determines appearance. Stars have stable identities, names, positions, resource properties, and independent orbital and surface ownership.

## Economy, control, and research

| Development | Location | Base output per tick |
| --- | --- | --- |
| Market | Surface | One galactic credit |
| Training camp | Orbit | One fighter |
| Base | Surface | One infantry unit |
| Space station | Orbit | One science point |

Orbital control grants fighter and science production; surface control grants infantry production. When different factions control orbit and surface, credits accumulate locally. A faction that secures both receives the escrow once. Construction requires the appropriate control, resources, and prerequisites.

Markets also earn credits from other players’ development purchases, weighted by their owner’s market focus across the four development types. Focus and construction take effect at defined points in the tick, so payouts cannot be changed retrospectively. Resource ledgers explain production, modifiers, spending, transfers, and escrow.

Space stations contribute to a chosen technology. Scanning improves distant observations; navigation provides ten light years of range per level; terraforming improves extraction and development capability; investing increases credit production; formations improves fighter effectiveness; melee increases infantry damage; recruiting increases infantry production; innovation increases science production. Production powers use `output^(1 + level/100)` with explicit aggregation and rounding rules. Intelligence records when an observation was acquired and distinguishes current, stale, and unknown information.

## Fleets, combat, and diplomacy

Fleets carry fighters and infantry between systems. Orders specify forces, waypoints, departure, and arrival. Players review range, travel time, and consequences before committing. Units exist in one location at a time; a route preview is not an issued order.

Fighter combat uses a square-law model. Ground combat uses linear attrition with a defender-first advantage. Orbital victory does not automatically capture the surface. Combat reports explain known forces, effectiveness, casualties, survivors, and control changes.

Private conversations support invitations and controlled sharing of earlier history. Alliances support cooperation, permitted transfers/trades, and shared victory. Membership changes govern future access and military permissions; they cannot erase information a former member has already learned. Atomic exchanges prevent double spending and partial trades.

Control of stars or resources measures galactic dominance. Victory records every eligible winner, settles the final tick, stops further gameplay mutations, and retains results and authorized history. Repeated-game incentives encourage different allies rather than permanent blocs.

## Time and authoritative state

The server advances games on a 15-minute tick. A versioned ruleset fixes command cutoff, tick phase ordering, catch-up behavior, and victory evaluation. Each game retains its ruleset and configuration throughout the campaign.

Players submit validated commands with stable IDs. The server derives actor identity from authentication, validates permissions and legality, and applies each accepted command once. Ordered revisions, snapshots, and state patches support recovery without repeating costs, movement, or combat. Client clocks and animations do not decide game outcomes.

The authoritative service retains complete game state. Players receive public information and object access granted by the rules. Random outcomes and generated identities are persisted so retries and recovery do not reroll the game. Reconnecting restores the current state and pending decisions without replaying every historical animation.

## Application experience

**The galaxy is the interface.** Players enter a full-screen command environment, inspect stars and fleets in place, and act through contextual instruments. The application has no persistent website header, marketing sections, or dashboard grid. Art, motion, and controls form one readable composition.

Desktop keeps the galaxy, selected system, resources, and relevant orders visible together. Inspectors and bounded trays open over the same spatial context; closing them restores selection, camera position, and keyboard focus. Portrait mobile has its own composition: compact empire context, one central task, and the committing action within the lower thumb zone above device safe areas. It does not shrink the desktop layout.

The entry scene offers Play, Continue when a campaign is available, and Learn. In-game controls use concrete language: Build market, Send fleet, Research navigation, Invite ally. Constraints explain the remedy. Activity reports explain who acted and what changed. Build revisions, database state, and encryption controls belong in developer diagnostics, not ordinary player copy.

Selected and legal states use labels and symbols as well as colour. Touch targets are at least 44 × 44 CSS pixels, with nonoverlapping active regions. Every action has keyboard and touch equivalents; no essential information depends on hover or dragging. Inspectors contain and restore focus. Scrolling stays inside named, bounded regions with visible continuation; the game surface does not accidentally scroll as a document.

Motion explains actions without controlling them. Pending commands show acknowledgement status before their effects appear as confirmed. Reduced motion removes travel flourishes, camera transitions, and particles while retaining the same outcomes. Returning players see a concise activity history, pending orders, intelligence changes, and the next tick.

Artwork uses a coherent faction, ship, and planetary visual language. Decorative images never replace semantic controls or authoritative text and values. Desktop and mobile art are composed for their respective spaces. Final art selection precedes detailed screen composition.

## Client and backend

The client uses TypeScript, SvelteKit, and Threlte/three.js. It is a static application with prerendered entry routes and browser-side game loading. Game IDs are query parameters on static routes. Shared TypeScript modules define commands, entities, rules, and versioned transitions.

Firebase Auth supplies Google sign-in. Realtime Database accepts commands under authenticated paths. Cloud Functions validate and process actions and scheduled ticks. Firestore stores profiles, game summaries, authoritative history, snapshots, encrypted objects, and access grants. Administrative capabilities are enforced by the backend, not by hiding buttons.

Bun, strict type checks, linting, unit tests, service emulators, and browser tests form the development environment. Local development connects every Firebase service to its emulator. Tests use separate player identities and reproducible games.

## Encryption and development modes

Every game has a server-owned `encryptionMode`: `mock` or `real`. The mode selects a provider behind one versioned interface for object encryption/decryption and key wrapping/unwrapping. Both providers use the same objects, access grants, command validation, replay paths, and gameplay code. Ciphertext envelopes identify the format, mode, key version, and object revision; there is no silent fallback between providers.

Mock mode preserves deliberately reversible fake encryption for inspecting and testing development games. It tests serialization, key distribution, authorized views, and gameplay; it offers no confidentiality against inspection of stored or transmitted data. Failed access checks still fail, and unauthorized commands remain rejected. Mock mode never disables authentication or changes game rules.

Real mode uses reviewed authenticated encryption, cryptographically random keys and nonces, and protected key distribution. Player keys are not derived from UIDs, and private keys never appear in public records or client build configuration. Bind encrypted content and grants to the game, object, revision, and recipient as appropriate to prevent substitution. The server is trusted to process game state and messages; this design does not claim secrecy from the server.

An authorized developer selects the mode per development game. Switching an existing game is a server-controlled operation: pause processing, migrate all retained object/key versions and snapshots to a new encryption epoch, verify replay and authorized access, then atomically activate the epoch and resume. Failure leaves the old epoch authoritative. Concurrent commands and stale clients cannot mix modes. Changing one game never changes another.

A game that has used mock mode remains marked as having exposed development data. Switching it to real encryption cannot make already-disclosed information secret. Public campaigns start in real mode and reject requests to enable mock mode. If the real provider is unavailable, real-mode creation fails; it never substitutes mock encryption.

Security depends on both the provider and the complete authorization/key lifecycle. Release requires tests of ciphertext tampering, wrong recipients/keys, replay and substitution, access revocation, key recovery/rotation, and direct database/history access. Mock-mode success is not evidence of confidentiality. Both providers must produce equivalent authorized gameplay outcomes.

## GitHub Pages deployment

GitHub Pages hosts the static client. Production is served at `/clusterii/`; PR previews are served at `/clusterii/prN/`. Each build receives its base path, and every route, asset, invitation, and return link respects it. Static routes use trailing slashes and generated entry files so opening or refreshing a deep link does not depend on a server rewrite.

Publishing preserves other previews and production files. Shared Pages writes are serialized, and stale builds cannot overwrite a newer revision of the same destination. Each deployed build exposes its source revision and workflow provenance through diagnostics. The PR receives a retained preview link as soon as publication completes.

Preview publication and full verification run independently. A published preview is available for review before long test runs finish; publication is not a claim that checks passed. Production follows reviewed merges to main. Backend rules, indexes, functions, and schedules deploy separately through a compatible rollout process; Pages does not execute the backend.

Production and previews use deployment-independent game IDs and compatible backend schemas. A URL change does not create a new game namespace or identity. Development games carry explicit server-enforced access and encryption settings; test state is separated from public campaigns by policy, not by trusting the URL. Existing games retain their environment, participants, and history across compatible client deployments.

Only public Firebase client configuration enters the static build. Service credentials remain in backend deployment secrets. Emulator-backed tests and supported hosted smoke checks cover production and nested preview paths, Google sign-in return flows, and recovery of the same game from either client URL.

## Completion and configuration

The MVP is complete when independent players finish a sustained campaign using all four factions, four developments, eight technologies, market speculation, fleets, both combat layers, escrow, private diplomacy, and shared victory. It includes phone/desktop controls, rules/help, retained results, operational monitoring, backup restoration, and compatible deployment recovery.

The ruleset supplies the balance values: faction names and bonuses, player counts, construction prices/times, research costs, transport capacity/speed, combat coefficients and rounding, intelligence fields, alliance eligibility, victory thresholds, and cross-game incentives. These are explicit design decisions before their mechanics ship. They do not change the architecture, per-game encryption contract, or full-screen application model defined here.
