import type { ActionFunctionArgs } from "@remix-run/cloudflare"; // or cloudflare/deno
import { json } from "@remix-run/cloudflare";

export const action = async ({ request }: ActionFunctionArgs) => {
  switch (request.method) {
    case "POST": {
      return json({ message: "hello POST request" }, 200);
    }
    case "PUT": {
      return json({ message: "hello PUT request" }, 200);
    }
    case "PATCH": {
      return json({ message: "hello PATCH request" }, 200);
    }
    case "DELETE": {
      return json({ message: "hello DELETE request" }, 200);
    }
  }
};
