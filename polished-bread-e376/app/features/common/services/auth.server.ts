import type { AppLoadContext } from "@remix-run/cloudflare";
import {
  createCookie,
  createWorkersKVSessionStorage,
} from "@remix-run/cloudflare";

import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { users } from "db/schema";
import { InferInsertModel, eq } from "drizzle-orm";
import { createClient } from "~/features/common/services/db.server";

export type AuthUser = {
  id: number;
  googleProfileId: string;
  iconUrl: string;
  displayName: string;
};

type CreateUser = InferInsertModel<typeof users>;

let _authenticator: Authenticator<AuthUser> | undefined;
export function getAuthenticator(
  context: AppLoadContext
): Authenticator<AuthUser> {
  if (_authenticator == null) {
    const env = context.env as Env;
    console.log("context");
    console.log(context);
    console.log("env");
    console.log(env);
    const cookie = createCookie("__session", {
      secrets: [env.SESSION_SECRET],
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV == "production",
    });

    const sessionStorage = createWorkersKVSessionStorage({
      kv: env.SESSION_KV as KVNamespace,
      cookie,
    });
    _authenticator = new Authenticator<AuthUser>(sessionStorage);
    const googleAuth = new GoogleStrategy(
      {
        clientID: env.GOOGLE_AUTH_CLIENT_ID,
        clientSecret: env.GOOGLE_AUTH_CLIENT_SECRET,
        callbackURL: env.GOOGLE_AUTH_CALLBACK_URL,
      },
      async ({ profile }) => {
        console.log("create client");
        const db = createClient(env.DB);
        console.log("getting user")
        console.log(db)
        const user = await db
          .select()
          .from(users)
          .where(eq(users.profileId, profile.id))
          .get();
        if (user)
          return {
            id: user.id,
            googleProfileId: user.profileId,
            iconUrl: user.iconUrl,
            displayName: user.displayName,
          } as AuthUser;

        const newUser: CreateUser = {
          profileId: profile.id,
          iconUrl: profile.photos?.[0].value,
          displayName: profile.displayName,
          createdAt: new Date(),
        };

        console.log("inserting user");
        const ret = await db.insert(users).values(newUser).returning().get();

        return {
          id: ret.id,
          googleProfileId: profile.id,
          iconUrl: profile.photos?.[0].value,
          displayName: profile.displayName,
        } as AuthUser;
      }
    );
    _authenticator.use(googleAuth);
  }
  return _authenticator;
}
