import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ChangeSetService } from "./application/change-set.service.js";
import { REPOSITORY_COMPARE_PROVIDER } from "./domain/contracts/repository-compare-provider.contract.js";
import { GitHubRepositoryCompareProvider } from "./infrastructure/github-repository-compare.provider.js";

@Module({
  imports: [AuthModule, RepositoriesModule],
  providers: [
    ChangeSetService,
    {
      provide: REPOSITORY_COMPARE_PROVIDER,
      useClass: GitHubRepositoryCompareProvider
    }
  ],
  exports: [ChangeSetService]
})
export class ChangeSetsModule {}
