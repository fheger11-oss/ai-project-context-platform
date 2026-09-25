import { HttpException, InternalServerErrorException, Logger } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { GlobalExceptionFilter } from "./global-exception.filter.js";

describe("GlobalExceptionFilter", () => {
  it("returns and logs request paths without OAuth query strings", () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const request = {
      method: "GET",
      path: "/api/v1/auth/github/callback",
      url: "/api/v1/auth/github/callback?code=secret-code&state=secret-state"
    } as Request;
    const response = {
      status
    } as unknown as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response
      })
    } as ArgumentsHost;

    new GlobalExceptionFilter().catch(new InternalServerErrorException(), host);

    const payload = json.mock.calls[0]?.[0] as { path?: string };

    expect(status).toHaveBeenCalledWith(500);
    expect(loggerSpy.mock.calls.flat().join("\n")).toContain(
      "GET /api/v1/auth/github/callback 500"
    );
    expect(loggerSpy.mock.calls.flat().join("\n")).not.toContain("secret-code");
    expect(loggerSpy.mock.calls.flat().join("\n")).not.toContain("secret-state");
    expect(payload.path).toBe("/api/v1/auth/github/callback");
    expect(JSON.stringify(payload)).not.toContain("secret-code");
    expect(JSON.stringify(payload)).not.toContain("secret-state");
  });

  it("sanitizes explicit HTTP 5xx responses and logs no exception details in production", () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const secret = "postgresql://user:sensitive-password@db.example.com/app";
    const request = { method: "GET", path: "/api/v1/repositories" } as Request;
    const response = { status } as unknown as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response
      })
    } as ArgumentsHost;

    new GlobalExceptionFilter(true).catch(
      new HttpException({ statusCode: 503, message: secret, details: secret }, 503),
      host
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        message: "Internal server error",
        error: "Internal Server Error"
      })
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain(secret);
    expect(loggerSpy.mock.calls.flat().join("\n")).not.toContain(secret);
  });
});
