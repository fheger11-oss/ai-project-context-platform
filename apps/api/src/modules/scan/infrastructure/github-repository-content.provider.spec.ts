import { afterEach, describe, expect, it, vi } from "vitest";

import type { RepositoryContentAccess } from "../domain/contracts/repository-content-provider.contract.js";
import { GitHubRepositoryContentProvider } from "./github-repository-content.provider.js";

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
});
