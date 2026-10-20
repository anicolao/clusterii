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

## Contributing

Use Node.js 22 or later for the prompt checks. Install the commit hook with `git config core.hooksPath .githooks`, and run `node --test scripts/check-prompts.test.mjs` to verify enforcement. Follow [AGENTS.md](AGENTS.md) and record requests verbatim in [PROMPTS.md](PROMPTS.md).

## License

Cluster is licensed under [GNU GPL v3.0 only](LICENSE) (`GPL-3.0-only`).
