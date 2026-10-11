"""Turn a MusicXML or MIDI file into timed note events."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from music21 import chord, converter, note, stream, tempo

from gakufu.errors import ScoreReadError

logger = logging.getLogger(__name__)

PLAYBACK_LIMIT_SECONDS = 8 * 60
_GENERIC_TITLES = {"page", "sheet", "score", "music"}


@dataclass(frozen=True)
class NoteEvent:
    name: str
    midi: int
    start: float
    duration: float

    def shifted(self, seconds: float) -> NoteEvent:
        return NoteEvent(self.name, self.midi, self.start + seconds, self.duration)


@dataclass
class Performance:
    title: str
    bpm: float
    notes: list[NoteEvent]
    warnings: list[str]
    musicxml_path: Path | None = None

    @property
    def duration(self) -> float:
        if not self.notes:
            return 0.0
        return max(event.start + event.duration for event in self.notes)


def read_music_file(path: Path, bpm: float | None, fallback_title: str | None = None) -> Performance:
    try:
        parsed = converter.parse(str(path))
    except Exception as exc:
        raise ScoreReadError(f"Could not parse this score file: {exc}") from exc
    return performance_from_score(
        parsed,
        bpm=bpm,
        fallback_title=fallback_title or path.stem,
        musicxml_path=path if path.suffix.lower() in {".musicxml", ".xml", ".mxl"} else None,
    )


def performance_from_score(
    parsed: stream.Stream,
    *,
    bpm: float | None,
    fallback_title: str,
    musicxml_path: Path | None = None,
) -> Performance:
    title = _title_of(parsed, fallback_title)
    chosen_bpm = float(bpm) if bpm is not None else detect_bpm(parsed)
    prepared = _prepare(parsed, chosen_bpm)
    notes = _notes_from(prepared)
    warnings: list[str] = []
    if notes and max(event.start + event.duration for event in notes) > PLAYBACK_LIMIT_SECONDS:
        notes = [event for event in notes if event.start < PLAYBACK_LIMIT_SECONDS]
        warnings.append("Playback is limited to the first 8 minutes.")
    if not notes:
        raise ScoreReadError("No notes were found in this score.")
    return Performance(
        title=title,
        bpm=chosen_bpm,
        notes=notes,
        warnings=warnings,
        musicxml_path=musicxml_path,
    )


def detect_bpm(parsed: stream.Stream) -> float:
    for mark in parsed.recurse().getElementsByClass(tempo.MetronomeMark):
        if mark.number:
            return float(mark.number)
    return 120.0


def _prepare(parsed: stream.Stream, bpm: float) -> stream.Stream:
    working = parsed
    try:
        working = working.expandRepeats()
    except Exception:
        logger.info("Repeats were left as written", exc_info=True)
    try:
        working = working.stripTies()
    except Exception:
        logger.info("Ties were left as written", exc_info=True)
    _apply_bpm(working, bpm)
    return working


def _apply_bpm(parsed: stream.Stream, bpm: float) -> None:
    for mark in list(parsed.recurse().getElementsByClass(tempo.MetronomeMark)):
        site = mark.activeSite
        if site is None:
            continue
        try:
            site.remove(mark)
        except Exception:
            logger.debug("Could not remove an existing tempo mark", exc_info=True)
    parts = list(getattr(parsed, "parts", []))
    if parts:
        for part in parts:
            part.insert(0, tempo.MetronomeMark(number=float(bpm)))
        return
    parsed.insert(0, tempo.MetronomeMark(number=float(bpm)))


def _notes_from(parsed: stream.Stream) -> list[NoteEvent]:
    events: list[NoteEvent] = []
    for item in parsed.flatten().secondsMap:
        element = item["element"]
        start = float(item["offsetSeconds"])
        duration = float(item["durationSeconds"])
        if duration < 0.02:
            continue
        if isinstance(element, chord.Chord):
            pitches = list(element.pitches)
        elif isinstance(element, note.Note):
            pitches = [element.pitch]
        else:
            continue
        seen: set[int] = set()
        for pitch in pitches:
            midi = int(pitch.midi)
            if midi in seen or not 0 <= midi <= 127:
                continue
            seen.add(midi)
            events.append(NoteEvent(pitch.nameWithOctave, midi, start, duration))
    events.sort(key=lambda event: (event.start, event.midi))
    return events


def _title_of(parsed: stream.Stream, fallback: str) -> str:
    raw = ""
    if getattr(parsed, "metadata", None) is not None and parsed.metadata.title:
        raw = str(parsed.metadata.title).strip()
    lowered = raw.lower()
    if not raw or lowered in _GENERIC_TITLES or lowered.startswith("page-"):
        raw = fallback.strip()
    return raw or "Sheet music"
