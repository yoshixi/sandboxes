"""Command line: read a score and write an MP3, or start the browser app."""

from __future__ import annotations

import argparse
import logging
import sys
import tempfile
from pathlib import Path

import uvicorn

from gakufu.errors import ScoreReadError
from gakufu.pipeline import read_source
from gakufu.synth import synthesize
from gakufu.web import app


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(
        prog="gakufu",
        description="Read sheet music and write an MP3.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="Open the browser app")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)

    render = sub.add_parser("render", help="Read a score file and write an MP3")
    render.add_argument("path", type=Path)
    render.add_argument("-o", "--output", type=Path, required=True)
    render.add_argument("--bpm", type=float, default=None)
    render.add_argument(
        "--deskew",
        action="store_true",
        help="Straighten a tilted photo before reading it",
    )

    args = parser.parse_args(argv)
    if args.command == "serve":
        uvicorn.run(app, host=args.host, port=args.port)
        return 0

    source = args.path.expanduser()
    if not source.is_file():
        print(f"File not found: {source}", file=sys.stderr)
        return 1
    if args.bpm is not None and not 20 <= args.bpm <= 300:
        print("Tempo must be between 20 and 300 BPM.", file=sys.stderr)
        return 1
    try:
        with tempfile.TemporaryDirectory(prefix="gakufu-") as temporary:
            performance = read_source(
                source,
                Path(temporary),
                bpm=args.bpm,
                deskew=args.deskew,
            )
            synthesize(performance.notes, args.output)
    except ScoreReadError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(
        f"Wrote {args.output} "
        f"({performance.duration:.1f}s, {len(performance.notes)} notes, {performance.bpm:.0f} BPM)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
