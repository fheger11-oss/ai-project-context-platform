import { afterEach, describe, expect, it, vi } from "vitest";

import { GitHubRepositoryProvider } from "./github-repository.provider.js";

const repository = {
  githubId: "123",
  owner: "ctxaro org",
  name: "private/repository"
};

function githubResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body)
  };
}

describe("GitHubRepositoryProvider webhook management capability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports webhook management capability only when GitHub returns admin permission", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      githubResponse(200, {
        id: 123,
        permissions: { admin: true, maintain: true, pull: true, push: true, triage: true }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({
      capability: "CAN_MANAGE_WEBHOOK",
      permissions: { admin: true, maintain: true, pull: true, push: true, triage: true }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/ctxaro%20org/private%2Frepository",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer provider-token" })
      })
    );
  });

  it("does not infer webhook management from non-admin repository permissions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        githubResponse(200, {
          id: 123,
          permissions: { admin: false, maintain: true, pull: true, push: true, triage: true }
        })
      )
    );

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toMatchObject({
      capability: "CANNOT_MANAGE_WEBHOOK",
      permissions: { admin: false, maintain: true, push: true }
    });
  });

  it("maps an invalid or revoked GitHub token to provider access denied", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(githubResponse(401, {})));

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_ACCESS_DENIED", permissions: null });
  });

  it("maps an inaccessible repository to provider repository not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(githubResponse(404, {})));

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_REPOSITORY_NOT_FOUND", permissions: null });
  });

  it("maps policy or SSO authorization failures without treating them as non-admin", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          githubResponse(
            403,
            {},
            { "x-github-sso": "required; url=https://github.com/orgs/acme/sso" }
          )
        )
    );

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_AUTHORIZATION_REQUIRED", permissions: null });
  });

  it.each([
    ["rate limiting", githubResponse(403, {}, { "x-ratelimit-remaining": "0" })],
    ["provider failure", githubResponse(503, {})]
  ])("maps %s to provider unavailable", async (_scenario, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_UNAVAILABLE", permissions: null });
  });

  it("maps network failures and malformed permission responses to provider unavailable", async () => {
    const provider = new GitHubRepositoryProvider();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network details must stay internal"))
    );

    await expect(
      provider.checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_UNAVAILABLE", permissions: null });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(githubResponse(200, { id: 123 })));
    await expect(
      provider.checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_UNAVAILABLE", permissions: null });
  });

  it("rejects a repository identity mismatch without inventing capability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(githubResponse(200, { id: 456, permissions: { admin: true } }))
    );

    await expect(
      new GitHubRepositoryProvider().checkWebhookManagementCapability("provider-token", repository)
    ).resolves.toEqual({ capability: "PROVIDER_REPOSITORY_NOT_FOUND", permissions: null });
  });
});
