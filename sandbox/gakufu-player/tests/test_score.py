from music21 import chord, note, stream, tempo

from gakufu.repertoire import SAKURA_NOTES, sakura
from gakufu.score import performance_from_score


def test_sakura_notes_and_tempo():
    performance = performance_from_score(sakura(), bpm=None, fallback_title="fallback")
    assert performance.title == "さくらさくら"
    assert performance.bpm == 72
    assert [event.name for event in performance.notes] == [name for name, _ in SAKURA_NOTES]
    assert abs(performance.duration - 32 * 60 / 72) < 0.05


def test_tempo_override_scales_the_piece():
    performance = performance_from_score(sakura(), bpm=144, fallback_title="fallback")
    assert performance.bpm == 144
    assert abs(performance.duration - 32 * 60 / 144) < 0.05


def test_rest_is_silent_and_chord_keeps_every_pitch():
    score = stream.Score()
    part = stream.Part()
    part.append(tempo.MetronomeMark(number=120))
    part.append(note.Note("C4", quarterLength=1))
    part.append(note.Rest(quarterLength=1))
    part.append(chord.Chord(["C4", "E4", "G4"], quarterLength=1))
    score.insert(0, part)

    performance = performance_from_score(score, bpm=None, fallback_title="chord")
    assert [event.name for event in performance.notes] == ["C4", "C4", "E4", "G4"]
    assert abs(performance.notes[1].start - 1.0) < 0.02
    assert abs(performance.notes[2].start - performance.notes[1].start) < 0.001


def test_two_parts_sound_together():
    score = stream.Score()
    lower = stream.Part()
    upper = stream.Part()
    lower.append(tempo.MetronomeMark(number=120))
    upper.append(tempo.MetronomeMark(number=120))
    lower.append(note.Note("C3", quarterLength=4))
    upper.append(note.Note("G4", quarterLength=1))
    score.insert(0, lower)
    score.insert(0, upper)

    performance = performance_from_score(score, bpm=None, fallback_title="duet")
    starts = {event.name: event.start for event in performance.notes}
    assert starts["C3"] == 0
    assert starts["G4"] == 0
