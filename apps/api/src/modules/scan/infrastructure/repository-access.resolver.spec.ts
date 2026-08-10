import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GitHubAccountService } from "../../auth/providers/github-account.service.js";
import type { RepositoriesService } from "../../repositories/repositories.service.js";
import { RepositoryAccessResolutionError } from "../domain/errors/repository-access-resolution.error.js";
import { RepositoryProviderAccountResolutionError } from "../domain/errors/repository-provider-account-resolution.error.js";
import { RepositoryAccessResolverInfrastructure } from "./repository-access.resolver.js";

function createResolver(overrides?: {
  repositoriesService?: Partial<RepositoriesService>;
  githubAccountService?: Partial<GitHubAccountService>;
}) {
  const repositoriesService = {
    getScanAccessMetadataForUser: vi.fn().mockResolvedValue({
      id: "repository_1",
      userId: "user_1",
      owner: "owner",
      name: "repository",
      defaultBranch: "main"
    }),
    ...overrides?.repositoriesService
  } as RepositoriesService;
  const githubAccountService = {
    getAccessTokenForUser: vi.fn().mockResolvedValue("github_access_token"),
    ...overrides?.githubAccountService
  } as GitHubAccountService;

  return {
    githubAccountService,
    repositoriesService,
    resolver: new RepositoryAccessResolverInfrastructure(repositoriesService, githubAccountService)
  };
}

describe("RepositoryAccessResolverInfrastructure", () => {
  it("builds RepositoryContentAccess from repository metadata and GitHub account access", async () => {
    const { githubAccountService, repositoriesService, resolver } = createResolver();

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "repository_1",
        reference: "feature",
        userId: "user_1"
      })
    ).resolves.toEqual({
      locator: "owner/repository",
      reference: "feature",
      authorization: {
        bearerToken: "github_access_token"
      }
    });

    expect(repositoriesService.getScanAccessMetadataForUser).toHaveBeenCalledWith(
      "user_1",
      "repository_1"
    );
    expect(githubAccountService.getAccessTokenForUser).toHaveBeenCalledWith("user_1");
  });

  it("uses the repository default branch when reference is empty", async () => {
    const { resolver } = createResolver();

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "repository_1",
        reference: "",
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      reference: "main"
    });
  });

  it("throws a domain error when repository metadata cannot be resolved", async () => {
    const { githubAccountService, resolver } = createResolver({
      repositoriesService: {
        getScanAccessMetadataForUser: vi.fn().mockRejectedValue(new Error("not found"))
      }
    });

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "missing_repository",
        reference: "main",
        userId: "user_1"
      })
    ).rejects.toBeInstanceOf(RepositoryAccessResolutionError);

    expect(githubAccountService.getAccessTokenForUser).not.toHaveBeenCalled();
  });

  it("throws a domain error when the GitHub provider account cannot be resolved", async () => {
    const { resolver } = createResolver({
      githubAccountService: {
        getAccessTokenForUser: vi.fn().mockRejectedValue(new Error("not connected"))
      }
    });

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "repository_1",
        reference: "main",
        userId: "user_1"
      })
    ).rejects.toBeInstanceOf(RepositoryProviderAccountResolutionError);
  });

  it("throws a domain error when no access token is returned", async () => {
    const { resolver } = createResolver({
      githubAccountService: {
        getAccessTokenForUser: vi.fn().mockResolvedValue("")
      }
    });

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "repository_1",
        reference: "main",
        userId: "user_1"
      })
    ).rejects.toBeInstanceOf(RepositoryProviderAccountResolutionError);
  });

  it("does not resolve credentials for unauthorized repositories", async () => {
    const notFoundError = new NotFoundException("Repository was not found");
    const { githubAccountService, repositoriesService, resolver } = createResolver({
      repositoriesService: {
        getScanAccessMetadataForUser: vi.fn().mockRejectedValue(notFoundError)
      }
    });

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "repository_2",
        reference: "main",
        userId: "user_1"
      })
    ).rejects.toBe(notFoundError);

    expect(repositoriesService.getScanAccessMetadataForUser).toHaveBeenCalledWith(
      "user_1",
      "repository_2"
    );
    expect(githubAccountService.getAccessTokenForUser).not.toHaveBeenCalled();
  });
});
