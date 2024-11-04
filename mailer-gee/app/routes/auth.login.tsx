import type { LoaderFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { Form } from "@remix-run/react";
import authenticator from "../services/auth/auth.server";

export const loader: LoaderFunction = async ({
  request,
}: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    // ログイン済みのユーザーはサクセスページにリダイレクト
    return redirect("/app");
  }
  return {};
};

export default function Login() {
  return (
    <Form action="/auth/google/login" method="post">
      <button>Login with Google</button>
    </Form>
  );
}
