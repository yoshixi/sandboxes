from gakufu.repertoire import sakura
from gakufu.score import performance_from_score
from gakufu.synth import SAMPLE_RATE, synthesize

from tests.listening import decode_mp3, dominant_frequency


def test_first_sakura_note_is_e4(tmp_path):
    performance = performance_from_score(sakura(), bpm=None, fallback_title="さくらさくら")
    destination = tmp_path / "sakura.mp3"
    synthesize(performance.notes, destination)

    audio = decode_mp3(destination)
    assert audio.size > SAMPLE_RATE
    start = int(0.08 * SAMPLE_RATE)
    stop = int(0.45 * SAMPLE_RATE)
    heard = dominant_frequency(audio[start:stop], SAMPLE_RATE, 250, 450)
    assert abs(heard - 329.6) < 12
