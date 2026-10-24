# Illustrated player journeys

Read [E2E_GUIDE.md](../../E2E_GUIDE.md). Numbered feature directories contain the actual spec, README, FIDELITY, reviewed screenshots and generated stories.

- [001 Entry](001-entry/README.md)

Common helpers expose the existing shared implementation; they do not create a parallel mock helper. Remaining legacy stories still live in tests/browser and are discovered by the same runner. Migrate them alongside production screen work, retaining exact pixels and review/source provenance.

- [002 Galaxy command surface and spatial layers](002-galaxy/README.md)
- [003 Authoritative science rate and sources](003-science/README.md)

- [Fleet contact history and refresh recovery](012-fleet-contacts/README.md): feature-local migration prepared; corrected live execution remains pending.
