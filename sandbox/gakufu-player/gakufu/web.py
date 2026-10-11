"""Browser app: upload 楽譜, play the MP3 it reads."""

from __future__ import annotations

import asyncio
import logging
import re
import shutil
import tempfile
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from gakufu import __version__
from gakufu.errors import ScoreReadError
from gakufu.pipeline import ALLOWED_EXTENSIONS, read_source
from gakufu.repertoire import sakura
from gakufu.score import Performance
from gakufu.synth import synthesize

logger = logging.getLogger(__name__)

MAX_BYTES = 20 * 1024 * 1024
JOB_TTL_SECONDS = 6 * 60 * 60
_JOB_ID = re.compile(r"[0-9a-f]{32}")
_TEMPLATE = Path(__file__).parent / "templates" / "index.html"
MEDIA = Path(tempfile.gettempdir()) / "gakufu-player"
MEDIA.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="楽譜 → MP3", version=__version__)


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    return _TEMPLATE.read_text(encoding="utf-8")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/sample")
async def sample(bpm: str | None = Form(None)) -> dict:
    chosen = _parse_bpm(bpm)

    def work() -> dict:
        job = _new_job()
        performance = _performance_from_sakura(chosen)
        return _materialize(performance, job)

    return await asyncio.to_thread(work)


@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    bpm: str | None = Form(None),
    deskew: str | None = Form(None),
) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The file is empty.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 20 MB.")
    filename = file.filename or "score"
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Use a PNG, JPG, WEBP, PDF, MusicXML, or MIDI file.",
        )
    chosen = _parse_bpm(bpm)
    straighten = _parse_deskew(deskew)

    def work() -> dict:
        job = _new_job()
        source = job / f"upload{suffix}"
        source.write_bytes(raw)
        try:
            performance = read_source(source, job / "work", bpm=chosen, deskew=straighten)
        except ScoreReadError as exc:
            shutil.rmtree(job, ignore_errors=True)
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if performance.title.lower() in {"upload", "page"}:
            performance.title = Path(filename).stem or performance.title
        return _materialize(performance, job)

    return await asyncio.to_thread(work)


@app.get("/media/{job_id}/music.mp3")
def audio(job_id: str) -> FileResponse:
    path = _job_file(job_id, "music.mp3")
    return FileResponse(path, media_type="audio/mpeg", filename="gakufu.mp3")


@app.get("/media/{job_id}/score.musicxml")
def musicxml(job_id: str) -> FileResponse:
    path = _job_file(job_id, "score.musicxml")
    return FileResponse(path, media_type="application/vnd.recordare.musicxml+xml", filename="score.musicxml")


def _performance_from_sakura(bpm: float | None) -> Performance:
    from gakufu.score import performance_from_score

    return performance_from_score(sakura(), bpm=bpm, fallback_title="さくらさくら")


def _materialize(performance: Performance, job: Path) -> dict:
    _sweep()
    destination = job / "music.mp3"
    try:
        synthesize(performance.notes, destination)
    except ScoreReadError as exc:
        shutil.rmtree(job, ignore_errors=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    musicxml_url = None
    if performance.musicxml_path and performance.musicxml_path.is_file():
        shutil.copyfile(performance.musicxml_path, job / "score.musicxml")
        musicxml_url = f"/media/{job.name}/score.musicxml"

    return {
        "title": performance.title,
        "bpm": round(performance.bpm, 2),
        "duration": round(performance.duration, 3),
        "noteCount": len(performance.notes),
        "notes": [
            {
                "name": event.name,
                "midi": event.midi,
                "start": round(event.start, 4),
                "duration": round(event.duration, 4),
            }
            for event in performance.notes[:5000]
        ],
        "warnings": performance.warnings,
        "audioUrl": f"/media/{job.name}/music.mp3",
        "musicxmlUrl": musicxml_url,
        "downloadName": _download_name(performance.title),
    }


def _parse_bpm(raw: str | None) -> float | None:
    if raw is None or not raw.strip():
        return None
    try:
        value = float(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Tempo must be a number.") from exc
    if not 20 <= value <= 300:
        raise HTTPException(status_code=400, detail="Tempo must be between 20 and 300 BPM.")
    return value


def _parse_deskew(raw: str | None) -> bool:
    return raw is not None and raw.lower() in {"1", "true", "on", "yes"}


def _new_job() -> Path:
    job = MEDIA / uuid.uuid4().hex
    job.mkdir(parents=True, exist_ok=False)
    return job


def _job_file(job_id: str, name: str) -> Path:
    if _JOB_ID.fullmatch(job_id) is None:
        raise HTTPException(status_code=404, detail="That recording is gone.")
    path = MEDIA / job_id / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That recording is gone.")
    return path


def _download_name(title: str) -> str:
    cleaned = re.sub(r"[^\w\u3040-\u30ff\u4e00-\u9fff.-]+", "-", title, flags=re.UNICODE).strip("-.")
    return f"{(cleaned or 'gakufu')[:80]}.mp3"


def _sweep() -> None:
    cutoff = time.time() - JOB_TTL_SECONDS
    for child in MEDIA.iterdir():
        if child.is_dir() and child.stat().st_mtime < cutoff:
            shutil.rmtree(child, ignore_errors=True)
