import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { AppConfigModule } from "../config/app-config.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { GitHubRepositoryHeadProvider } from "./providers/github-repository-head.provider.js";
import { GitHubRepositoryProvider } from "./providers/github-repository.provider.js";
import { RepositoriesController } from "./repositories.controller.js";
import { RepositoriesService } from "./repositories.service.js";
import { RepositoryStateService } from "./repository-state.service.js";
import { GitHubRepositoryWebhookProvider } from "./providers/github-repository-webhook.provider.js";
import { REPOSITORY_WEBHOOK_PROVIDER } from "./application/contracts/repository-webhook-provider.contract.js";
import { RepositoryWebhookProvisioningService } from "./application/repository-webhook-provisioning.service.js";

@Module({
  imports: [AppConfigModule, AuthModule, PrismaModule, UsageModule],
  controllers: [RepositoriesController],
  providers: [
    GitHubRepositoryHeadProvider,
    GitHubRepositoryProvider,
    GitHubRepositoryWebhookProvider,
    {
      provide: REPOSITORY_WEBHOOK_PROVIDER,
      useExisting: GitHubRepositoryWebhookProvider
    },
    RepositoryWebhookProvisioningService,
    RepositoriesService,
    RepositoryStateService
  ],
  exports: [RepositoriesService, RepositoryStateService]
})
export class RepositoriesModule {}
