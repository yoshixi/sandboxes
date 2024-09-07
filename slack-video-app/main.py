import logging

logging.basicConfig(level=logging.DEBUG)

import os
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.fastapi.async_handler import AsyncSlackRequestHandler
from slack_bolt.adapter.socket_mode.aiohttp import AsyncSocketModeHandler
from dotenv import load_dotenv

load_dotenv()


slack_app = AsyncApp()
app_handler = AsyncSlackRequestHandler(slack_app)
socket_handler = AsyncSocketModeHandler(slack_app, os.environ["SLACK_APP_TOKEN"])


@slack_app.event("app_mention")
async def handle_app_mentions(body, say, logger):
    logger.info(body)
    await say("What's up?")


@slack_app.event("message")
async def handle_message():
    pass


from fastapi import FastAPI, Request

api = FastAPI()


@api.post("/slack/events")
async def endpoint(req: Request):
    return await app_handler.handle(req)

@api.on_event("startup")
async def startup():

    # this is not ideal for # of workers > 1.
    await socket_handler.connect_async()