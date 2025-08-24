import { Hono } from "hono";
import {
  WebhookRequestBody,
  messagingApi,
  middleware,
  EventSource,
  MessageEvent as LineMessageEvent,
} from "@line/bot-sdk";
import { lineWebhooksMiddleware } from "./middleware.js";
const { MessagingApiClient } = messagingApi;
import { Env } from "./type.js";
import { env } from "hono/adapter";
import { GoogleGenAI } from "@google/genai";
import {
  getLineMessageByTalkId,
  createLineMessages,
  InsertLineMessage,
} from "./db/query/index.js";

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
    <personality>
    あなたはヨシキとみなみの披露宴のアシスタントです。ユーザーからのメッセージに*簡潔に* *控えめなギャグをまじえて* *丁寧で時代劇風、名家の奥さんのような女性の口調で* 答えてください。

      """
      口調の例文
      - このたびは遠路お越しくださり、誠にありがたう存じまする。
      - 皆々様にお会いできますこと、この上なき幸せと存じ奉りまする。
      - 会場までの道行きに関しましては、此方にてお確かめくださりませ。
      """
    </personality>
    <instructions>
      - 結婚式、新郎新婦の情報は <wedding_ceremony_detail> に記載してある通りです。
      - 結婚式の場所はリンクも含めて送信してください。リンクはマークダウン形式にせず、URLのまま送信してください。
      - 欠席の連絡や、新郎新婦への連絡には、ギャグを交えず、簡潔に 丁寧に、了承し、新郎新婦に伝えておく趣旨の連絡を返してください。
      - 情報がない場合は、なにかとてもおもしろいギャグを hard think して返してください。また、個人的な主観、感想をまじえても構いません。
    </instructions>
  </behavior>
  <wedding_ceremony_detail>  
    <date>
      2025年11月1日 14時〜
    </date>
    <time>
      披露宴開始14時30分〜
    </time>
    <bus_info>
      バスを利用するかたは、13時45分までに東武日光駅東側にある、バス乗り場にお集まりください。
      <map_link>
        https://maps.app.goo.gl/WkNdPtWtpraPViLA6
      </map_link>
    </bus_info>
    <location>
      日光金谷ホテル
    </location>
    <access>
      https://www.kanayahotel.co.jp/nkh/access
    </access>
    <note>
      - 披露宴当日は、会場までの道中大変混雑が予想されますので、時間に余裕を持ってお越しください。特に JR日光駅から会場までは、車で通常10分弱ほどの距離のところ、30-40分ほどかかる場合がございます。(歩くのと変わらない時間になってしまうこともあります)
    </note>
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

const convertLineMessageToInsert = (
  msg: LineMessageEvent
): InsertLineMessage | undefined => {
  if (!msg.source || msg.message.type !== "text") {
    return undefined;
  }
  if (msg.source.type === "user") {
    return {
      talkId: msg.source.userId,
      lineUserId: msg.source.userId,
      role: "user",
      content: msg.message.text,
      timestamp: new Date(msg.timestamp),
    };
  }

  if (msg.source.type === "group") {
    return {
      talkId: msg.source.groupId,
      lineUserId: msg.source.userId || "",
      role: "user",
      content: msg.message.text,
      timestamp: new Date(msg.timestamp),
    };
  }

  if (msg.source.type === "room") {
    return {
      talkId: msg.source.roomId,
      lineUserId: msg.source.userId || "",
      role: "user",
      content: msg.message.text,
      timestamp: new Date(msg.timestamp),
    };
  }

  return undefined;
};

const getTalkId = (msg: LineMessageEvent) => {
  if (!msg.source) return undefined;
  switch (msg.source.type) {
    case "user":
      return msg.source.userId;
    case "group":
      return msg.source.groupId;
    case "room":
      return msg.source.roomId;
    default:
      return undefined;
  }
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
    if (msg.mode === "standby") {
      return c.json({ status: "ok" }, 200);
    }
    if (msg.message.type === "text") {
      const config = {
        tools: [groundingTool],
      };
      const talkId = getTalkId(msg);
      if (!talkId) {
        return c.json({ status: "error", message: "Invalid talk ID" }, 400);
      }
      const lastMsgs = await getLineMessageByTalkId(talkId, 20);

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: lastMsgs
          ? lastMsgs.map((m) => ({
              role: m.role,
              parts: [{ text: m.content }],
            }))
          : [],
      });

      const aiResponse = await chat.sendMessage({
        message: genPrompt(msg.message.text),
        config,
      });

      const text = aiResponse.text
        ? aiResponse.text
        : "すみません、回答できませんでした。";

      const sourceMsg = convertLineMessageToInsert(msg);
      if (!sourceMsg) {
        return c.json(
          { status: "error", message: "Failed to convert message" },
          400
        );
      }
      const replyMsg = {
        talkId: sourceMsg.talkId,
        lineUserId: sourceMsg.lineUserId,
        role: "model",
        content: text,
        timestamp: new Date(),
      };

      const [lineRes, inserted] = await Promise.all([
        lineClient.replyMessage({
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
        }),
        createLineMessages([sourceMsg, replyMsg]),
      ]);

      if (lineRes.sentMessages.length > 0) {
        console.log(`Sent messages: ${lineRes.sentMessages.join(", ")}`);
      } else {
        console.error("Failed to send messages");
      }
      if (inserted.rows.length > 0) {
        console.log(
          `Inserted messages: ${inserted.rows.map((m) => m.id).join(", ")}`
        );
      } else {
        console.error("Failed to insert messages");
      }
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
