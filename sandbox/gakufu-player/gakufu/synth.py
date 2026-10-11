"""Play note events with a small piano-like synth and encode an MP3."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import numpy as np

from gakufu.errors import ScoreReadError
from gakufu.score import NoteEvent

SAMPLE_RATE = 22050
_PARTIALS = (1.0, 0.52, 0.26, 0.14, 0.07, 0.04, 0.02)


def synthesize(notes: list[NoteEvent], destination: Path, sample_rate: int = SAMPLE_RATE) -> None:
    if not notes:
        raise ScoreReadError("No notes to play.")
    if shutil.which("ffmpeg") is None:
        raise ScoreReadError("ffmpeg is required to write MP3 files.")

    tail = 0.7
    end = max(note.start + note.duration for note in notes) + tail
    buffer = np.zeros(int(end * sample_rate) + 1, dtype=np.float64)
    for note in notes:
        _mix(buffer, note, sample_rate)

    peak = float(np.max(np.abs(buffer)))
    if peak <= 0:
        raise ScoreReadError("The synthesized audio was silent.")
    buffer *= 0.9 / peak
    pcm = (np.clip(buffer, -1.0, 1.0) * 32767.0).astype(np.int16)

    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-f",
                "s16le",
                "-ar",
                str(sample_rate),
                "-ac",
                "1",
                "-i",
                "pipe:0",
                "-codec:a",
                "libmp3lame",
                "-qscale:a",
                "4",
                str(destination),
            ],
            input=pcm.tobytes(),
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise ScoreReadError("ffmpeg could not encode the MP3.") from exc


def _mix(buffer: np.ndarray, note: NoteEvent, sample_rate: int) -> None:
    frequency = 440.0 * 2.0 ** ((note.midi - 69) / 12.0)
    sounding = max(note.duration, 0.08)
    release = min(0.45, max(0.12, sounding * 0.35))
    count = int((sounding + release) * sample_rate)
    start = int(max(note.start, 0.0) * sample_rate)
    if count < 2 or start >= len(buffer):
        return
    count = min(count, len(buffer) - start)

    time = np.arange(count) / sample_rate
    wave = np.zeros(count, dtype=np.float64)
    for index, amplitude in enumerate(_PARTIALS, start=1):
        stretched = frequency * index * (1.0 + 0.00035 * index * index)
        wave += amplitude * np.sin(2.0 * np.pi * stretched * time)

    envelope = np.ones(count, dtype=np.float64)
    attack = min(int(0.01 * sample_rate), count // 4)
    if attack > 0:
        envelope[:attack] = np.linspace(0.0, 1.0, attack, endpoint=False)
    decay_count = min(int(sounding * sample_rate), count)
    tau = max(sounding * 0.6, 0.12)
    envelope[:decay_count] *= np.exp(-np.arange(decay_count) / sample_rate / tau)
    if decay_count < count:
        start_level = float(envelope[decay_count - 1]) if decay_count else 1.0
        envelope[decay_count:] = np.linspace(start_level, 0.0, count - decay_count)
    buffer[start : start + count] += wave * envelope * 0.2
