#!/usr/bin/env bash
set -euo pipefail
git config --global --add safe.directory "$PWD"
java -version
node --version
bun --version
bun install --frozen-lockfile
bun install --cwd functions --frozen-lockfile
# Retain actual dependency resolution before running unchanged browser guards.
node -e 'console.log(require("playwright").chromium.executablePath())' > test-results/nix-renderer/browser-path.txt
browser=$(cat test-results/nix-renderer/browser-path.txt)
# Compare loaders diagnostically; actual Playwright validation stays enabled.
if ! "$CLUSTER_NIX_LDD" "$browser" > test-results/nix-renderer/nix-ldd.txt 2>&1; then
  echo "Nix loader inspection returned nonzero" >> test-results/nix-renderer/nix-ldd.txt
fi
ldd "$browser" > test-results/nix-renderer/renderer-ldd.txt
case "$1" in
  stories)
    bun run test:story-policy
    bun run test:story-tools
    bun run test:browser-storage
    if [ "$2" = verify ]; then bun run test:stories; else bun run test:stories:generate; fi
    ;;
  application)
    bun run check
    bun run lint
    bun run test
    bun run test:story-policy
    bunx firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions 'bun test tests/service.test.ts && bunx playwright test'
    ;;
  *) exit 2 ;;
esac
