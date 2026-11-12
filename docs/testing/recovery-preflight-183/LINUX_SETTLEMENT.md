# Bounded Linux settlement entry — identified, not executed

The established Linux runtime is GitHub `ubuntu-24.04-arm`, locked `nix/flake.lock`, with the Nix-managed private containerd/dockerd and digest-pinned Playwright image in `nix/renderer.nix`. ARM image digest824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321; exact renderer validation and artifact ownership restoration stay enabled. Completed138 application/story execution proves this runtime reaches real tests, not that settlement meets its budget.

Local host is Darwin arm64. An active Nix QEMU builder and `/etc/nix/machines` advertise `aarch64-linux,x86_64-linux` at `ssh-ng://builder@linux-builder`. Read-only store access failed: configured private identity is not readable by this session (plus a missing user identity). No permissions were changed, no identity read/copied, no VM/installation started. A build daemon is not automatically an established interactive browser/emulator workspace. The obsolete Colima directory is not evidence of an available supported runtime.

## Smallest player-story command inside the provisioned renderer

After owned-port/disk checks, exact source/hash capture and serial compilation, use the existing scripts' environment and real harness:

```sh
export CLUSTER_RECOVERY_OUTPUT=$(mktemp -d "$PWD/ci-evidence/settlement-single.XXXXXX")
export CLUSTER_STORY_OUTPUT_ROOT="$CLUSTER_RECOVERY_OUTPUT/stories"
bunx svelte-kit sync
bun run --cwd functions build
CLUSTER_STORY_MODE=verify \
CLUSTER_SETTLEMENT_TIMING=1 \
CLUSTER_SETTLEMENT_RPC_TIMING=1 \
CLUSTER_EMULATOR_POST_MARKER=1 \
NODE_OPTIONS="--import=$PWD/tests/browser/story-helpers/emulator-catalogue-register.mjs" \
bunx firebase emulators:exec --project demo-clusterii \
  --only auth,database,firestore,functions \
  'bunx playwright test --config playwright.stories.config.ts tests/e2e/010-zero-science/zero-science.spec.ts --project=phone --max-failures=1 --output="$CLUSTER_RECOVERY_OUTPUT/playwright"'
```

Run this **inside** the established Nix renderer shell, with its pinned renderer environment, unchanged framebuffer/browser and existing dependencies. This is one test, not `test:stories` or four cohorts.240s total,30s named step,10s assertions, retries0, exact RGBA0 remain unchanged. No `--update-snapshots`, generation mode, filter dropping checks, injected balance/levels, force clicks, retries or split-to-evade-budget. Use an isolated fresh output directory/configured retention for actual run; do not overwrite existing `test-results/stories` evidence. Preserve fixture clocks exactly as current source, and distinguish setup admission/reference failures from settlement.

The current `nix run path:./nix#ci-renderer -- stories verify` launcher **does not offer this bounded mode**: its accepted modes call policy/tools/storage plus the full runner, and it does not forward a file/project filter. `CLUSTER_STORY_FILTER` is not forwarded through the container, and even the runner's grep cannot select one viewport without a bounded caller. Therefore that launcher must not be invoked under the guise of the single case. No new workflow/full run was started.

The next minimal change would be a narrowly validated bounded command entry reusing this same pinned runtime/ownership/retention, with local orchestration checks before dispatch. Alternatively an already-authorized interactive session inside the existing renderer can run the command verbatim. Neither has been established here, so Linux execution remains blocked on that entry/access—not falsely reported as executed locally. Do not install a substitute runtime or treat Darwin timing as Linux evidence.
