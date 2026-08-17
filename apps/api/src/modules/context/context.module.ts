import { Module } from "@nestjs/common";

import { DeterministicContextGenerator } from "./application/deterministic-context.generator.js";
import { GenerateAndPersistProjectContextService } from "./application/generate-and-persist-project-context.service.js";
import { GenerateProjectContextService } from "./application/generate-project-context.service.js";
import { PersistProjectContextService } from "./application/persist-project-context.service.js";
import { ReadContextInputService } from "./application/read-context-input.service.js";
import { ANALYSIS_CONTEXT_READER } from "./domain/contracts/analysis-context-reader.contract.js";
import { CONTEXT_GENERATOR } from "./domain/contracts/context-generator.contract.js";
import { PROJECT_CONTEXT_REPOSITORY } from "./domain/contracts/project-context-repository.contract.js";
import { AnalysisResultContextReader } from "./infrastructure/analysis-result-context.reader.js";
import { PrismaProjectContextRepository } from "./infrastructure/prisma-project-context.repository.js";
import { AnalysisModule } from "../analysis/analysis.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";

@Module({
  imports: [AnalysisModule, PrismaModule],
  providers: [
    GenerateAndPersistProjectContextService,
    GenerateProjectContextService,
    PersistProjectContextService,
    ReadContextInputService,
    {
      provide: ANALYSIS_CONTEXT_READER,
      useClass: AnalysisResultContextReader
    },
    {
      provide: CONTEXT_GENERATOR,
      useClass: DeterministicContextGenerator
    },
    {
      provide: PROJECT_CONTEXT_REPOSITORY,
      useClass: PrismaProjectContextRepository
    }
  ],
  exports: [
    GenerateAndPersistProjectContextService,
    GenerateProjectContextService,
    PersistProjectContextService,
    ReadContextInputService,
    ANALYSIS_CONTEXT_READER,
    CONTEXT_GENERATOR,
    PROJECT_CONTEXT_REPOSITORY
  ]
})
export class ContextModule {}
