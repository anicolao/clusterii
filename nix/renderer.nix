{ pkgs }:
let
  arm = pkgs.stdenv.hostPlatform.isAarch64;
  digest = if arm then "sha256:824f1a789072e648c62541c2cfa4479c4061a290d5c27766d67dc1dcbc19b321" else "sha256:cf0daee9b994042e011bc29f20cdff1a9f682a039b43fcd738f7d8a9d3bcd9d6";
  tag = if arm then "playwright-1.61.1" else "playwright-1.61.1-amd64";
  config = if arm then "sha256:7e11780237209f8747e8023d2ba777723d9aba451a548bbcc0563511e28a2c9a" else "sha256:89924b46ec81c1c0eb0055a7d72790b8067a16a5d0d0512e8117a01aa4a5d7ee";
  image = pkgs.dockerTools.pullImage {
    imageName = "mcr.microsoft.com/playwright";
    imageDigest = digest;
    sha256 = if arm then "sha256-wz061fYe/9CRdThOFW8gRCLMVWsI92crsP+B33Q+gKU=" else "sha256-bcvsaQrvxzHe522Xr1gDUe5YyJvzwzL5IXmHLkPwIaE=";
    os = "linux";
    arch = if arm then "arm64" else "amd64";
    finalImageName = "cluster-renderer";
    finalImageTag = tag;
  };
in {
  inherit image;
  # Validate the pinned browser with its own unchanged libc/loader. Nix's ldd
  # checks a different libc closure; never suppress Playwright validation.
  ldd = pkgs.writeShellScriptBin "ldd" ''
    if [ "''${CLUSTER_NIX_RENDERER_DIGEST:-}" != "${digest}" ]; then
      echo "Pinned renderer context required for renderer ldd" >&2
      exit 1
    fi
    exec /usr/bin/ldd "$@"
  '';
  launcher = pkgs.writeShellApplication {
    name = "cluster-ci-renderer";
    runtimeInputs = [ pkgs.docker pkgs.docker.docker-containerd pkgs.docker.docker-runc pkgs.coreutils pkgs.nix ];
    text = ''
      imageArchive=${image}
      imageTag=cluster-renderer:${tag}
      imageConfig=${config}
      imageDigest=${digest}
      engine=${pkgs.docker}/bin/dockerd
      containerd=${pkgs.docker.docker-containerd}/bin/containerd
      rootShell=${pkgs.bash}/bin/bash
      nixCommand=${pkgs.nix}/bin/nix
      ${builtins.readFile ./ci-renderer.sh}
    '';
  };
}
