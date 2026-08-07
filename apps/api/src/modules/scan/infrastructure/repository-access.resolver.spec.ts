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
    getScanAccessMetadata: vi.fn().mockResolvedValue({
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
        reference: "feature"
      })
    ).resolves.toEqual({
      locator: "owner/repository",
      reference: "feature",
      authorization: {
        bearerToken: "github_access_token"
      }
    });

    expect(repositoriesService.getScanAccessMetadata).toHaveBeenCalledWith("repository_1");
    expect(githubAccountService.getAccessTokenForUser).toHaveBeenCalledWith("user_1");
  });

  it("uses the repository default branch when reference is empty", async () => {
    const { resolver } = createResolver();

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "repository_1",
        reference: ""
      })
    ).resolves.toMatchObject({
      reference: "main"
    });
  });

  it("throws a domain error when repository metadata cannot be resolved", async () => {
    const { githubAccountService, resolver } = createResolver({
      repositoriesService: {
        getScanAccessMetadata: vi.fn().mockRejectedValue(new Error("not found"))
      }
    });

    await expect(
      resolver.resolveRepositoryAccess({
        repositoryId: "missing_repository",
        reference: "main"
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
        reference: "main"
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
        reference: "main"
      })
    ).rejects.toBeInstanceOf(RepositoryProviderAccountResolutionError);
  });
});
