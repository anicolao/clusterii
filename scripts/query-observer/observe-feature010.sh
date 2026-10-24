#!/usr/bin/env bash
# Invoke only inside the established Nix shell. No generation or test fallback.
set -euo pipefail
: "${1:?absolute output path containing the validated observer.jar required}"
[[ "$1" = /tmp/cluster-query-* && -f "$1/observer.jar" && ! -e "$1/source.txt" ]]
[[ -z "$(git status --porcelain)" ]]
[[ $(df -k . | tail -1 | awk '{print $4}') -ge 2559296 ]]
node --input-type=module - <<'JS'
import {createConnection} from 'node:net';
for (const port of [4173,19099,19000,18080,19150,15001,14400,14500,14000,19299,19499]) {
 const busy = await new Promise(resolve => {const s=createConnection({host:'127.0.0.1',port}); s.on('connect',()=>{s.destroy();resolve(true)});s.on('error',()=>resolve(false));});
 if(busy) throw Error(`Occupied port ${port}; nothing stopped`);
}
JS
git rev-parse HEAD > "$1/source.txt"
shasum -a 256 tests/e2e/010-zero-science/zero-science.spec.ts scripts/query-observer/*.java > "$1/source-sha256.txt"
bun x svelte-kit sync
bun run --cwd functions build
export CLUSTER_QUERY_OBSERVER_PROJECT=demo-clusterii
export JAVA_TOOL_OPTIONS="--add-exports=java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED -javaagent:$1/observer.jar=$1/server.jsonl"
export NODE_OPTIONS="--import=file://$PWD/tests/browser/story-helpers/emulator-catalogue-register.mjs"
export CLUSTER_SETTLEMENT_TIMING=1 CLUSTER_SETTLEMENT_RPC_TIMING=1
export CLUSTER_STORY_MODE=verify CLUSTER_STORY_OUTPUT_ROOT="$1/stories"
export QUERY_OBSERVER_RUN_OUTPUT="$1"
for name in firestore-debug.log firebase-debug.log database-debug.log; do
 if [[ -f "$name" ]]; then cp "$name" "$1/preexisting-$name"; fi
done
set +e
bun x firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions 'bun x playwright test --config playwright.stories.config.ts tests/e2e/010-zero-science/zero-science.spec.ts --project=phone --max-failures=1 --retries=0 --update-snapshots=none --output="$QUERY_OBSERVER_RUN_OUTPUT/playwright"'
code=$?
set -e
printf '%s\n' "$code" > "$1/test-exit.txt"
for name in firestore-debug.log firebase-debug.log database-debug.log; do
 if [[ -f "$name" ]]; then cp "$name" "$1/$name"; fi
done
exit "$code"
