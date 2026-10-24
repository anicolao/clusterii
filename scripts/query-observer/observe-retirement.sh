#!/usr/bin/env bash
set -euo pipefail
: "${1:?fresh owned output directory required}"
[[ "$1" = /tmp/cluster-retirement-* && ! -e "$1" ]]
[[ -z "$(git status --porcelain)" ]]
[[ $(df -k . | tail -1 | awk '{print $4}') -ge 2559296 ]]
node --input-type=module - <<'JS'
import {createConnection} from 'node:net';
for(const port of [19099,19000,18080,19150,15001,14400,14500,14000,19299,19499]) {
 const busy=await new Promise(done=>{const s=createConnection({host:'127.0.0.1',port});s.on('connect',()=>{s.destroy();done(true)});s.on('error',()=>done(false));});
 if(busy)throw Error(`Occupied port ${port}; nothing stopped`);
}
JS
bash scripts/query-observer/build-check.sh "$1"
git rev-parse HEAD > "$1/source.txt"
shasum -a 256 tests/emulator-retirement.test.ts scripts/query-observer/QueryObserver.java > "$1/source-sha256.txt"
bun run --cwd functions build
export CLUSTER_QUERY_OBSERVER_PROJECT=demo-clusterii
export JAVA_TOOL_OPTIONS="--add-exports=java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED -javaagent:$1/observer.jar=$1/server.jsonl"
export CLUSTER_RETIREMENT_OUTPUT="$1/phases.jsonl"
for name in firestore-debug.log firebase-debug.log database-debug.log; do
 if [[ -f "$name" ]]; then cp "$name" "$1/preexisting-$name"; fi
done
set +e
bun x firebase emulators:exec --project demo-clusterii --only auth,database,firestore,functions 'bun test tests/emulator-retirement.test.ts'
code=$?
set -e
printf '%s\n' "$code" > "$1/test-exit.txt"
for name in firestore-debug.log firebase-debug.log database-debug.log; do
 if [[ -f "$name" ]]; then cp "$name" "$1/$name"; fi
done
exit "$code"
