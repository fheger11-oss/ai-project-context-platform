import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppModule } from "../app/app.module.js";
import { AnalysisInputService } from "./application/analysis-input.service.js";
import { AnalysisPipelineService } from "./application/analysis-pipeline.service.js";
import { AnalysisResultAggregationService } from "./application/analysis-result-aggregation.service.js";
import { FileClassificationService } from "./application/file-classification.service.js";
import { ProjectDetectionService } from "./application/project-detection.service.js";
import { RelationshipAnalysisService } from "./application/relationship-analysis.service.js";
import { SourceStructureAnalysisService } from "./application/source-structure-analysis.service.js";
import { AnalysisModule } from "./analysis.module.js";
import { COMPLETED_SCAN_RESOLVER } from "./domain/contracts/completed-scan-resolver.contract.js";
import { SCAN_CONTENT_READER } from "./domain/contracts/scan-content-reader.contract.js";
import { SOURCE_PARSER } from "./domain/contracts/source-parser.contract.js";
import { PrismaScanContentReader } from "./infrastructure/prisma-scan-content.reader.js";
import { ScanRepositoryCompletedScanResolver } from "./infrastructure/scan-repository-completed-scan.resolver.js";
import { TypeScriptSourceParser } from "./infrastructure/typescript-source.parser.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ScanModule } from "../scan/scan.module.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_CONTROLLERS_METADATA = "controllers";
const MODULE_PROVIDERS_METADATA = "providers";

describe("AnalysisModule", () => {
  it("registers the Scan-to-Analysis boundary adapters without controllers", () => {
    expect(Reflect.getMetadata(MODULE_CONTROLLERS_METADATA, AnalysisModule) ?? []).toEqual([]);
    expect(Reflect.getMetadata(MODULE_IMPORTS_METADATA, AnalysisModule) ?? []).toEqual([
      PrismaModule,
      ScanModule
    ]);
    expect(Reflect.getMetadata(MODULE_PROVIDERS_METADATA, AnalysisModule) ?? []).toEqual([
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
    ]);
  });

  it("is registered with the application module", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as unknown[];

    expect(imports).toContain(AnalysisModule);
  });
});
