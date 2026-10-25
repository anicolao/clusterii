#!/usr/bin/env bash
set -euo pipefail
git config --global --add safe.directory "$PWD"
java -version
node --version
bun --version
bun install --frozen-lockfile
bun install --cwd functions --frozen-lockfile
node -e 'console.log(require("playwright").chromium.executablePath())' > ci-evidence/nix-renderer/browser-path.txt
browser=$(cat ci-evidence/nix-renderer/browser-path.txt)
if ! "$CLUSTER_NIX_LDD" "$browser" > ci-evidence/nix-renderer/nix-ldd.txt 2>&1; then
  echo "Nix loader inspection returned nonzero" >> ci-evidence/nix-renderer/nix-ldd.txt
fi
ldd "$browser" > ci-evidence/nix-renderer/renderer-ldd.txt
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
  recovery)
    [ "$#" -eq 2 ] && [ "$2" = paused-travel ] || exit 2
    node scripts/paused-travel-candidates.mjs
    ;;
  *) exit 2 ;;
esac
