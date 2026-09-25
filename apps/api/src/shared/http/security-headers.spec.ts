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

    createSecurityHeadersMiddleware()({ headers: {} } as Request, response, next as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
  });
});
