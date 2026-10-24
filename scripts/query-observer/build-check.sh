#!/usr/bin/env bash
set -euo pipefail
: "${1:?new owned output directory required}"
mkdir "$1"
mkdir "$1/agent" "$1/fixture"
javac --add-exports java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED -d "$1/agent" scripts/query-observer/*.java
javac -d "$1/fixture" scripts/query-observer/fixture/*.java
java --add-exports java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED -cp "$1/agent" ObserverCheck "$1/fixture"
printf 'Premain-Class: QueryObserver\n\n' > "$1/manifest"
jar cfm "$1/observer.jar" "$1/manifest" -C "$1/agent" .
CLUSTER_QUERY_OBSERVER_PROJECT=demo-clusterii java -Xverify:all --add-exports java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED "-javaagent:$1/observer.jar=$1/load.jsonl" -cp "$1/agent:$HOME/.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jar" ObserverLoad
