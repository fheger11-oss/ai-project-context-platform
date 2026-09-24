import { Inject, Injectable } from "@nestjs/common";

import { GitHubAccountService } from "../../auth/providers/github-account.service.js";
import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  REPOSITORY_COMPARE_PROVIDER,
  type RepositoryCompareProvider
} from "../domain/contracts/repository-compare-provider.contract.js";
import { createChangeSet, createEmptyChangeSet, type ChangeSet } from "../domain/change-set.js";
import { ChangeSetComparisonUnavailableError } from "./errors/change-set-comparison-unavailable.error.js";

export type CompareRepositoryChangesInput = {
  userId: string;
  repositoryId: string;
  baseCommitSha: string | null;
  targetCommitSha: string | null;
};

@Injectable()
export class ChangeSetService {
  constructor(
    @Inject(RepositoriesService) private readonly repositoriesService: RepositoriesService,
    @Inject(GitHubAccountService)
    private readonly githubAccountService: GitHubAccountService,
    @Inject(REPOSITORY_COMPARE_PROVIDER)
    private readonly repositoryCompareProvider: RepositoryCompareProvider
  ) {}

  async compare(input: CompareRepositoryChangesInput): Promise<ChangeSet> {
    const repository = await this.repositoriesService.getScanAccessMetadataForUser(
      input.userId,
      input.repositoryId
    );
    const baseCommitSha = input.baseCommitSha?.trim();
    const targetCommitSha = input.targetCommitSha?.trim();

    if (!baseCommitSha) {
      throw new ChangeSetComparisonUnavailableError("MISSING_BASE_COMMIT");
    }

    if (!targetCommitSha) {
      throw new ChangeSetComparisonUnavailableError("MISSING_TARGET_COMMIT");
    }

    if (baseCommitSha === targetCommitSha) {
      return createEmptyChangeSet(baseCommitSha);
    }

    const accessToken = await this.githubAccountService.getAccessTokenForUser(input.userId);
    const comparison = await this.repositoryCompareProvider.compare(
      {
        owner: repository.owner,
        name: repository.name,
        authorization: { bearerToken: accessToken }
      },
      baseCommitSha,
      targetCommitSha
    );

    return createChangeSet({
      baseCommitSha: comparison.baseCommitSha,
      targetCommitSha: comparison.targetCommitSha,
      comparisonStatus: comparison.comparisonStatus,
      aheadBy: comparison.aheadBy,
      behindBy: comparison.behindBy,
      files: comparison.files
    });
  }
}
