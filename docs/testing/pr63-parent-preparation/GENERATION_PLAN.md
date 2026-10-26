# Bounded paused-fleet-travel candidate path

Preparation only. Do not update active PR63 before the approved PR62 promotion reaches its safe integration boundary. No run request or new PR is issued here.

The original PR63 delta is ff1d616183df97aaa4fcc71d2e5c59cb32444711..9050d65ecd1589d44500690750a27a9d0821a42f. It introduces tests/browser/fleet-travel-catchup.story.spec.ts, its narrowly named demo maintenance-clock transformation/guard tests, bounded read-only text diagnostics/tests, and historical Darwin evidence. No production reducer/action/persistence changes. Existing parent fixes must survive integration unchanged.

Read Cluster E2E_GUIDE and actual Pantheon tests/e2e README/001-game-setup instructions; preserve the existing illustrated story unchanged during this recovery. No new feature or story reorganization. All acknowledged pause/resume, immutable per-tick ledger arithmetic, concurrent catch-up/repeat delivery, route conservation, privacy projection, keyboard and geometry assertions remain intact.

Use the established isolated branch-request pattern proven by PR62 invitation run40185678311, pinned LinuxARM image824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321 and Nix. A future executor should add only an exact `recovery paused-travel` dispatch to both launcher layers, an exact fresh source-bound request, and the narrow candidate entry. Validate inner/outer rejection of unrelated/extra arguments and actual `--list` count before dispatch. Keep the executor separate from the active PR63 integration; do not import the invitation executor wholesale or reuse its old request.

Exact browser selection:

```sh
bun x playwright test --config playwright.stories.config.ts tests/browser/fleet-travel-catchup.story.spec.ts --project=phone --project=desktop --project=large --project=short --retries=0 --max-failures=1 --update-snapshots=none
```

Svelte sync before collection, then serial Functions build before owned emulator execution. Set CLUSTER_STORY_MODE=generate and existing emulator-catalogue-register NODE_OPTIONS, run through actual Firebase auth/database/firestore/functions emulators with demo-clusterii. No direct state injection or service-result substitution. Current story240s total, original step/expect/action/capture budgets and zero pixel tolerance remain unchanged. Stop first failure and preserve partials; never treat them as a complete candidate family.

Historical inventory is34captures per viewport,136total across4complete passed journeys; confirm passing manifests and exact source/spec/renderer rather than assuming that count. Retain all originals/layouts/narratives/request evidence/failed traces/renderer logs. Compare every frame against applicable inspected evidence and provide all new Linux captures for independent review before promotion. Existing Darwin references are historical scoped evidence, not Linux approval.

Preflight fresh disk floor2359296KiB plus reserve, owned-port checks, no unrelated cleanup; preserve all existing PR58–62 runs. No full-suite generation or stale9050d65e rerun. No baseline promotion, timeout relaxation, publication, merge or release claim from this plan.
