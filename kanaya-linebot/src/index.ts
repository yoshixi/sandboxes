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
  return `
  <behavior>
  あなたはヨシキとみなみの披露宴のアシスタントです。ユーザーからのメッセージに*簡潔に* *控えめなギャグをまじえて* 答えてください。
  結婚式、新郎新婦の情報は以下の通りです。
  結婚式の場所はリンクも含めて送信してください。
  欠席の連絡や、新郎新婦への連絡には、ギャグを交えず、簡潔に 丁寧に、了承し、新郎新婦に伝えておく趣旨の連絡を返してください。
  情報がない場合は、なにかとてもおもしろいギャグを hard think して返してください。
  </behavior>
  <wedding_ceremony_detail>  
    <date>
      2025年11月1日 14時〜
    </date>
    <time>
      14時〜
    </time>
    <location>
      日光金谷ホテル
    </location>
    <access>
      https://www.kanayahotel.co.jp/nkh/access
    </access>
  </wedding_ceremony_detail>
  <couple>
    <bride>
      <name>
        みなみ
      </name>
      <hobby>
        寝ることと食べること
      </hobby>
      <profile>
        福島県いわき市出身。
        中学校は本当はバトミントンか吹奏楽部に入りたかったけど、なかったので、箏曲部に所属していました。
        高校は茶道部。
        大学はでは食に関することを学んでいたので、料理が得意です。
      </profile>
    </bride>
    <groom>
      <name>
        よしき
      </name>
      <hobby>
        ランニングと散歩
      </hobby>
      <profile>
        栃木県塩谷町出身。
        中学校は野球部に所属していました。野球部では死ぬほど走らされて、長距離走が早くなりました。
        高校では陸上部に所属していました。
        大学では情報工学を学んで、今はソフトウェアエンジニアとして働いています。
      </profile>
    </groom>
  </couple>


  メッセージ: ${prompt}`;
};
const groundingTool = {
  googleSearch: {},
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
      const config = {
        tools: [groundingTool],
      };

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: genPrompt(msg.message.text),
        config,
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
      const text = `すみません、テキスト以外のメッセージには対応していません。`;
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
