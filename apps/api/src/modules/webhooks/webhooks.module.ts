import { Module } from "@nestjs/common";

import { AppConfigModule } from "../config/app-config.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoryUpdatesModule } from "../repository-updates/repository-updates.module.js";
import { GitHubWebhookController } from "./github-webhook.controller.js";
import { GitHubWebhookDispatchRepository } from "./github-webhook-dispatch.repository.js";
import { GitHubWebhookSignatureService } from "./github-webhook-signature.service.js";
import { GitHubWebhookService } from "./github-webhook.service.js";
import { RepositoryUpdateDispatchRepository } from "./repository-update-dispatch.repository.js";
import { RepositoryUpdateDispatchWorker } from "./repository-update-dispatch.worker.js";

@Module({
  imports: [AppConfigModule, PrismaModule, RepositoryUpdatesModule],
  controllers: [GitHubWebhookController],
  providers: [
    GitHubWebhookSignatureService,
    GitHubWebhookDispatchRepository,
    GitHubWebhookService,
    RepositoryUpdateDispatchRepository,
    RepositoryUpdateDispatchWorker
  ]
})
export class WebhooksModule {}
