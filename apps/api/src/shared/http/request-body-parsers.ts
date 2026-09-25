import { json, raw, urlencoded } from "express";

export function createRequestBodyParsers(limitBytes: number) {
  return [json({ limit: limitBytes }), urlencoded({ extended: false, limit: limitBytes })] as const;
}

export function createWebhookRawBodyParser(limitBytes: number) {
  return raw({ type: "application/json", limit: limitBytes });
}
