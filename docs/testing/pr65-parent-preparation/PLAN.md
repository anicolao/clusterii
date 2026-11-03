# PR65 isolated recovery preparation

Parent: 4dda4c889e16142f3e020169dd8d7de1f549c517. Original: 757d423c4d21397ca36ff9233c6741257a4df72a. Active PR65 is untouched.

The original history/helper changes are not inherited by PR64. The isolated merge preserves them exactly: 15 individually acknowledged setup controls (identity, campaign/seat, twelve pause/resume commands, close), each with the existing 30-second step budget. The enclosing test deadline, later assertions, ordinal/image names and all actions remain unchanged. The helper rejects empty/duplicate descriptions and records completion only after all controls finish. No runner, production, dependency, renderer or baseline changes. All 5422 inherited PNGs and complete baseline metadata remain byte-identical. Historical Darwin narrative updates describe the split; they introduce no images or new approval.

Read Cluster E2E_GUIDE and actual Pantheon tests/e2e README and 001-game-setup README. This integration preserves the existing story location; it does not create or reorganize a story.

Historical strict run39724370529: 48 missing-reference first failures (12 families × four sizes), 116 passed, eight skipped, no pixel/timeout failures in summaries. All 48 reference paths now exist in reviewed parent. This resolves absence, not proof of later assertions masked by first failure. Retained verify manifests at clean4f13d4fb9d024a082950d0b39f47f4a6be1491b3 report four passed history journeys, 42 views total (12 phone, ten each other size) and 15 controls per journey. Old publication failed exact revision check with HTTP404; current-head publication still required. No fresh candidates or promotions.

Offline Nix validation: check passed with zero errors/warnings; story-policy 23 tests and policy passed; story-tools 14 tests/45 assertions passed. The first local metadata reader used entries instead of serialized steps and failed before writing its report; corrected schema produced retained-history.json. No browser/service acceptance rerun was made. Tooling fixtures are not current player acceptance.

Publication plan: review this isolated merge, then normal fast-forward active65 only when authorized. Run unchanged required checks and serialize publication after existing live publication jobs; verify exact hosted revision/assets. Preserve PR62–64 live runs. No GitHub merge or unseen reference approval.
