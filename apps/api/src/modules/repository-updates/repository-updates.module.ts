import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { RepositoryUpdateService } from "./application/repository-update.service.js";
import { REPOSITORY_UPDATE_REPOSITORY } from "./domain/contracts/repository-update-repository.contract.js";
import { PrismaRepositoryUpdateRepository } from "./infrastructure/prisma-repository-update.repository.js";

@Module({
  imports: [PrismaModule, RepositoriesModule, UsageModule],
  providers: [
    RepositoryUpdateService,
    {
      provide: REPOSITORY_UPDATE_REPOSITORY,
      useClass: PrismaRepositoryUpdateRepository
    }
  ],
  exports: [RepositoryUpdateService, REPOSITORY_UPDATE_REPOSITORY]
})
export class RepositoryUpdatesModule {}
