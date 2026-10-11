{
  description = "Development shell for the 楽譜 → MP3 app";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEachSystem (system:
        let
          pkgs = import nixpkgs { inherit system; };
          python = pkgs.python312;
          libraryPath = pkgs.lib.makeLibraryPath [
            pkgs.stdenv.cc.cc.lib
            pkgs.zlib
            pkgs.glib
            pkgs.zstd
          ];
        in
        {
          default = pkgs.mkShell {
            packages = [
              python
              pkgs.uv
              pkgs.ffmpeg
              pkgs.cacert
              pkgs.diffutils
            ];

            env = {
              SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
              REQUESTS_CA_BUNDLE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
              UV_PYTHON_DOWNLOADS = "never";
              LD_LIBRARY_PATH = libraryPath;
            };

            # Nix's Python has no ensurepip, so `python -m venv` cannot install pip.
            # uv creates the virtualenv and installs the wheels itself.
            shellHook = ''
              if [ ! -f gakufu/__init__.py ]; then
                echo "Run nix develop from sandbox/gakufu-player." >&2
                return 1
              fi

              venv="$PWD/.venv"
              nix_python="${python}/bin/python3"

              if [ ! -x "$venv/bin/python" ] || [ ! -f "$venv/bin/activate" ]; then
                rm -rf "$venv"
                if ! uv venv --no-project --no-python-downloads --python "$nix_python" "$venv"; then
                  echo "Could not create .venv." >&2
                  return 1
                fi
              fi
              . "$venv/bin/activate"

              install_gakufu_deps() {
                uv pip install --python "$venv/bin/python" -r requirements.txt \
                  && { uv pip uninstall --python "$venv/bin/python" onnxruntime-gpu || true; } \
                  && uv pip install --python "$venv/bin/python" --reinstall-package onnxruntime 'onnxruntime==1.27.0' \
                  && cp requirements.txt "$venv/.requirements.stamp"
              }

              stamp="$venv/.requirements.stamp"
              if [ ! -f "$stamp" ] || ! cmp -s requirements.txt "$stamp"; then
                if ! install_gakufu_deps; then
                  echo "Installing Python packages failed. The shell is not ready." >&2
                  return 1
                fi
              fi

              if ! "$venv/bin/python" -c "import fastapi, cv2, onnxruntime" >/dev/null 2>&1; then
                echo "The virtualenv is missing packages. Installing them again."
                if ! install_gakufu_deps \
                  || ! "$venv/bin/python" -c "import fastapi, cv2, onnxruntime" >/dev/null 2>&1; then
                  echo "Installing Python packages failed. The shell is not ready." >&2
                  return 1
                fi
              fi

              unset -f install_gakufu_deps
              echo "gakufu environment ready."
              echo "  python -m gakufu serve"
              echo "  pytest"
            '';
          };
        }
      );
    };
}
