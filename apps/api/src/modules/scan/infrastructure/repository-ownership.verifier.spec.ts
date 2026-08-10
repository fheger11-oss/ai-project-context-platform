import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import { RepositoryOwnershipVerifierInfrastructure } from "./repository-ownership.verifier.js";

function createVerifier(repositoriesService?: Partial<RepositoriesService>) {
  const service = {
    getScanAccessMetadataForUser: vi.fn().mockResolvedValue({
      id: "repository_1",
      userId: "user_1",
      owner: "owner",
      name: "repository",
      defaultBranch: "main"
    }),
    ...repositoriesService
  } as RepositoriesService;

  return {
    repositoriesService: service,
    verifier: new RepositoryOwnershipVerifierInfrastructure(service)
  };
}

describe("RepositoryOwnershipVerifierInfrastructure", () => {
  it("delegates ownership verification to Repository Engine", async () => {
    const { repositoriesService, verifier } = createVerifier();

    await expect(
      verifier.verifyRepositoryOwnership({
        userId: "user_1",
        repositoryId: "repository_1"
      })
    ).resolves.toBeUndefined();

    expect(repositoriesService.getScanAccessMetadataForUser).toHaveBeenCalledWith(
      "user_1",
      "repository_1"
    );
  });

  it("preserves Repository Engine non-disclosure errors", async () => {
    const notFoundError = new NotFoundException("Repository was not found");
    const { verifier } = createVerifier({
      getScanAccessMetadataForUser: vi.fn().mockRejectedValue(notFoundError)
    });

    await expect(
      verifier.verifyRepositoryOwnership({
        userId: "user_1",
        repositoryId: "repository_2"
      })
    ).rejects.toBe(notFoundError);
  });
});
