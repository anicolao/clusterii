# Fleet reader header clearance

The retained failed strict run 43090488602 reveals a production layout defect,
not an acceptable reference-only change. The desktop cargo first-view actual
covers the campaign name/context with the opaque Fleet preparation panel. The
expected image retains that context. Phone actual/expected retain the fleet
fields, quantities, focused input and disabled action; the header composition
has changed. No fleet replacement references are approved by this investigation.

Selected evidence is retained at
`/Users/anicolao/projects/games/clusterii-recovery-evidence/pr140-fleet-first-43090488602`.
Its `verified-entries.json` records 18 PNG entries from artifact 13894258735:
12,402,985 transferred range bytes, exact response ranges and entry CRC/SHA checks.
The 4,971,092,037-byte outer archive was not downloaded or whole-archive verified.
Cargo phone and desktop expected/actual/diff triples were visually inspected.

The shared fleet panel inherited a fixed 58px top (90px at 4K), while the current
desktop campaign context occupies a second header row. The scoped correction
uses the already measured command rail height for the fleet panel only. The
existing real-action `openForces` helper now checks that the campaign heading is
inside the rail and the opaque panel starts below its complete bounds. This
detects occlusion that DOM visibility does not detect. No assertions, deadlines,
references, renderer settings or required workflows are removed or relaxed.

Read the actual Pantheon E2E guide/feature layout and current Cluster guide before
this shared-helper change. No story was added or reorganized; existing legacy
migration gaps remain explicitly inventoried by the policy gate.

Validation: established offline Nix `bun run check` passed with zero errors and
one existing FleetRoute accessibility warning; story policy and formatting for
both edited files passed. Real-service browser geometry and complete four-size
fleet candidate review remain required before integration or reference approval.

Disk policy: useful compact provenance and unique diagnostic originals remain;
redundant credit extraction files were already removed after exact equality to
pushed Git references. No additional full artifact archive was retained here.
