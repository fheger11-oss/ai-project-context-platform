import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { createSecurityHeadersMiddleware } from "./security-headers.js";

describe("createSecurityHeadersMiddleware", () => {
  it("sets the API's baseline browser security headers", () => {
    const headers = new Map<string, string>();
    const response = {
      getHeader: (name: string) => headers.get(name.toLowerCase()),
      removeHeader: (name: string) => headers.delete(name.toLowerCase()),
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value)
    } as unknown as Response;
    const next = vi.fn();

    createSecurityHeadersMiddleware(false)(
      { headers: {} } as Request,
      response,
      next as NextFunction
    );

    expect(next).toHaveBeenCalledOnce();
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(headers.has("strict-transport-security")).toBe(false);
  });

  it("enables strict transport security in production", () => {
    const headers = new Map<string, string>();
    const response = {
      getHeader: (name: string) => headers.get(name.toLowerCase()),
      removeHeader: (name: string) => headers.delete(name.toLowerCase()),
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value)
    } as unknown as Response;

    createSecurityHeadersMiddleware(true)(
      { headers: {} } as Request,
      response,
      vi.fn() as NextFunction
    );

    expect(headers.get("strict-transport-security")).toContain("max-age=");
  });
});
