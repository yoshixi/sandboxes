import uuid
from pathlib import Path

import structlog
from fastapi import FastAPI, Request, Response, HTTPException
from openai import OpenAI

from pronunciation_practice_app_api.phoneme import transcribe_audio, text_to_phonemes, compare_texts


client = OpenAI()
print(client)
print(Path.cwd())
app = FastAPI()
logger = structlog.get_logger()


@app.middleware("http")
async def logger_middleware(request: Request, call_next):
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        path=request.url.path,
        method=request.method,
        client_host=request.client.host,
        request_id=str(uuid.uuid4()),
    )
    response = await call_next(request)

    structlog.contextvars.bind_contextvars(
        status_code=response.status_code,
    )

    # Exclude /healthcheck endpoint from producing logs
    if request.url.path != "/healthcheck":
        if 400 <= response.status_code < 500:
            logger.warn("Client error")
        elif response.status_code >= 500:
            logger.error("Server error")
        else:
            logger.info("OK")

    return response


@app.get("/healthcheck")
async def healthcheck():
    return Response()


@app.get("/")
async def read_main():
    logger.info("In root path")
    return {"msg": "Hello World"}


@app.get("/transcribe")
async def transcribe():
    test_audio_path = (
        "/Users/yoshikimasubuchi/.ghq/github.com/yoshixi/sandboxes/pronunciation-practice-app/api/testdata/test.mp3"
    )

    logger.info("Opening file", file_path=str(test_audio_path))
    try:
        file = open(test_audio_path, "rb")
        logger.info("File opened", file=file)
        transcription = transcribe_audio(client, file)
        original_setence = "This week has been full-on busy with work, and with tasks constantly being added, I've really had to stay on my toes. By the way, what's the deal with her lately? She seems down all the time. I actually saw her sneaking some snacks, but I wonder if that's related?"

        original_phonemes = text_to_phonemes(original_setence)
        transcribed_phonemes = text_to_phonemes(transcription)
    except IOError as e:
        logger.error("Error opening file", error=str(e), file_path=str(test_audio_path))
        raise HTTPException(status_code=500, detail="Error opening audio file")
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail="Error transcribing audio")

    return {"original_phonemes": original_phonemes, "transcribed_phonemes": transcribed_phonemes}
