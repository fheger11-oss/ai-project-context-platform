import { afterEach, describe, expect, it, vi } from "vitest";

import { getGitHubLoginUrl, logout } from "@/features/auth/api/auth-api";

describe("auth-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the GitHub login URL from the existing API URL", () => {
    expect(getGitHubLoginUrl()).toBe("http://localhost:3000/api/v1/auth/github");
  });

  it("sends logout through the existing auth endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await logout("refresh_token");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("http://localhost:3000/api/v1/auth/logout");
    expect(init.method).toBe("POST");
    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ refreshToken: "refresh_token" }));
  });
});
