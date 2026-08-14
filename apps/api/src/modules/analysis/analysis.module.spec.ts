import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppModule } from "../app/app.module.js";
import { AnalysisInputService } from "./application/analysis-input.service.js";
import { AnalysisModule } from "./analysis.module.js";
import { COMPLETED_SCAN_RESOLVER } from "./domain/contracts/completed-scan-resolver.contract.js";
import { SCAN_CONTENT_READER } from "./domain/contracts/scan-content-reader.contract.js";
import { PrismaScanContentReader } from "./infrastructure/prisma-scan-content.reader.js";
import { ScanRepositoryCompletedScanResolver } from "./infrastructure/scan-repository-completed-scan.resolver.js";
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
      {
        provide: COMPLETED_SCAN_RESOLVER,
        useClass: ScanRepositoryCompletedScanResolver
      },
      {
        provide: SCAN_CONTENT_READER,
        useClass: PrismaScanContentReader
      }
    ]);
  });

  it("is registered with the application module", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as unknown[];

    expect(imports).toContain(AnalysisModule);
  });
});
