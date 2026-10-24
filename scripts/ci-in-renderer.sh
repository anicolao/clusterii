#!/usr/bin/env bash
set -euo pipefail
git config --global --add safe.directory "$PWD"
java -version
node --version
bun --version
bun install --frozen-lockfile
bun install --cwd functions --frozen-lockfile
# Retain actual dependency resolution before running unchanged browser guards.
node -e 'console.log(require("playwright").chromium.executablePath())' > ci-evidence/nix-renderer/browser-path.txt
browser=$(cat ci-evidence/nix-renderer/browser-path.txt)
# Compare loaders diagnostically; actual Playwright validation stays enabled.
if ! "$CLUSTER_NIX_LDD" "$browser" > ci-evidence/nix-renderer/nix-ldd.txt 2>&1; then
  echo "Nix loader inspection returned nonzero" >> ci-evidence/nix-renderer/nix-ldd.txt
fi
ldd "$browser" > ci-evidence/nix-renderer/renderer-ldd.txt
case "$1" in
  stories)
    # Unit fixtures also exercise settlementTiming; only real story batches may
    # claim the single emulator observation.
    post_marker=${CLUSTER_EMULATOR_POST_MARKER:-}
    unset CLUSTER_EMULATOR_POST_MARKER
    bun run test:story-policy
    bun run test:story-tools
    bun run test:browser-storage
    if [ "$2" = verify ]; then CLUSTER_EMULATOR_POST_MARKER="$post_marker" bun run test:stories; else bun run test:stories:generate; fi
    ;;
  recovery)
    [ "$#" -eq 2 ] || exit 2
    node scripts/recovery-settlement.mjs "$2"
    ;;
  application)
    bun run check
    bun run lint
    bun run test
    bun run test:story-policy
    CLUSTER_PROFILE_INGRESS_DIAGNOSTICS=1 \
      CLUSTER_PROFILE_INGRESS_LOG="$PWD/ci-evidence/profile-ingress.jsonl" \
      NODE_OPTIONS="${NODE_OPTIONS:-} --import=$PWD/scripts/profile-ingress-observer.mjs" \
      bunx firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions 'bun test tests/service.test.ts && bunx playwright test'
    node scripts/verify-profile-ingress-evidence.mjs "$PWD/ci-evidence/profile-ingress.jsonl"
    ;;
  *) exit 2 ;;
esac
