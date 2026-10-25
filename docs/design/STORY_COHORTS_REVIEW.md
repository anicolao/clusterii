# Bounded story service lifetime

The retained #62 Linux artifact contains 10,001-message WebChannel backlogs and Java heap exhaustion during later service failures. The story runner now starts a fresh owned emulator process for each viewport in CI. This bounds accumulation across viewports; it does not establish why the backlog grows or demonstrate a production fix.

| Dependency / acceptance | Evidence / status |
| --- | --- |
| Base | PR #63 `feat/travel-pause-catchup-stories`, `9050d65` |
| Every story and viewport | Same Playwright configuration, selected once per viewport; one worker, zero retries, unchanged deadlines and exact pixels |
| Owned services | Port guard before every cohort; no unrelated process termination or state reset |
| Evidence retention | Merge disjoint viewport artifacts, preserve failed traces/logs/status, fail on collisions; prior local output moved aside |
| Failure semantics | Continue independent viewports after a test failure, then fail overall; explicit interruption stops successors |
| Orchestration tests | Five isolated tests (within 22 passing policy/clock tests) cover failures, prior artifacts, interruption, initial/later occupied ports and collisions |
| Real service comparison | 8 passed, 72 unchanged exact captures across all four viewports; `/tmp/cluster-cohorts-exact.log` |
| Linux resource acceptance | Pending current-head CI; no broad duplicate rerun |
| Independent / hosted acceptance | Open; no UI or production behavior changed |

CI sets `CLUSTER_STORY_COHORTS=viewport` for both verification and explicitly requested candidate generation. Local focused runs can use the same setting. Each cohort's timestamps, exit result, Playwright status and Firestore debug log live in `test-results/stories/_cohorts/<viewport>/`; workflow upload includes them and the narrowly scoped `.story-cohorts-*` staging paths, so an artifact collision also retains both conflicting copies in CI. A failing viewport cannot be reported as passing because a later viewport succeeds.

The inherited identity-raster mismatch, missing reviewed Linux candidate families and traced history aggregate setup budget remain separate open findings. No baselines, masks, tolerance, renderer, readiness checks, tests or assertions change in this slice. See [retained service triage](../testing/CI_SERVICE_TRIAGE_2026_10_22.md).

Preview: no new player behavior; publication and exact-head verification remain pending. This tooling change does not certify hosted Google authentication, Scheduler cadence or release readiness.

Local verification also passes lint, 13 prompt-history tests and 13 browser-tool tests (40 assertions). The four cohort logs report 2 passed each in 15.4s, 19.3s, 49.9s and 18.0s, excluding build/emulator startup. Each fresh process produced a separate Firestore log and passed result; all 72 captures survived the merge. The exact run exercises normal orchestration; interruption/ownership/collision failures are isolated tooling evidence, not player journeys. A follow-up signal-handler correction retains stop requests between child processes; it does not change story execution or rendering.
