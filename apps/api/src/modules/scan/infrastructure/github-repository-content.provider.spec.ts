import { afterEach, describe, expect, it, vi } from "vitest";

import type { RepositoryContentAccess } from "../domain/contracts/repository-content-provider.contract.js";
import { ScanLimitExceededError } from "../domain/errors/scan-limit-exceeded.error.js";
import {
  GITHUB_SCAN_MAX_FILE_COUNT,
  GITHUB_SCAN_MAX_FILE_SIZE_BYTES,
  GITHUB_SCAN_MAX_TOTAL_SIZE_BYTES,
  GitHubRepositoryContentProvider
} from "./github-repository-content.provider.js";

const access: RepositoryContentAccess = {
  locator: "owner/repository",
  reference: "main",
  authorization: {
    bearerToken: "provider-token"
  }
};

describe("GitHubRepositoryContentProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns commit data using only the RepositoryContentCommit contract shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          sha: "commit_sha",
          commit: { message: "ignored provider payload" }
        })
      })
    );
    const provider = new GitHubRepositoryContentProvider();

    await expect(provider.resolveCommit(access)).resolves.toEqual({
      commitSha: "commit_sha"
    });
  });

  it("returns file metadata and content using only the RepositoryContentFile contract shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: [
              {
                path: "src/index.ts",
                sha: "file_sha",
                type: "blob",
                size: 123,
                url: "ignored"
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            content: Buffer.from("export const value = 1;").toString("base64"),
            encoding: "base64"
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();

    const files = [];
    for await (const file of provider.listSnapshotFiles(access, "commit_sha")) {
      files.push(file);
    }

    expect(files).toEqual([
      {
        path: "src/index.ts",
        extension: "ts",
        size: 123n,
        sha: "file_sha",
        content: "export const value = 1;",
        isBinary: false,
        isHidden: false
      }
    ]);
  });

  it("rejects oversized text files before loading blob content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          truncated: false,
          tree: [
            {
              path: "src/large.ts",
              sha: "file_sha",
              type: "blob",
              size: GITHUB_SCAN_MAX_FILE_SIZE_BYTES + 1
            }
          ]
        })
      });

    vi.stubGlobal("fetch", fetchMock);
    const provider = new GitHubRepositoryContentProvider();

    await expect(async () => {
      for await (const _file of provider.listSnapshotFiles(access, "commit_sha")) {
        // Drain the async iterator.
      }
    }).rejects.toMatchObject({
      reason: "INDIVIDUAL_FILE_SIZE_LIMIT",
      filePath: "src/large.ts"
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("allows a non-binary file that is exactly the individual file-size limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: [
              {
                path: "src/exact.ts",
                sha: "file_sha",
                type: "blob",
                size: GITHUB_SCAN_MAX_FILE_SIZE_BYTES
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            content: Buffer.from("export const exact = true;").toString("base64"),
            encoding: "base64"
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();
    const files = [];

    for await (const file of provider.listSnapshotFiles(access, "commit_sha")) {
      files.push(file);
    }

    expect(files).toHaveLength(1);
    expect(files[0]?.size).toBe(BigInt(GITHUB_SCAN_MAX_FILE_SIZE_BYTES));
  });

  it("rejects repositories that exceed the file-count limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: Array.from({ length: GITHUB_SCAN_MAX_FILE_COUNT + 1 }, (_, index) => ({
              path: `src/file-${index}.png`,
              sha: `file_sha_${index}`,
              type: "blob",
              size: 1
            }))
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();

    await expect(async () => {
      for await (const _file of provider.listSnapshotFiles(access, "commit_sha")) {
        // Drain the async iterator.
      }
    }).rejects.toMatchObject({
      reason: "FILE_COUNT_LIMIT",
      usage: {
        filesProcessed: GITHUB_SCAN_MAX_FILE_COUNT
      }
    });
  });

  it("allows repositories that contain exactly the file-count limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: Array.from({ length: GITHUB_SCAN_MAX_FILE_COUNT }, (_, index) => ({
              path: `assets/file-${index}.png`,
              sha: `file_sha_${index}`,
              type: "blob",
              size: 1
            }))
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();
    let count = 0;

    for await (const file of provider.listSnapshotFiles(access, "commit_sha")) {
      count += 1;
      expect(file.content).toBeNull();
    }

    expect(count).toBe(GITHUB_SCAN_MAX_FILE_COUNT);
  });

  it("rejects repositories that exceed the total scanned byte limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: [
              {
                path: "assets/large-one.png",
                sha: "file_sha_1",
                type: "blob",
                size: GITHUB_SCAN_MAX_TOTAL_SIZE_BYTES
              },
              {
                path: "assets/large-two.png",
                sha: "file_sha_2",
                type: "blob",
                size: 1
              }
            ]
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();

    await expect(async () => {
      for await (const _file of provider.listSnapshotFiles(access, "commit_sha")) {
        // Drain the async iterator.
      }
    }).rejects.toMatchObject({
      reason: "TOTAL_SIZE_LIMIT",
      usage: {
        filesProcessed: 1,
        totalBytesConsidered: BigInt(GITHUB_SCAN_MAX_TOTAL_SIZE_BYTES) + 1n
      }
    });
  });

  it("allows files whose combined size is exactly the total byte limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: [
              {
                path: "assets/exact-one.png",
                sha: "file_sha_1",
                type: "blob",
                size: GITHUB_SCAN_MAX_TOTAL_SIZE_BYTES - 1
              },
              {
                path: "assets/exact-two.png",
                sha: "file_sha_2",
                type: "blob",
                size: 1
              }
            ]
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();
    const files = [];

    for await (const file of provider.listSnapshotFiles(access, "commit_sha")) {
      files.push(file);
    }

    expect(files.map((file) => file.path)).toEqual([
      "assets/exact-one.png",
      "assets/exact-two.png"
    ]);
  });

  it("uses typed scan-limit errors for limit failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: [
              {
                path: "src/large.ts",
                sha: "file_sha",
                type: "blob",
                size: GITHUB_SCAN_MAX_FILE_SIZE_BYTES + 1
              }
            ]
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();

    await expect(async () => {
      for await (const _file of provider.listSnapshotFiles(access, "commit_sha")) {
        // Drain the async iterator.
      }
    }).rejects.toBeInstanceOf(ScanLimitExceededError);
  });

  it("skips obvious secret-bearing files without affecting normal project files", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ tree: { sha: "tree_sha" } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            truncated: false,
            tree: [
              {
                path: ".env",
                sha: "env_sha",
                type: "blob",
                size: 12
              },
              {
                path: "config/service-account.json",
                sha: "credentials_sha",
                type: "blob",
                size: 12
              },
              {
                path: "package.json",
                sha: "package_sha",
                type: "blob",
                size: 17
              },
              {
                path: "README.md",
                sha: "readme_sha",
                type: "blob",
                size: 8
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            content: Buffer.from('{"name":"app"}').toString("base64"),
            encoding: "base64"
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            content: Buffer.from("# README").toString("base64"),
            encoding: "base64"
          })
        })
    );
    const provider = new GitHubRepositoryContentProvider();
    const files = [];

    for await (const file of provider.listSnapshotFiles(access, "commit_sha")) {
      files.push(file.path);
    }

    expect(files).toEqual(["package.json", "README.md"]);
  });
});
