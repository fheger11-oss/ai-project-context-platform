import { Module } from "@nestjs/common";

import { AnalysisInputService } from "./application/analysis-input.service.js";
import { AnalysisPipelineService } from "./application/analysis-pipeline.service.js";
import { AnalysisResultAggregationService } from "./application/analysis-result-aggregation.service.js";
import { FileClassificationService } from "./application/file-classification.service.js";
import { ProjectDetectionService } from "./application/project-detection.service.js";
import { RelationshipAnalysisService } from "./application/relationship-analysis.service.js";
import { SourceStructureAnalysisService } from "./application/source-structure-analysis.service.js";
import { COMPLETED_SCAN_RESOLVER } from "./domain/contracts/completed-scan-resolver.contract.js";
import { SCAN_CONTENT_READER } from "./domain/contracts/scan-content-reader.contract.js";
import { SOURCE_PARSER } from "./domain/contracts/source-parser.contract.js";
import { PrismaScanContentReader } from "./infrastructure/prisma-scan-content.reader.js";
import { ScanRepositoryCompletedScanResolver } from "./infrastructure/scan-repository-completed-scan.resolver.js";
import { TypeScriptSourceParser } from "./infrastructure/typescript-source.parser.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ScanModule } from "../scan/scan.module.js";

@Module({
  imports: [PrismaModule, ScanModule],
  providers: [
    AnalysisInputService,
    AnalysisPipelineService,
    AnalysisResultAggregationService,
    FileClassificationService,
    ProjectDetectionService,
    RelationshipAnalysisService,
    SourceStructureAnalysisService,
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
    ProjectDetectionService,
    RelationshipAnalysisService,
    SourceStructureAnalysisService,
    SCAN_CONTENT_READER
  ]
})
export class AnalysisModule {}
