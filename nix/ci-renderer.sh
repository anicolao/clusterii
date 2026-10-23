#!/usr/bin/env bash
# Values are generated from the locked renderer derivation, never user input.
: "${engine:?}" "${imageArchive:?}" "${imageTag:?}" "${imageConfig:?}" "${imageDigest:?}" "${nixCommand:?}"
case "${1:-}:${2:-}" in
  stories:verify|stories:generate|application:) ;;
  *) echo "Usage: cluster-ci-renderer stories verify|generate OR application" >&2; exit 2 ;;
esac
: "${RUNNER_TEMP:?GitHub runner scratch directory required}"
workspace=$PWD
mkdir -p test-results/nix-renderer
logs=$workspace/test-results/nix-renderer
state=$(mktemp -d "$RUNNER_TEMP/cluster-nix-engine.XXXXXX")
export DOCKER_HOST="unix://$state/docker.sock"
# sudo is the runner's privilege broker, not a package installer or engine.
# Start only the Nix engine, with an isolated socket, data, pid and execution root.
cleanup() {
  if [ -f "$state/engine.pid" ]; then
    /usr/bin/sudo -n kill "$(cat "$state/engine.pid")" || true
  fi
}
trap cleanup EXIT
# Log redirection deliberately belongs to the unprivileged runner workspace.
# shellcheck disable=SC2024
/usr/bin/sudo -n "$engine" --host "$DOCKER_HOST" \
  --data-root "$state/data" --exec-root "$state/exec" --pidfile "$state/engine.pid" \
  --bridge none --iptables=false --ip6tables=false --group "$(id -gn)" \
  > "$logs/engine.log" 2>&1 &
engineLaunch=$!
ready=false
for ((attempt=0; attempt<60; attempt++)); do
  if docker info > "$logs/engine-info.log" 2>&1; then ready=true; break; fi
  if ! kill -0 "$engineLaunch" 2>/dev/null; then break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo "Nix engine did not become ready; inspect engine.log" >&2; exit 1; fi
docker load --input "$imageArchive" > "$logs/image-load.log"
actual=$(docker image inspect "$imageTag" --format '{{.Id}}')
if [ "$actual" != "$imageConfig" ]; then echo "Pinned image configuration differs" >&2; exit 1; fi
printf '%s\n' "$imageDigest" "$actual" > "$logs/image-identity.txt"
docker run --rm --ipc=host --network=host \
  --mount type=bind,src=/nix,dst=/nix \
  --mount "type=bind,src=$workspace,dst=$workspace" \
  --workdir "$workspace" \
  --env CI=true --env NIX_REMOTE=daemon \
  --env 'NIX_CONFIG=experimental-features = nix-command flakes' \
  --env "CLUSTER_NIX_RENDERER_DIGEST=$imageDigest" \
  --env CLUSTER_PINNED_RENDERER --env CLUSTER_STORY_COHORTS --env CLUSTER_SETTLEMENT_TIMING \
  --entrypoint "$nixCommand" "$imageTag" \
  develop path:./nix#renderer --command bash scripts/ci-in-renderer.sh "$@"
