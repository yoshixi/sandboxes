import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { getAuthenticator } from "~/features/common/services/auth.server";

export const loader = () => redirect("/login");

export const action = ({ request, context }: ActionFunctionArgs) => {
  const authenticator = getAuthenticator(context);
  return authenticator.authenticate("google", request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};
