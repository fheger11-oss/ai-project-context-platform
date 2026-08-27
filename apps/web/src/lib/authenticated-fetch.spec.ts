import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { authenticatedFetch } from "./authenticated-fetch";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

describe("authenticatedFetch", () => {
  beforeEach(() => {
    useAuthSessionStore.setState({
      accessToken: "expired_access_token",
      refreshToken: "refresh_token",
      expiresIn: 7200
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthSessionStore.getState().clearSession();
  });

  it("refreshes the access token once after an unauthorized response and retries the request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: "user_1"
          },
          tokens: {
            accessToken: "fresh_access_token",
            refreshToken: "fresh_refresh_token",
            expiresIn: 7200
          }
        })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authenticatedFetch("/dashboard/projects", {
      method: "GET",
      headers: {
        Authorization: "Bearer expired_access_token"
      }
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "refresh_token" })
      })
    );
    const retryInit = fetchMock.mock.calls[2]?.[1] as RequestInit | undefined;

    expect(fetchMock.mock.calls[2]?.[0]).toBe("http://localhost:3000/api/v1/dashboard/projects");
    expect(new Headers(retryInit?.headers).get("Authorization")).toBe("Bearer fresh_access_token");
    expect(useAuthSessionStore.getState()).toMatchObject({
      accessToken: "fresh_access_token",
      refreshToken: "fresh_refresh_token",
      expiresIn: 7200
    });
  });

  it("does not retry repeatedly when the refreshed request is still unauthorized", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          tokens: {
            accessToken: "fresh_access_token",
            refreshToken: "fresh_refresh_token",
            expiresIn: 7200
          }
        })
      )
      .mockResolvedValueOnce(jsonResponse({ message: "Still unauthorized" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authenticatedFetch("/repositories", {
      method: "GET",
      headers: {
        Authorization: "Bearer expired_access_token"
      }
    });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears the existing session when refresh fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Invalid refresh token" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authenticatedFetch("/contexts/context_1", {
      method: "GET",
      headers: {
        Authorization: "Bearer expired_access_token"
      }
    });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useAuthSessionStore.getState()).toMatchObject({
      accessToken: "",
      refreshToken: "",
      expiresIn: null
    });
  });
});
