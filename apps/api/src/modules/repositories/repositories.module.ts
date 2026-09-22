import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { GitHubRepositoryHeadProvider } from "./providers/github-repository-head.provider.js";
import { GitHubRepositoryProvider } from "./providers/github-repository.provider.js";
import { RepositoriesController } from "./repositories.controller.js";
import { RepositoriesService } from "./repositories.service.js";
import { RepositoryStateService } from "./repository-state.service.js";

@Module({
  imports: [AuthModule, PrismaModule, UsageModule],
  controllers: [RepositoriesController],
  providers: [
    GitHubRepositoryHeadProvider,
    GitHubRepositoryProvider,
    RepositoriesService,
    RepositoryStateService
  ],
  exports: [RepositoriesService, RepositoryStateService]
})
export class RepositoriesModule {}
