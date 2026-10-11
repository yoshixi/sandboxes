from fastapi.testclient import TestClient

from gakufu.repertoire import SAKURA_NOTES, write_sakura
from gakufu.synth import SAMPLE_RATE
from gakufu.web import app

from tests.listening import decode_mp3, dominant_frequency

client = TestClient(app)


def test_sample_plays_sakura(tmp_path):
    response = client.post("/api/sample")
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "さくらさくら"
    assert body["noteCount"] == len(SAKURA_NOTES)
    assert [note["name"] for note in body["notes"]] == [name for name, _ in SAKURA_NOTES]
    assert abs(body["duration"] - 32 * 60 / 72) < 0.05

    audio = client.get(body["audioUrl"])
    assert audio.status_code == 200
    assert audio.headers["content-type"].startswith("audio/mpeg")
    mp3 = tmp_path / "sample.mp3"
    mp3.write_bytes(audio.content)
    samples = decode_mp3(mp3)
    heard = dominant_frequency(samples[int(0.08 * SAMPLE_RATE) : int(0.45 * SAMPLE_RATE)], SAMPLE_RATE, 250, 450)
    assert abs(heard - 329.6) < 12


def test_upload_musicxml_and_reject_plain_text(tmp_path):
    score = write_sakura(tmp_path / "sakura.musicxml")
    uploaded = client.post(
        "/api/transcribe",
        files={"file": (score.name, score.read_bytes(), "application/vnd.recordare.musicxml+xml")},
        data={"bpm": "144"},
    )
    assert uploaded.status_code == 200
    body = uploaded.json()
    assert body["bpm"] == 144
    assert abs(body["duration"] - 32 * 60 / 144) < 0.05
    assert client.get(body["audioUrl"]).status_code == 200

    rejected = client.post(
        "/api/transcribe",
        files={"file": ("notes.txt", b"not music", "text/plain")},
    )
    assert rejected.status_code == 400


def test_tempo_must_be_in_range():
    response = client.post("/api/sample", data={"bpm": "10"})
    assert response.status_code == 400
