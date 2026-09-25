import { Module } from "@nestjs/common";

import { AnalysisModule } from "../analysis/analysis.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ChangeSetsModule } from "../change-sets/change-sets.module.js";
import { AppConfigModule } from "../config/app-config.module.js";
import { ContextModule } from "../context/context.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ScanModule } from "../scan/scan.module.js";
import { UsageModule } from "../usage/usage.module.js";
import { RunRepositoryUpdateService } from "./application/run-repository-update.service.js";
import { RepositoryIncrementalProcessorService } from "./application/repository-incremental.processor.js";
import { RepositoryProcessingStrategySelector } from "./application/repository-processing-strategy.selector.js";
import { RepositoryUpdateService } from "./application/repository-update.service.js";
import { RepositoryUpdateFinalizationService } from "./application/repository-update-finalization.service.js";
import { RepositoryUpdateRecoveryService } from "./application/repository-update-recovery.service.js";
import { RepositoryChangeTriggerService } from "./application/repository-change-trigger.service.js";
import { REPOSITORY_INCREMENTAL_PROCESSOR } from "./application/contracts/repository-incremental-processor.contract.js";
import { REPOSITORY_PROCESSING_RESULT_CONSUMER } from "./application/contracts/repository-processing-result-consumer.contract.js";
import { LoggingRepositoryProcessingResultConsumer } from "./application/logging-repository-processing-result.consumer.js";
import { REPOSITORY_PROCESSING_OBSERVATION_SINK } from "./application/contracts/repository-processing-observation-sink.contract.js";
import { LoggingRepositoryProcessingObservationSink } from "./application/logging-repository-processing-observation.sink.js";
import { RepositoryProcessingObservationMapper } from "./application/repository-processing-observation.mapper.js";
import { IncrementalAnalysisDecisionService } from "./application/incremental-analysis-decision.service.js";
import { IncrementalAnalysisExecutionService } from "./application/incremental-analysis-execution.service.js";
import { REPOSITORY_UPDATE_REPOSITORY } from "./domain/contracts/repository-update-repository.contract.js";
import { REPOSITORY_CHANGE_TRIGGER_REPOSITORY } from "./domain/contracts/repository-change-trigger-repository.contract.js";
import { PrismaRepositoryUpdateRepository } from "./infrastructure/prisma-repository-update.repository.js";
import { PrismaRepositoryChangeTriggerRepository } from "./infrastructure/prisma-repository-change-trigger.repository.js";
import { RepositoryUpdatesController } from "./presentation/repository-updates.controller.js";

@Module({
  imports: [
    AnalysisModule,
    AuthModule,
    ChangeSetsModule,
    AppConfigModule,
    ContextModule,
    PrismaModule,
    RepositoriesModule,
    ScanModule,
    UsageModule
  ],
  controllers: [RepositoryUpdatesController],
  providers: [
    RunRepositoryUpdateService,
    RepositoryProcessingStrategySelector,
    RepositoryProcessingObservationMapper,
    IncrementalAnalysisDecisionService,
    IncrementalAnalysisExecutionService,
    RepositoryUpdateService,
    RepositoryUpdateFinalizationService,
    RepositoryUpdateRecoveryService,
    RepositoryChangeTriggerService,
    {
      provide: REPOSITORY_INCREMENTAL_PROCESSOR,
      useClass: RepositoryIncrementalProcessorService
    },
    {
      provide: REPOSITORY_PROCESSING_RESULT_CONSUMER,
      useClass: LoggingRepositoryProcessingResultConsumer
    },
    {
      provide: REPOSITORY_PROCESSING_OBSERVATION_SINK,
      useClass: LoggingRepositoryProcessingObservationSink
    },
    {
      provide: REPOSITORY_UPDATE_REPOSITORY,
      useClass: PrismaRepositoryUpdateRepository
    },
    {
      provide: REPOSITORY_CHANGE_TRIGGER_REPOSITORY,
      useClass: PrismaRepositoryChangeTriggerRepository
    }
  ],
  exports: [
    RunRepositoryUpdateService,
    RepositoryUpdateService,
    RepositoryUpdateRecoveryService,
    RepositoryChangeTriggerService,
    REPOSITORY_UPDATE_REPOSITORY
  ]
})
export class RepositoryUpdatesModule {}
