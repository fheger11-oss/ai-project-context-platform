import type { NextFunction, Request, Response } from "express";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { createRequestBodyParsers, createWebhookRawBodyParser } from "./request-body-parsers.js";

describe("createRequestBodyParsers", () => {
  it("accepts a JSON request within the configured limit", async () => {
    const error = await parseJson(JSON.stringify({ value: "small" }), 1024);

    expect(error).toBeUndefined();
  });

  it("rejects an oversized JSON request with 413", async () => {
    const error = (await parseJson(JSON.stringify({ value: "x".repeat(2048) }), 1024)) as {
      status?: number;
      type?: string;
    };

    expect(error).toMatchObject({ status: 413, type: "entity.too.large" });
  });

  it("preserves exact webhook bytes within its dedicated limit", async () => {
    const body = '{ "spacing": true }\n';
    const { error, parsed } = await parseWebhook(body, 1024);
    expect(error).toBeUndefined();
    expect(parsed).toEqual(Buffer.from(body));
  });

  it("rejects an oversized webhook before controller execution with 413", async () => {
    const { error } = await parseWebhook("x".repeat(1025), 1024);
    expect(error).toMatchObject({ status: 413, type: "entity.too.large" });
  });
});

function parseJson(body: string, limitBytes: number): Promise<unknown> {
  const request = Readable.from([Buffer.from(body)]) as unknown as Request;
  request.headers = {
    "content-length": String(Buffer.byteLength(body)),
    "content-type": "application/json"
  };
  request.method = "POST";
  request.url = "/request";

  const [jsonParser] = createRequestBodyParsers(limitBytes);

  return new Promise((resolve) => {
    jsonParser(request, {} as Response, ((error?: unknown) => resolve(error)) as NextFunction);
  });
}

function parseWebhook(
  body: string,
  limitBytes: number
): Promise<{ error: unknown; parsed: unknown }> {
  const request = Readable.from([Buffer.from(body)]) as unknown as Request;
  request.headers = {
    "content-length": String(Buffer.byteLength(body)),
    "content-type": "application/json"
  };
  request.method = "POST";
  request.url = "/api/v1/webhooks/github";
  const parser = createWebhookRawBodyParser(limitBytes);
  return new Promise((resolve) =>
    parser(
      request,
      {} as Response,
      ((error?: unknown) => resolve({ error, parsed: request.body })) as NextFunction
    )
  );
}
