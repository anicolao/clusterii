# First Linux renderer startup failure

Source89efb4f2: application39974043149/job120483891690 and stories39974043072/job120483891445 both complete Nix bootstrap, fixed image download/build, engine startup and image load, then reject image identity before any browser/loader check. Generation was skipped; no candidate evidence. Original full logs and2438-byte engine artifact are retained unchanged/compressed losslessly. No settlement or loader output exists in this run.

Engine artifact proves containerd-snapshotter=true and address=/run/containerd/containerd.sock. Contrary to the prior intended isolation claim, the first launcher used runner containerd. Docker29 defaults fresh engines to containerd storage; upstream containerd inspection exposes the manifest target digest as Id, while our preserved assertion expects the config digest. The launcher did not record observed Id before rejection, so this exact value remains absent; do not invent it.

Correction: task-private Nix containerd with private socket/root/state and PID, explicit daemon config using classic image storage, explicit containerd address, and cleared Docker context/TLS overrides. Keep the original config-hash equality, immutable OCI/archive hashes and browser validation. Record complete image inspection/observed identity before assertions. The same60-second startup budget covers both processes; no game/test deadline change. No runner engine/containerd is stopped or cleaned. Current source is statically checked, Linux result pending.

Primary evidence: https://docs.docker.com/engine/storage/containerd/ and https://github.com/moby/moby/blob/master/daemon/containerd/image_inspect.go (ID: target.Digest.String()). This is a startup correction, not a historical pixel, ingress, settlement or publication fix.
