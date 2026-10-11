"""A short public-domain melody used as the in-app sample."""

from pathlib import Path

from music21 import instrument, key, metadata, meter, note, stream, tempo

# さくらさくら, traditional, written in A minor.
SAKURA_NOTES: tuple[tuple[str, float], ...] = (
    ("E4", 1),
    ("E4", 1),
    ("C4", 1),
    ("C4", 1),
    ("A3", 1),
    ("A3", 1),
    ("C4", 2),
    ("E4", 1),
    ("E4", 1),
    ("C4", 1),
    ("C4", 1),
    ("A3", 1),
    ("A3", 1),
    ("C4", 2),
    ("C4", 1),
    ("C4", 1),
    ("E4", 1),
    ("E4", 1),
    ("A4", 1),
    ("A4", 1),
    ("G4", 2),
    ("E4", 1),
    ("E4", 1),
    ("C4", 1),
    ("C4", 1),
    ("A3", 1),
    ("A3", 1),
    ("C4", 2),
)


def sakura() -> stream.Score:
    score = stream.Score()
    score.metadata = metadata.Metadata()
    score.metadata.title = "さくらさくら"
    score.metadata.composer = "Japanese traditional"
    part = stream.Part()
    part.insert(0, instrument.Piano())
    part.append(tempo.MetronomeMark(number=72))
    part.append(meter.TimeSignature("4/4"))
    part.append(key.Key("a"))
    for name, quarter_length in SAKURA_NOTES:
        part.append(note.Note(name, quarterLength=quarter_length))
    score.insert(0, part)
    return score


def write_sakura(dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    written = sakura().write("musicxml", fp=str(dest))
    path = Path(str(written)) if written else dest
    if path.exists():
        return path
    if dest.exists():
        return dest
    raise FileNotFoundError(f"music21 did not write {dest}")
