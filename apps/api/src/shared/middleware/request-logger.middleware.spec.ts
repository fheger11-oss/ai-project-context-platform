import { Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { RequestLoggerMiddleware } from "./request-logger.middleware.js";

describe("RequestLoggerMiddleware", () => {
  it("logs request paths without OAuth query strings", () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const finishCallbacks: Array<() => void> = [];
    const middleware = new RequestLoggerMiddleware();
    const response = {
      on: vi.fn((event: string, callback: () => void) => {
        if (event === "finish") {
          finishCallbacks.push(callback);
        }
      }),
      statusCode: 302
    };
    const request = {
      method: "GET",
      path: "/api/v1/auth/github/callback",
      originalUrl: "/api/v1/auth/github/callback?code=secret-code&state=secret-state",
      url: "/api/v1/auth/github/callback?code=secret-code&state=secret-state"
    };

    middleware.use(request as Request, response as unknown as Response, vi.fn());
    finishCallbacks.forEach((callback) => {
      callback();
    });

    const logOutput = loggerSpy.mock.calls.flat().join("\n");

    expect(logOutput).toContain("GET /api/v1/auth/github/callback 302");
    expect(logOutput).not.toContain("secret-code");
    expect(logOutput).not.toContain("secret-state");
  });
});
