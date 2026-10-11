# 楽譜 → MP3

A small sandbox app that looks at sheet music and writes an MP3 of what it reads.

- A **photo, scan, or PDF** of printed five-line staff notation is read with [oemer](https://github.com/BreezeWhite/oemer) and turned into notes.
- **MusicXML** and **MIDI** are played directly.
- Notes are synthesized with a built-in piano sound and encoded to MP3 with ffmpeg.

Handwritten scores, guitar tabs, and chord charts are outside what the reader was trained on.

## Run with Nix

From this directory:

```bash
cd sandbox/gakufu-player
nix develop
```

Flakes need to be enabled once:

```bash
mkdir -p ~/.config/nix
echo 'experimental-features = nix-command flakes' >> ~/.config/nix/nix.conf
```

`nix develop` provides Python 3.12, ffmpeg, and CA certificates, then creates `.venv` and installs `requirements.txt`. The first entry downloads the Python packages. Later entries reuse `.venv` until `requirements.txt` changes.

Then:

```bash
python -m gakufu serve
pytest
```

## Run without Nix

```bash
cd sandbox/gakufu-player
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# oemer asks for the CUDA build. This app runs on CPU.
pip uninstall -y onnxruntime-gpu
pip install onnxruntime==1.27.0
python -m gakufu serve
```

Open http://127.0.0.1:8000. Drop a page of 楽譜, or press **Play さくらさくら** to hear the built-in sample.

The first photo also downloads about 110 MB of recognition models into the installed `oemer` package. One page often takes a few minutes on CPU. Tick **Straighten a tilted photo** only when the page is skewed. A very flat crop of a single system is placed on a blank page first, which is how the reader was trained. A photographed tempo mark is often missed, so type the BPM if you want it.

## Command line

```bash
python -m gakufu render samples/sakura.musicxml -o sakura.mp3
python -m gakufu render page.png -o page.mp3
python -m gakufu render tilted.jpg -o tilted.mp3 --deskew
python -m gakufu render page.png -o page.mp3 --bpm 96
```

## Tests

```bash
pytest
```
