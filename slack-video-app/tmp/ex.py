from typing import Union
from fastapi import FastAPI, Request
from slack_bolt import App
from slack_bolt.adapter.fastapi import SlackRequestHandler
from dotenv import load_dotenv

load_dotenv()
app = App()
app_handler = SlackRequestHandler(app)



@app.event("app_mention")
def handle_app_mentions(body, say, logger):
    logger.info(body)
    say("What's up?")


@app.event("message")
def handle_message():
    pass



api = FastAPI()


@api.post("/slack/events")
async def endpoint(req: Request):
    return await app_handler.handle(req)


@api.get("/slack/install")
async def install(req: Request):
    return await app_handler.handle(req)


@api.get("/slack/oauth_redirect")
async def oauth_redirect(req: Request):
    return await app_handler.handle(req)



@api.get("/")
def read_root():
    return {"Hello": "World"}


@api.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}