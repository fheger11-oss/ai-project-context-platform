import "reflect-metadata";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthController } from "./auth.controller.js";

const THROTTLER_LIMIT_METADATA = "THROTTLER:LIMITdefault";
const THROTTLER_TTL_METADATA = "THROTTLER:TTLdefault";

describe("AuthController rate limiting", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    "loginWithGitHub",
    "handleGitHubCallback",
    "register",
    "login",
    "refresh",
    "logout"
  ] as const)("applies the auth rate limit to %s", (methodName) => {
    const method = AuthController.prototype[methodName];
    const limit = Reflect.getMetadata(THROTTLER_LIMIT_METADATA, method) as () => number;
    const ttl = Reflect.getMetadata(THROTTLER_TTL_METADATA, method) as () => number;

    expect(limit()).toBe(10);
    expect(ttl()).toBe(60_000);
  });

  it("reads auth rate-limit overrides from the environment", () => {
    vi.stubEnv("RATE_LIMIT_AUTH_MAX", "7");
    vi.stubEnv("RATE_LIMIT_AUTH_TTL_SECONDS", "30");

    const limit = Reflect.getMetadata(
      THROTTLER_LIMIT_METADATA,
      AuthController.prototype.login
    ) as () => number;
    const ttl = Reflect.getMetadata(
      THROTTLER_TTL_METADATA,
      AuthController.prototype.login
    ) as () => number;

    expect(limit()).toBe(7);
    expect(ttl()).toBe(30_000);
  });
});
