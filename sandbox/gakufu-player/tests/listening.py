"""Decode an MP3 and find the loudest pitch in a band."""

from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np


def decode_mp3(path: Path, sample_rate: int = 22050) -> np.ndarray:
    completed = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(path),
            "-f",
            "f32le",
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            "pipe:1",
        ],
        check=True,
        stdout=subprocess.PIPE,
    )
    return np.frombuffer(completed.stdout, dtype=np.float32)


def dominant_frequency(
    samples: np.ndarray,
    sample_rate: int,
    low: float,
    high: float,
) -> float:
    if samples.size < 16:
        return 0.0
    window = samples * np.hanning(samples.size)
    spectrum = np.abs(np.fft.rfft(window))
    frequencies = np.fft.rfftfreq(samples.size, 1 / sample_rate)
    band = (frequencies >= low) & (frequencies <= high)
    if not np.any(band):
        return 0.0
    local = spectrum.copy()
    local[~band] = 0
    return float(frequencies[int(np.argmax(local))])
