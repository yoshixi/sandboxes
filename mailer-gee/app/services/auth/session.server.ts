import { createCookieSessionStorage } from "@remix-run/cloudflare";

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    cookie: {
      name: "remix-google-auth-sampl",

      // 以下はOptional
      httpOnly: true,
      maxAge: 600,
      path: "/",
      sameSite: "lax",
      secrets: ["s3cr3t"], // 今回は簡略のため直書き
      secure: process.env.NODE_ENV === "production", // localhostで動かす際にはsecure=falseでないと失敗する
    },
  });

export { getSession, commitSession, destroySession };
