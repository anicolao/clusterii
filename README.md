# Cluster

Cluster is a slow real-time space conquest game inspired by *Neptune’s Pride*, with deeper economic, combat, and diplomatic mechanics. No single empire has everything it needs to win alone.

Expand across star systems, develop their resources, research new capabilities, and negotiate alliances. Space and ground control are separate: winning an orbital battle does not automatically give you the planets below.

## Core mechanics

- **Stars and factions:** Four stellar classes (M, G, A, and O) support four factions, each favouring a particular star type.
- **Developments:** Markets produce credits, orbital training camps produce fighters, ground bases produce infantry, and space stations produce science.
- **Fleets and conquest:** Transport fighters and infantry between systems to contest orbital and surface control independently.
- **Economy and research:** Anticipate other players’ development spending through market specialisation, and invest science in eight technologies.
- **Diplomacy:** Build alliances whose complementary strengths make victory possible.

See [VISION.md](VISION.md) for the game’s design and experience.

[CLUSTER_II_MVP.md](CLUSTER_II_MVP.md) defines the game and application design. [CLUSTER_I_DESIGN_REVIEW.md](CLUSTER_I_DESIGN_REVIEW.md) records the predecessor’s architecture, interface, and implementation gaps.

[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) lays out the milestones, dependencies, and acceptance criteria for the complete game.

Cinematic realism is the selected visual direction. [UX_DESIGN.md](UX_DESIGN.md) defines the game experience, desktop/phone mockups and interaction acceptance criteria. [Art direction options](docs/art/ART_DIRECTION_OPTIONS.md) retains the visual exploration.

Step 0’s [review guide](docs/design/STEP_0_REVIEW.md) covers the [rules](RULES_SPEC.md), [versioned balance data](rules/cluster-v0.1.0.json), and [technical contract](TECHNICAL_CONTRACT.md).

## Contributing

Use Node.js 22 or later for the prompt checks. Install the commit hook with `git config core.hooksPath .githooks`, and run `node --test scripts/check-prompts.test.mjs` to verify enforcement. Follow [AGENTS.md](AGENTS.md) and record requests verbatim in [PROMPTS.md](PROMPTS.md).

Each commit includes a new prompt or a continuation record. If one request needs multiple commits, create `PROMPT_WORK.md` to record the additional steps without repeating the prompt. [AGENTS.md](AGENTS.md) defines the format; the file is absent until needed.

## License

Cluster is licensed under [GNU GPL v3.0 only](LICENSE) (`GPL-3.0-only`).

## Application status and development

Step 1 delivers the cinematic entry, four-chapter field guide, Google sign-in, and persistent commander identity. Saving an alias and portrait sends an encrypted command through Realtime Database and a Cloud Function reducer into encrypted Firestore revisions and owner grants. The browser waits for the server receipt. Mock encryption is inspectable and provides no confidentiality; real mode fails closed. Campaigns and the galaxy follow in later milestones. Hosted Google sign-in requires the project’s OAuth web-client configuration; sign-in and persistence are verified against the Firebase emulators.

The [PR #4 preview](https://anicolao.github.io/clusterii/pr4/) uses the same Firebase project as the production build: `clusterii-20261020`. Public Firebase configuration is included in the client; deployment credentials are not.

Use Bun 1.3.10, Node 22, and Java 21. Run `bun install --frozen-lockfile`, `bun install --cwd functions --frozen-lockfile`, and `bun run check`. Start `bun run emulators` in one terminal and `PUBLIC_EMULATORS=true bun run dev` in another. Emulator endpoints use ports 19099/19000/18080/15001; the UI runs on 14000. Hosted mode never falls back to local state or emulators.

Run `bun run test`, `bun test tests/service.test.ts` with emulators running, and `bun run test:browser`. Browser tests build `/clusterii/pr4/` and serve actual static files, exercise Google emulator sign-in and profile persistence, and compare exact screenshots. Baselines are specific to the pinned browser and operating system; review changed images before updating them.

Build with `PUBLIC_BASE_PATH=/clusterii bun run build`. `node scripts/serve-pages.mjs /clusterii 4173` serves the same subpath locally. Pages publication runs independently of verification and retains sibling previews. Deploy backend changes first with `bunx firebase deploy --only firestore:rules,database,functions --project clusterii-20261020`; backend support remains compatible with retained clients.
