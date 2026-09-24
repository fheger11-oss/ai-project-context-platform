import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GitHubAccountService } from "../../auth/providers/github-account.service.js";
import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type { RepositoryCompareProvider } from "../domain/contracts/repository-compare-provider.contract.js";
import { ComparisonStatus, FileChangeType } from "../domain/change-set.js";
import { ChangeSetService } from "./change-set.service.js";
import { ChangeSetComparisonUnavailableError } from "./errors/change-set-comparison-unavailable.error.js";

function createHarness() {
  const getScanAccessMetadataForUser = vi.fn().mockResolvedValue({
    id: "repository_1",
    userId: "user_1",
    owner: "ctxaro",
    name: "api",
    defaultBranch: "main"
  });
  const getAccessTokenForUser = vi.fn().mockResolvedValue("token");
  const compare = vi.fn().mockResolvedValue({
    baseCommitSha: "base",
    targetCommitSha: "target",
    comparisonStatus: ComparisonStatus.AHEAD,
    aheadBy: 1,
    behindBy: 0,
    changedFileCount: 1,
    files: [
      {
        path: "src/index.ts",
        type: FileChangeType.MODIFIED,
        additions: 3,
        deletions: 1
      }
    ]
  });
  const service = new ChangeSetService(
    { getScanAccessMetadataForUser } as unknown as RepositoriesService,
    { getAccessTokenForUser } as unknown as GitHubAccountService,
    { compare } as RepositoryCompareProvider
  );

  return { service, getScanAccessMetadataForUser, getAccessTokenForUser, compare };
}

describe("ChangeSetService", () => {
  it("enforces ownership and returns an empty ChangeSet without provider access for equal SHAs", async () => {
    const harness = createHarness();

    await expect(
      harness.service.compare({
        userId: "user_1",
        repositoryId: "repository_1",
        baseCommitSha: "same",
        targetCommitSha: "same"
      })
    ).resolves.toMatchObject({ changedFileCount: 0, files: [] });
    expect(harness.getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(harness.getAccessTokenForUser).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it("passes the exact base and observed target SHAs to the provider", async () => {
    const harness = createHarness();

    const result = await harness.service.compare({
      userId: "user_1",
      repositoryId: "repository_1",
      baseCommitSha: "base",
      targetCommitSha: "target"
    });

    expect(harness.compare).toHaveBeenCalledWith(
      { owner: "ctxaro", name: "api", authorization: { bearerToken: "token" } },
      "base",
      "target"
    );
    expect(result).toEqual({
      baseCommitSha: "base",
      targetCommitSha: "target",
      comparisonStatus: ComparisonStatus.AHEAD,
      aheadBy: 1,
      behindBy: 0,
      changedFileCount: 1,
      additions: 3,
      deletions: 1,
      files: [
        {
          path: "src/index.ts",
          type: FileChangeType.MODIFIED,
          additions: 3,
          deletions: 1
        }
      ]
    });
    expect(result).not.toHaveProperty("html_url");
    expect(result.files[0]).not.toHaveProperty("raw_url");
  });

  it("rejects a missing current context commit explicitly", async () => {
    const harness = createHarness();

    await expect(
      harness.service.compare({
        userId: "user_1",
        repositoryId: "repository_1",
        baseCommitSha: null,
        targetCommitSha: "target"
      })
    ).rejects.toEqual(new ChangeSetComparisonUnavailableError("MISSING_BASE_COMMIT"));
    expect(harness.compare).not.toHaveBeenCalled();
  });

  it("rejects a missing observed remote HEAD explicitly", async () => {
    const harness = createHarness();

    await expect(
      harness.service.compare({
        userId: "user_1",
        repositoryId: "repository_1",
        baseCommitSha: "base",
        targetCommitSha: null
      })
    ).rejects.toEqual(new ChangeSetComparisonUnavailableError("MISSING_TARGET_COMMIT"));
  });

  it("propagates provider failures", async () => {
    const harness = createHarness();
    const providerError = new Error("provider failed");
    harness.compare.mockRejectedValue(providerError);

    await expect(
      harness.service.compare({
        userId: "user_1",
        repositoryId: "repository_1",
        baseCommitSha: "base",
        targetCommitSha: "target"
      })
    ).rejects.toBe(providerError);
  });

  it("does not resolve credentials or call the provider when ownership fails", async () => {
    const harness = createHarness();
    harness.getScanAccessMetadataForUser.mockRejectedValue(new NotFoundException());

    await expect(
      harness.service.compare({
        userId: "other_user",
        repositoryId: "repository_1",
        baseCommitSha: "base",
        targetCommitSha: "target"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(harness.getAccessTokenForUser).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
  });
});
