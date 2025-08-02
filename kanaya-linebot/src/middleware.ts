// line-middleware.ts
import type { MiddlewareHandler } from "hono";
import type { MiddlewareConfig } from "@line/bot-sdk"; // whatever exports Types.MiddlewareConfig
import {
  JSONParseError,
  SignatureValidationFailed,
  validateSignature,
} from "@line/bot-sdk"; // keep your existing helpers
import { Env } from "./type.js";
import { env } from "hono/adapter";

export function lineWebhooksMiddleware(): MiddlewareHandler {
  // Hono middleware ---------------------------------------------------------
  return async (c, next) => {
    // Headers are case-insensitive; Hono preserves the original casing.
    const signature = c.req.header("x-line-signature") ?? undefined;

    const { CHANNEL_SECRET } = env<Env>(c);

    if (!signature) {
      /* You can change the status code / body shape to match your project’s conventions. */
      return c.json(new SignatureValidationFailed("no signature"), 400);
    }

    const body = await c.req.text();

    // ----------------------------------------------------------------------
    // ❷  Signature verification
    // ----------------------------------------------------------------------
    if (!validateSignature(body, CHANNEL_SECRET, signature)) {
      return c.json(
        new SignatureValidationFailed("signature validation failed", {
          signature,
        }),
        400,
      );
    }

    // ----------------------------------------------------------------------
    // ❸  JSON parse & hand-off
    // ----------------------------------------------------------------------
    const strBody = Buffer.isBuffer(body) ? body.toString() : body;

    try {
      await next();
    } catch (err: any) {
      const { message } = err;
      return c.json(new JSONParseError(message, { raw: strBody }), 400);
    }
  };
}
