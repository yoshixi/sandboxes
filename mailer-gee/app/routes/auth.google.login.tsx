import { redirect } from "@remix-run/cloudflare";
import type { ActionFunction, LoaderFunction } from "@remix-run/cloudflare";
import authenticator from "../services/auth/auth.server";
import { GoogleStrategyName } from "../services/auth/google-strategy.server";

// 直接/google/loginにブラウザでアクセスした場合、`/login`にリダイレクトする
export let loader: LoaderFunction = () => redirect("/auth/login");

export let action: ActionFunction = ({ request }) => {
  return authenticator.authenticate(GoogleStrategyName, request);
};
