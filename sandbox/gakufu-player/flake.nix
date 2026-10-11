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
              pkgs.ffmpeg
              pkgs.cacert
              pkgs.pkg-config
            ];

            env = {
              SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
              REQUESTS_CA_BUNDLE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
              LD_LIBRARY_PATH = libraryPath;
            };

            shellHook = ''
              if [ ! -f gakufu/__init__.py ]; then
                echo "Run nix develop from sandbox/gakufu-player."
                return
              fi

              venv="$PWD/.venv"
              if [ ! -x "$venv/bin/python" ]; then
                ${python}/bin/python3 -m venv "$venv"
              fi
              # The venv is created from Nix's Python, so it stays on PATH after this.
              . "$venv/bin/activate"

              stamp="$venv/.requirements.stamp"
              if [ ! -f "$stamp" ] || ! cmp -s requirements.txt "$stamp"; then
                python -m pip install -U pip
                python -m pip install -r requirements.txt
                # oemer depends on the CUDA build, which overwrites the CPU runtime.
                python -m pip uninstall -y onnxruntime-gpu || true
                python -m pip install --force-reinstall 'onnxruntime==1.27.0'
                cp requirements.txt "$stamp"
              fi

              echo "gakufu environment ready."
              echo "  python -m gakufu serve"
              echo "  pytest"
            '';
          };
        }
      );
    };
}
