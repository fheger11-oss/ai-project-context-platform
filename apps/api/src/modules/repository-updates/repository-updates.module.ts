import { Module } from "@nestjs/common";

import { AnalysisModule } from "../analysis/analysis.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ChangeSetsModule } from "../change-sets/change-sets.module.js";
import { ContextModule } from "../context/context.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ScanModule } from "../scan/scan.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { RunRepositoryUpdateService } from "./application/run-repository-update.service.js";
import { RepositoryUpdateService } from "./application/repository-update.service.js";
import { REPOSITORY_UPDATE_REPOSITORY } from "./domain/contracts/repository-update-repository.contract.js";
import { PrismaRepositoryUpdateRepository } from "./infrastructure/prisma-repository-update.repository.js";
import { RepositoryUpdatesController } from "./presentation/repository-updates.controller.js";

@Module({
  imports: [
    AnalysisModule,
    AuthModule,
    ChangeSetsModule,
    ContextModule,
    PrismaModule,
    RepositoriesModule,
    ScanModule,
    UsageModule
  ],
  controllers: [RepositoryUpdatesController],
  providers: [
    RunRepositoryUpdateService,
    RepositoryUpdateService,
    {
      provide: REPOSITORY_UPDATE_REPOSITORY,
      useClass: PrismaRepositoryUpdateRepository
    }
  ],
  exports: [RunRepositoryUpdateService, RepositoryUpdateService, REPOSITORY_UPDATE_REPOSITORY]
})
export class RepositoryUpdatesModule {}
