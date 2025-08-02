import { Hono } from "hono";
import { WebhookRequestBody, messagingApi, middleware } from "@line/bot-sdk";
import { lineWebhooksMiddleware } from "./middleware.js";
const { MessagingApiClient } = messagingApi;
import { Env } from "./type.js";
import { env } from "hono/adapter";
import { GoogleGenAI } from "@google/genai";

const app = new Hono();
const ai = new GoogleGenAI({});

const welcomeStrings = [
  "Hello Hono!",
  "To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/hono",
];

app.get("/", (c) => {
  return c.text(welcomeStrings.join("\n\n"));
});

const genPrompt = (prompt: string) => {
  return `あなたはヨシキとみなみの披露宴のアシスタントです。以下のユーザーからのメッセージに*簡潔に*答えてください。
  このメッセージに答えるための情報を以下に羅列します。情報がない場合は、なにかギャグを返してください。
  - 披露宴の日時: 2025年11月1日 14時〜。当日の日光は混雑することが予想されるので早めに日光までに到着してください。
  - 披露宴の場所: 日光金谷ホテル。リンクも忘れずに送信してください。https://www.kanayahotel.co.jp/nkh/access
  - みなみのすきなこと: 寝ることと食べること

  メッセージ: ${prompt}`;
};

app.post("/line/webhooks", lineWebhooksMiddleware(), async (c) => {
  const { CHANNEL_ACCESS_TOKEN } = env<Env>(c);

  const body = await c.req.json<WebhookRequestBody>();

  if (body.events.length === 0) {
    return c.json({ status: "ok" }, 200);
  }

  const lineClient = new MessagingApiClient({
    channelAccessToken: CHANNEL_ACCESS_TOKEN,
  });

  const messages = body.events.filter((event) => event.type === "message");
  const availableEmojiIds = [
    "002",
    "018",
    "021",
    "035",
    "048",
    "064",
    "111",
    "112",
    "113",
    "117",
    "134",
    "136",
  ];
  const ind: number = Math.floor(Math.random() * availableEmojiIds.length);
  for (const msg of messages) {
    if (msg.message.type === "text") {
      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: genPrompt(msg.message.text),
      });
      const text = aiResponse.text
        ? aiResponse.text
        : "すみません、回答できませんでした。";
      await lineClient.replyMessage({
        replyToken: msg.replyToken,
        messages: [
          {
            type: "text",
            text: `${text}$`,
            emojis: [
              {
                index: text.length,
                productId: "670e0cce840a8236ddd4ee4c",
                emojiId: availableEmojiIds[ind],
              },
            ],
          },
        ],
      });
    } else {
      // await lineClient.replyMessage({
      //   replyToken: msg.replyToken,
      //   messages: [
      //     {
      //       type: "text",
      //       text: `Hello from Line Webhooks! ${msg.message.type}`,
      //     },
      //   ],
      // });
    }
  }

  return c.json({ status: "ok" }, 200);
});

export default app;
