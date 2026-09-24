import { BadGatewayException, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChangeSetCompleteness, ComparisonStatus, FileChangeType } from "../domain/change-set.js";
import { GitHubRepositoryCompareProvider } from "./github-repository-compare.provider.js";

const access = {
  owner: "ctxaro org",
  name: "api/repository",
  authorization: { bearerToken: "secret-token" }
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    status: "ahead",
    ahead_by: 2,
    behind_by: 0,
    base_commit: { sha: "base" },
    merge_base_commit: { sha: "base" },
    files: [
      {
        filename: "src/new.ts",
        status: "added",
        additions: 10,
        deletions: 0
      },
      {
        filename: "src/renamed.ts",
        previous_filename: "src/old.ts",
        status: "renamed",
        additions: 1,
        deletions: 2
      }
    ],
    ...overrides
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GitHubRepositoryCompareProvider", () => {
  it("calls the compare URL with standard GitHub headers and normalizes files", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(payload()), { status: 200 }));

    const result = await new GitHubRepositoryCompareProvider().compare(access, "base", "target");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://api.github.com/repos/ctxaro%20org/api%2Frepository/compare/base...target"
    );
    expect(request?.headers).toEqual({
      Accept: "application/vnd.github+json",
      Authorization: "Bearer secret-token",
      "User-Agent": "ai-project-context-platform",
      "X-GitHub-Api-Version": "2022-11-28"
    });
    expect(result).toEqual({
      baseCommitSha: "base",
      targetCommitSha: "target",
      comparisonStatus: ComparisonStatus.AHEAD,
      completeness: ChangeSetCompleteness.COMPLETE,
      aheadBy: 2,
      behindBy: 0,
      changedFileCount: 2,
      files: [
        {
          path: "src/new.ts",
          type: FileChangeType.ADDED,
          additions: 10,
          deletions: 0
        },
        {
          path: "src/renamed.ts",
          previousPath: "src/old.ts",
          type: FileChangeType.RENAMED,
          additions: 1,
          deletions: 2
        }
      ]
    });
  });

  it.each([
    ["modified", FileChangeType.MODIFIED],
    ["changed", FileChangeType.MODIFIED],
    ["removed", FileChangeType.DELETED],
    ["copied", FileChangeType.COPIED]
  ] as const)("maps GitHub %s files", async (status, expected) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          payload({
            files: [{ filename: "file.ts", status, additions: 1, deletions: 2 }]
          })
        ),
        { status: 200 }
      )
    );

    const result = await new GitHubRepositoryCompareProvider().compare(access, "base", "target");

    expect(result.files[0]?.type).toBe(expected);
  });

  it("maps rejected authentication", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      new GitHubRepositoryCompareProvider().compare(access, "base", "target")
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps rate limits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 403, headers: { "x-ratelimit-remaining": "0" } })
    );

    await expect(
      new GitHubRepositoryCompareProvider().compare(access, "base", "target")
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it.each([404, 422, 500])(
    "maps GitHub status %s without exposing its response",
    async (status) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ message: "sensitive provider response" }), { status })
      );

      await expect(
        new GitHubRepositoryCompareProvider().compare(access, "base", "target")
      ).rejects.toEqual(new BadGatewayException("GitHub comparison could not be resolved"));
    }
  );

  it("maps request timeout to the provider convention", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, request) => {
      return new Promise((_resolve, reject) => {
        request?.signal?.addEventListener("abort", () =>
          reject(new DOMException("", "AbortError"))
        );
      });
    });

    const comparison = new GitHubRepositoryCompareProvider().compare(access, "base", "target");
    const expectation = expect(comparison).rejects.toEqual(
      new BadGatewayException("GitHub comparison could not be resolved")
    );
    await vi.advanceTimersByTimeAsync(10_000);

    await expectation;
  });

  it.each([
    new Response("not-json", { status: 200 }),
    new Response(JSON.stringify({ status: "ahead" }), { status: 200 })
  ])("rejects malformed responses", async (response) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(
      new GitHubRepositoryCompareProvider().compare(access, "base", "target")
    ).rejects.toEqual(new BadGatewayException("GitHub compare response could not be validated"));
  });

  it("marks the conservative 300-file boundary incomplete without dropping returned files", async () => {
    const files = Array.from({ length: 300 }, (_, index) => ({
      filename: `file-${index}.ts`,
      status: "modified",
      additions: 1,
      deletions: 0
    }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload({ files })), { status: 200 })
    );

    const result = await new GitHubRepositoryCompareProvider().compare(access, "base", "target");

    expect(result.completeness).toBe(ChangeSetCompleteness.INCOMPLETE);
    expect(result.changedFileCount).toBe(300);
    expect(result.files).toHaveLength(300);
  });
});
