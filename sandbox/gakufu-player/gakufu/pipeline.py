"""Read an uploaded score and collect the notes that should be played."""

from __future__ import annotations

import logging
from pathlib import Path

from gakufu.errors import ScoreReadError
from gakufu.omr import prepare_image, recognize_image, render_pdf
from gakufu.score import NoteEvent, Performance, read_music_file

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}
SCORE_EXTENSIONS = {".musicxml", ".xml", ".mxl", ".mid", ".midi"}
PDF_EXTENSIONS = {".pdf"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | SCORE_EXTENSIONS | PDF_EXTENSIONS


def read_source(source: Path, work: Path, *, bpm: float | None, deskew: bool) -> Performance:
    work.mkdir(parents=True, exist_ok=True)
    suffix = source.suffix.lower()
    if suffix in SCORE_EXTENSIONS:
        performance = read_music_file(source, bpm, fallback_title=_display_title(source))
        performance.musicxml_path = source if suffix in {".musicxml", ".xml", ".mxl"} else None
        return performance
    if suffix == ".pdf":
        return _read_pdf(source, work, bpm=bpm, deskew=deskew)
    if suffix in IMAGE_EXTENSIONS:
        return _read_image(source, work, bpm=bpm, deskew=deskew)
    raise ScoreReadError("Use a PNG, JPG, WEBP, PDF, MusicXML, or MIDI file.")


def _read_image(source: Path, work: Path, *, bpm: float | None, deskew: bool) -> Performance:
    png = prepare_image(source, work / "page.png")
    musicxml = recognize_image(png, work, deskew=deskew)
    performance = read_music_file(musicxml, bpm, fallback_title=_display_title(source))
    performance.musicxml_path = musicxml
    return performance


def _read_pdf(source: Path, work: Path, *, bpm: float | None, deskew: bool) -> Performance:
    pages = render_pdf(source, work)
    notes: list[NoteEvent] = []
    warnings: list[str] = []
    title = _display_title(source)
    used_bpm = float(bpm) if bpm is not None else None
    musicxml_path: Path | None = None
    cursor = 0.0

    for index, page in enumerate(pages, start=1):
        try:
            musicxml = recognize_image(page, work / f"page-{index}", deskew=deskew)
            performance = read_music_file(musicxml, bpm, fallback_title=title)
        except ScoreReadError as exc:
            warnings.append(f"Page {index}: {exc}")
            logger.info("Skipping PDF page %s", index, exc_info=True)
            continue
        if used_bpm is None:
            used_bpm = performance.bpm
        elif abs(performance.bpm - used_bpm) > 1 and bpm is None:
            warnings.append(f"Page {index} uses {performance.bpm:.0f} BPM.")
        if musicxml_path is None:
            musicxml_path = musicxml
        notes.extend(event.shifted(cursor) for event in performance.notes)
        cursor += performance.duration + 0.8
        warnings.extend(performance.warnings)

    if not notes:
        detail = " ".join(warnings) if warnings else "No notes were found."
        raise ScoreReadError(detail)
    return Performance(
        title=title,
        bpm=used_bpm if used_bpm is not None else 120.0,
        notes=notes,
        warnings=warnings,
        musicxml_path=musicxml_path,
    )


def _display_title(path: Path) -> str:
    stem = path.stem.strip()
    return stem or "Sheet music"
