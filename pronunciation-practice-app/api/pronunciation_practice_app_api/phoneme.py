from phonemizer.backend.espeak.wrapper import EspeakWrapper

_ESPEAK_LIBRARY = "/opt/homebrew/Cellar/espeak/1.48.04_1/lib/libespeak.1.1.48.dylib"
EspeakWrapper.set_library(_ESPEAK_LIBRARY)
from phonemizer import phonemize

import difflib


def transcribe_audio(client, audio_path):
    transcription = client.audio.transcriptions.create(model="whisper-1", file=audio_path, language="en")

    return transcription.text


def text_to_phonemes(text):
    phonemes = phonemize(text, language="en-us", backend="espeak", strip=True)
    return phonemes
