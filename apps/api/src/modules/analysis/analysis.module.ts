import { Module } from "@nestjs/common";

import { AnalysisInputService } from "./application/analysis-input.service.js";
import { AnalysisPipelineService } from "./application/analysis-pipeline.service.js";
import { AnalysisResultAggregationService } from "./application/analysis-result-aggregation.service.js";
import { FileClassificationService } from "./application/file-classification.service.js";
import { GetAnalysisHistoryService } from "./application/get-analysis-history.service.js";
import { GetAnalysisResultService } from "./application/get-analysis-result.service.js";
import { PersistAnalysisResultService } from "./application/persist-analysis-result.service.js";
import { ProjectDetectionService } from "./application/project-detection.service.js";
import { RelationshipAnalysisService } from "./application/relationship-analysis.service.js";
import { RunAnalysisService } from "./application/run-analysis.service.js";
import { SourceStructureAnalysisService } from "./application/source-structure-analysis.service.js";
import { ANALYSIS_REPOSITORY } from "./domain/contracts/analysis-repository.contract.js";
import { COMPLETED_SCAN_RESOLVER } from "./domain/contracts/completed-scan-resolver.contract.js";
import { SCAN_CONTENT_READER } from "./domain/contracts/scan-content-reader.contract.js";
import { SOURCE_PARSER } from "./domain/contracts/source-parser.contract.js";
import { PrismaAnalysisRepository } from "./infrastructure/prisma-analysis.repository.js";
import { PrismaScanContentReader } from "./infrastructure/prisma-scan-content.reader.js";
import { AnalysisController } from "./presentation/analysis.controller.js";
import { ScanAnalysisHistoryController } from "./presentation/scan-analysis-history.controller.js";
import { ScanRepositoryCompletedScanResolver } from "./infrastructure/scan-repository-completed-scan.resolver.js";
import { TypeScriptSourceParser } from "./infrastructure/typescript-source.parser.js";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ScanModule } from "../scan/scan.module.js";

@Module({
  imports: [AuthModule, PrismaModule, ScanModule],
  controllers: [AnalysisController, ScanAnalysisHistoryController],
  providers: [
    AnalysisInputService,
    AnalysisPipelineService,
    AnalysisResultAggregationService,
    FileClassificationService,
    GetAnalysisHistoryService,
    GetAnalysisResultService,
    PersistAnalysisResultService,
    ProjectDetectionService,
    RelationshipAnalysisService,
    RunAnalysisService,
    SourceStructureAnalysisService,
    {
      provide: ANALYSIS_REPOSITORY,
      useClass: PrismaAnalysisRepository
    },
    {
      provide: COMPLETED_SCAN_RESOLVER,
      useClass: ScanRepositoryCompletedScanResolver
    },
    {
      provide: SCAN_CONTENT_READER,
      useClass: PrismaScanContentReader
    },
    {
      provide: SOURCE_PARSER,
      useClass: TypeScriptSourceParser
    }
  ],
  exports: [
    AnalysisInputService,
    AnalysisPipelineService,
    AnalysisResultAggregationService,
    FileClassificationService,
    GetAnalysisHistoryService,
    GetAnalysisResultService,
    PersistAnalysisResultService,
    ProjectDetectionService,
    RelationshipAnalysisService,
    RunAnalysisService,
    SourceStructureAnalysisService,
    SCAN_CONTENT_READER,
    ANALYSIS_REPOSITORY
  ]
})
export class AnalysisModule {}
