import { HttpException, Inject, Injectable } from "@nestjs/common";

import { GitHubAccountService } from "../../auth/providers/github-account.service.js";
import { RepositoriesService } from "../../repositories/repositories.service.js";
import type {
  RepositoryAccessResolver,
  ResolveRepositoryAccessInput
} from "../domain/contracts/repository-access-resolver.contract.js";
import type { RepositoryContentAccess } from "../domain/contracts/repository-content-provider.contract.js";
import { RepositoryAccessResolutionError } from "../domain/errors/repository-access-resolution.error.js";
import { RepositoryProviderAccountResolutionError } from "../domain/errors/repository-provider-account-resolution.error.js";

@Injectable()
export class RepositoryAccessResolverInfrastructure implements RepositoryAccessResolver {
  constructor(
    @Inject(RepositoriesService)
    private readonly repositoriesService: RepositoriesService,
    @Inject(GitHubAccountService)
    private readonly githubAccountService: GitHubAccountService
  ) {}

  async resolveRepositoryAccess(
    input: ResolveRepositoryAccessInput
  ): Promise<RepositoryContentAccess> {
    const repository = await this.getRepository(input.userId, input.repositoryId);
    const accessToken = await this.getAccessToken(repository.userId, input.repositoryId);

    if (!accessToken) {
      throw new RepositoryProviderAccountResolutionError(input.repositoryId);
    }

    return {
      locator: `${repository.owner}/${repository.name}`,
      reference: input.reference || repository.defaultBranch,
      authorization: {
        bearerToken: accessToken
      }
    };
  }

  private async getRepository(userId: string, repositoryId: string) {
    try {
      return await this.repositoriesService.getScanAccessMetadataForUser(userId, repositoryId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new RepositoryAccessResolutionError(repositoryId, { cause: error });
    }
  }

  private async getAccessToken(userId: string, repositoryId: string) {
    try {
      return await this.githubAccountService.getAccessTokenForUser(userId);
    } catch (error) {
      throw new RepositoryProviderAccountResolutionError(repositoryId, { cause: error });
    }
  }
}
