import { UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppConfigService } from "../../config/app-config.service.js";
import { GitHubOAuthProvider } from "./github-oauth.provider.js";

const config = {
  githubCallbackUrl: "https://api.ctxaro.test/api/v1/auth/github/callback",
  githubClientId: "client-id",
  githubClientSecret: "client-secret"
} as AppConfigService;

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200
  });
}

function mockGitHubResponses(userEmail: string | null, emails: unknown[]): void {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response({ access_token: "provider-token", scope: "user:email" }))
      .mockResolvedValueOnce(
        response({
          avatar_url: null,
          email: userEmail,
          id: 123,
          login: "octocat",
          name: "Octo Cat"
        })
      )
      .mockResolvedValueOnce(response(emails))
  );
}

describe("GitHubOAuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses only the verified primary email for account identity", async () => {
    mockGitHubResponses("public@example.com", [
      { email: "secondary@example.com", primary: false, verified: true },
      { email: "OWNER@EXAMPLE.COM", primary: true, verified: true }
    ]);

    const profile = await new GitHubOAuthProvider(config).exchangeCodeForProfile("oauth-code");

    expect(profile.email).toBe("owner@example.com");
  });

  it("rejects an unverified primary email even when it is public on the profile", async () => {
    mockGitHubResponses("victim@example.com", [
      { email: "victim@example.com", primary: true, verified: false }
    ]);

    await expect(
      new GitHubOAuthProvider(config).exchangeCodeForProfile("oauth-code")
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
