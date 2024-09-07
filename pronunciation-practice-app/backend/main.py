from fastapi import FastAPI
from pathlib import Path
from openai import OpenAI

client = OpenAI()
print(client)
app = FastAPI()

print(Path.cwd())


@app.get("/")
def index():
    return {"Hello": "World"}


@app.get("/users/{user_id}")
def read_item(user_id: int):
    return {"user_id": user_id}


@app.get("/run")
def run():
    audio_path = Path.cwd() / "testdata/test.mp3"
    transcription = transcribe_audio(audio_path)
    return {"transcription": transcription}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9090)
