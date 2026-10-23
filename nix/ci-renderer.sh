#!/usr/bin/env bash
# Values are generated from the locked renderer derivation, never user input.
: "${containerd:?}" "${rootShell:?}" "${engine:?}" "${imageArchive:?}" "${imageTag:?}" "${imageConfig:?}" "${imageDigest:?}" "${nixCommand:?}"
case "${1:-}:${2:-}" in
  stories:verify|stories:generate|application:) ;;
  *) echo "Usage: cluster-ci-renderer stories verify|generate OR application" >&2; exit 2 ;;
esac
: "${RUNNER_TEMP:?GitHub runner scratch directory required}"
workspace=$PWD
mkdir -p ci-evidence/nix-renderer
logs=$workspace/ci-evidence/nix-renderer
state=$(mktemp -d "$RUNNER_TEMP/cluster-nix-engine.XXXXXX")
unset DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH
export DOCKER_HOST="unix://$state/docker.sock"
# sudo is the runner's privilege broker, not a package installer or engine.
# Start only the Nix engine, with an isolated socket, data, pid and execution root.
cleanup() {
  status=$?
  # The pinned renderer runs as root. mkdtemp cohort directories are0700, so
  # the unprivileged upload action cannot read them until ownership is restored.
  # Only this checkout's artifact roots are touched; never follow symlinks.
  if ! /usr/bin/sudo -n "$rootShell" -c '
    export PATH="$1"; owner=$2; shift 2
    for artifact in "$@"; do
      if [ -d "$artifact" ] && [ ! -L "$artifact" ]; then
        chown -hR -- "$owner" "$artifact" || exit 1
      fi
    done
  ' -- "$PATH" "$(id -u):$(id -g)" "$workspace/test-results" "$workspace/ci-evidence"; then
    echo "Artifact ownership restoration failed" >&2
    if [ "$status" -eq 0 ]; then status=1; fi
  fi
  if [ -f "$state/engine.pid" ]; then
    /usr/bin/sudo -n kill "$(cat "$state/engine.pid")" || true
  fi
  if [ -f "$state/containerd.pid" ]; then
    /usr/bin/sudo -n kill "$(cat "$state/containerd.pid")" || true
  fi
  exit "$status"
}
trap cleanup EXIT
# Never inherit the runner daemon configuration or its containerd endpoint.
printf '%s\n' '{"features":{"containerd-snapshotter":false}}' > "$state/daemon.json"
printf '%s\n' 'version = 3' 'disabled_plugins = ["io.containerd.grpc.v1.cri", "io.containerd.cri.v1.images", "io.containerd.cri.v1.runtime"]' > "$state/containerd.toml"
deadline=$((SECONDS + 60))
# Record the private root process before exec; cleanup cannot target host services.
# shellcheck disable=SC2024
/usr/bin/sudo -n "$rootShell" -c 'printf "%s\n" "$$" > "$1"; shift; export PATH="$1"; shift; exec "$@"' -- \
  "$state/containerd.pid" "$PATH" "$containerd" --config "$state/containerd.toml" \
  --address "$state/containerd.sock" --root "$state/containerd-data" --state "$state/containerd-state" \
  > "$logs/containerd.log" 2>&1 &
containerdLaunch=$!
while [ ! -S "$state/containerd.sock" ]; do
  if [ "$SECONDS" -ge "$deadline" ] || ! kill -0 "$containerdLaunch" 2>/dev/null; then
    echo "Private Nix containerd did not become ready" >&2; exit 1
  fi
  sleep 1
done
# Log redirection deliberately belongs to the unprivileged runner workspace.
# shellcheck disable=SC2024
/usr/bin/sudo -n "$engine" --config-file "$state/daemon.json" --containerd "$state/containerd.sock" --host "$DOCKER_HOST" \
  --data-root "$state/data" --exec-root "$state/exec" --pidfile "$state/engine.pid" \
  --bridge none --iptables=false --ip6tables=false --group "$(id -gn)" \
  > "$logs/engine.log" 2>&1 &
engineLaunch=$!
ready=false
while [ "$SECONDS" -lt "$deadline" ]; do
  if docker info > "$logs/engine-info.log" 2>&1; then ready=true; break; fi
  if ! kill -0 "$engineLaunch" 2>/dev/null; then break; fi
  sleep 1
done
if [ "$ready" != true ]; then echo "Nix engine did not become ready; inspect engine.log" >&2; exit 1; fi
docker load --input "$imageArchive" > "$logs/image-load.log"
docker image inspect "$imageTag" > "$logs/image-inspect.json"
actual=$(docker image inspect "$imageTag" --format '{{.Id}}')
printf '%s\n' "$imageDigest" "$actual" > "$logs/image-identity.txt"
if [ "$actual" != "$imageConfig" ]; then echo "Pinned image configuration differs: expected $imageConfig, observed $actual" >&2; exit 1; fi
docker run --rm --ipc=host --network=host \
  --mount type=bind,src=/nix,dst=/nix \
  --mount "type=bind,src=$workspace,dst=$workspace" \
  --workdir "$workspace" \
  --env CI=true --env NIX_REMOTE=daemon \
  --env 'NIX_CONFIG=experimental-features = nix-command flakes' \
  --env "CLUSTER_NIX_RENDERER_DIGEST=$imageDigest" \
  --env CLUSTER_PINNED_RENDERER --env CLUSTER_STORY_COHORTS --env CLUSTER_SETTLEMENT_TIMING --env CLUSTER_SETTLEMENT_RPC_TIMING --env CLUSTER_EMULATOR_POST_MARKER \
  --entrypoint "$nixCommand" "$imageTag" \
  develop path:./nix#renderer --command bash scripts/ci-in-renderer.sh "$@"
