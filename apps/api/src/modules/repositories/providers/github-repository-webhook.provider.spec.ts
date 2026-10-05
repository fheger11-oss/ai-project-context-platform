import { afterEach, describe, expect, it, vi } from "vitest";

import { RepositoryWebhookProviderError } from "../domain/repository-webhook-provider.error.js";
import { GitHubRepositoryWebhookProvider } from "./github-repository-webhook.provider.js";

const access = {
  authorization: { bearerToken: "provider-token" },
  owner: "ctxaro org",
  name: "private/repository"
};

const hook = {
  id: 42,
  active: true,
  events: ["push"],
  config: {
    url: "https://api.ctxaro.test/api/v1/webhooks/github",
    content_type: "json",
    insecure_ssl: "0"
  }
};

function response(status: number, body: unknown = undefined, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body)
  };
}

function writeInput() {
  return {
    ...access,
    active: true,
    callbackUrl: hook.config.url,
    contentType: "json" as const,
    events: ["push"],
    insecureSsl: "0" as const,
    secret: "not-logged-secret"
  };
}

describe("GitHubRepositoryWebhookProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a canonical repository hook", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(201, hook));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new GitHubRepositoryWebhookProvider().create(writeInput())).resolves.toMatchObject(
      {
        providerWebhookId: "42",
        active: true,
        events: ["push"]
      }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/ctxaro%20org/private%2Frepository/hooks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer provider-token" })
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      name: "web",
      active: true,
      events: ["push"],
      config: {
        url: hook.config.url,
        content_type: "json",
        insecure_ssl: "0",
        secret: "not-logged-secret"
      }
    });
  });

  it("gets, lists, updates, and deletes repository hooks", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, hook))
      .mockResolvedValueOnce(response(200, [hook]))
      .mockResolvedValueOnce(response(200, hook))
      .mockResolvedValueOnce(response(204));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new GitHubRepositoryWebhookProvider();

    await expect(provider.get(access, "42")).resolves.toMatchObject({ providerWebhookId: "42" });
    await expect(provider.list(access)).resolves.toHaveLength(1);
    await expect(
      provider.update({ ...writeInput(), providerWebhookId: "42" })
    ).resolves.toMatchObject({ providerWebhookId: "42" });
    await expect(provider.delete(access, "42")).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.map((call) => [call[0], call[1]?.method ?? "GET"])).toEqual([
      [expect.stringMatching(/\/hooks\/42$/), "GET"],
      [expect.stringMatching(/\/hooks\?per_page=100&page=1$/), "GET"],
      [expect.stringMatching(/\/hooks\/42$/), "PATCH"],
      [expect.stringMatching(/\/hooks\/42$/), "DELETE"]
    ]);
  });

  it.each([
    [401, {}, "ACCESS_DENIED"],
    [403, {}, "AUTHORIZATION_REQUIRED"],
    [404, {}, "NOT_FOUND"],
    [422, {}, "CONFIGURATION_INVALID"],
    [429, {}, "PROVIDER_UNAVAILABLE"],
    [503, {}, "PROVIDER_UNAVAILABLE"],
    [403, { "x-ratelimit-remaining": "0" }, "PROVIDER_UNAVAILABLE"]
  ])("classifies GitHub status %s safely", async (status, headers, failure) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(status, {}, headers)));

    await expect(new GitHubRepositoryWebhookProvider().get(access, "42")).rejects.toMatchObject({
      failure
    });
  });

  it("classifies network failures and malformed responses without exposing raw details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sensitive network detail")));
    await expect(new GitHubRepositoryWebhookProvider().get(access, "42")).rejects.toEqual(
      new RepositoryWebhookProviderError("PROVIDER_UNAVAILABLE")
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { id: "not-a-number" })));
    await expect(new GitHubRepositoryWebhookProvider().get(access, "42")).rejects.toMatchObject({
      failure: "UNKNOWN"
    });
  });
});
