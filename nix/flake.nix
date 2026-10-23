{
  description = "Cluster II development and CI environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        renderer = import ./renderer.nix { inherit pkgs; };
      in {
        packages = pkgs.lib.optionalAttrs pkgs.stdenv.isLinux {
          ci-renderer = renderer.launcher;
          renderer-image = renderer.image;
        };
        devShells.renderer = pkgs.mkShell {
          inputsFrom = [ self.devShells.${system}.default ];
          packages = [ renderer.ldd ];
          shellHook = ''
            export XDG_CACHE_HOME="$PWD/.firebase/cache"
            export PATH="${renderer.ldd}/bin:$PATH"
            ${pkgs.lib.optionalString pkgs.stdenv.isLinux "export CLUSTER_NIX_LDD=${pkgs.glibc.bin}/bin/ldd"}
          '';
        };
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [ bun git jdk nodejs gh python3 ripgrep ];
          shellHook = ''
            # Keep downloaded browser and Firebase artifacts stable across
            # separate `nix develop --command` invocations in CI.
            export XDG_CACHE_HOME="$PWD/.firebase/cache"
          '';
        };
      });
}
