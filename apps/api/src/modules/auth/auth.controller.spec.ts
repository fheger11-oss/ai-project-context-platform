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

describe("AuthController GitHub OAuth state cookie", () => {
  it("sets an HttpOnly OAuth state cookie before redirecting to GitHub", async () => {
    const authService = {
      createGitHubOAuthNonce: vi.fn().mockReturnValue("nonce-value"),
      createGitHubAuthorizationUrl: vi.fn().mockResolvedValue("https://github.com/login/oauth")
    };
    const response = {
      cookie: vi.fn()
    };
    const controller = new AuthController(authService as never);

    await expect(controller.loginWithGitHub(response as never)).resolves.toEqual({
      url: "https://github.com/login/oauth"
    });

    expect(authService.createGitHubAuthorizationUrl).toHaveBeenCalledWith("nonce-value");
    expect(response.cookie).toHaveBeenCalledWith(
      "ctxaro_github_oauth_state",
      "nonce-value",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600_000,
        path: "/",
        sameSite: "lax"
      })
    );
  });

  it("passes the HttpOnly state cookie nonce to callback validation and clears it", async () => {
    const authService = {
      loginWithGitHub: vi.fn().mockResolvedValue({
        tokens: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresIn: 7200
        }
      }),
      webAuthCallbackUrl: "http://localhost:5173/auth/callback"
    };
    const response = {
      clearCookie: vi.fn(),
      redirect: vi.fn()
    };
    const request = {
      get: vi.fn().mockReturnValue("vitest"),
      headers: {
        cookie: "ctxaro_github_oauth_state=nonce-value; theme=dark"
      },
      ip: "127.0.0.1"
    };
    const controller = new AuthController(authService as never);

    await controller.handleGitHubCallback(
      { code: "code", state: "state" },
      request as never,
      response as never
    );

    expect(response.clearCookie).toHaveBeenCalledWith(
      "ctxaro_github_oauth_state",
      expect.objectContaining({
        path: "/",
        sameSite: "lax"
      })
    );
    expect(authService.loginWithGitHub).toHaveBeenCalledWith("code", "state", "nonce-value", {
      ipAddress: "127.0.0.1",
      userAgent: "vitest"
    });
    expect(response.redirect).toHaveBeenCalledWith(
      "http://localhost:5173/auth/callback#access_token=access-token&refresh_token=refresh-token&expires_in=7200"
    );
  });

  it("clears the OAuth state cookie before propagating callback failures", async () => {
    const originalError = new Error("invalid state");
    const authService = {
      loginWithGitHub: vi.fn().mockRejectedValue(originalError),
      webAuthCallbackUrl: "http://localhost:5173/auth/callback"
    };
    const response = {
      clearCookie: vi.fn(),
      redirect: vi.fn()
    };
    const request = {
      get: vi.fn().mockReturnValue("vitest"),
      headers: {},
      ip: "127.0.0.1"
    };
    const controller = new AuthController(authService as never);

    await expect(
      controller.handleGitHubCallback(
        { code: "code", state: "state" },
        request as never,
        response as never
      )
    ).rejects.toBe(originalError);

    expect(response.clearCookie).toHaveBeenCalledWith(
      "ctxaro_github_oauth_state",
      expect.objectContaining({
        path: "/",
        sameSite: "lax"
      })
    );
    expect(response.redirect).not.toHaveBeenCalled();
  });
});
