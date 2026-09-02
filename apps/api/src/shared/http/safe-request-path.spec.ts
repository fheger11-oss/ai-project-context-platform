import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { safeRequestPath } from "./safe-request-path.js";

describe("safeRequestPath", () => {
  it("returns the path without OAuth query parameters", () => {
    expect(
      safeRequestPath({
        path: "/api/v1/auth/github/callback",
        url: "/api/v1/auth/github/callback?code=secret-code&state=secret-state"
      } as Request)
    ).toBe("/api/v1/auth/github/callback");
  });

  it("falls back to stripping the query string from url", () => {
    expect(
      safeRequestPath({
        url: "/api/v1/auth/github/callback?code=secret-code&state=secret-state"
      } as Request)
    ).toBe("/api/v1/auth/github/callback");
  });
});
