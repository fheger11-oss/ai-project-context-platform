import { BadGatewayException, HttpException, UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GitHubRepositoryHeadProvider } from "./github-repository-head.provider.js";

const input = {
  accessToken: "provider-token",
  owner: "owner name",
  name: "repository/name",
  reference: "feature/branch"
};

describe("GitHubRepositoryHeadProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves repository HEAD through the GitHub commits API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ sha: "remote_commit_sha" })
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new GitHubRepositoryHeadProvider();

    await expect(provider.resolveHead(input)).resolves.toEqual({
      commitSha: "remote_commit_sha"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner%20name/repository%2Fname/commits/feature%2Fbranch",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
          Authorization: "Bearer provider-token",
          "User-Agent": "ai-project-context-platform",
          "X-GitHub-Api-Version": "2022-11-28"
        })
      })
    );
  });

  it("rejects malformed commit responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ commit: { message: "missing sha" } })
      })
    );
    const provider = new GitHubRepositoryHeadProvider();

    await expect(provider.resolveHead(input)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("maps rejected GitHub access to UnauthorizedException", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "x-ratelimit-remaining": "10" }),
        json: vi.fn()
      })
    );
    const provider = new GitHubRepositoryHeadProvider();

    await expect(provider.resolveHead(input)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps GitHub rate limiting to HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "x-ratelimit-remaining": "0" }),
        json: vi.fn()
      })
    );
    const provider = new GitHubRepositoryHeadProvider();

    await expect(provider.resolveHead(input)).rejects.toBeInstanceOf(HttpException);
    await expect(provider.resolveHead(input)).rejects.toMatchObject({
      status: 429
    });
  });

  it("maps missing repositories or branches to BadGatewayException", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: vi.fn()
      })
    );
    const provider = new GitHubRepositoryHeadProvider();

    await expect(provider.resolveHead(input)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("maps network or timeout failures to BadGatewayException", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    const provider = new GitHubRepositoryHeadProvider();

    await expect(provider.resolveHead(input)).rejects.toBeInstanceOf(BadGatewayException);
  });
});
