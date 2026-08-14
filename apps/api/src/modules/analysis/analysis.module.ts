import { Module } from "@nestjs/common";

import { AnalysisInputService } from "./application/analysis-input.service.js";
import { COMPLETED_SCAN_RESOLVER } from "./domain/contracts/completed-scan-resolver.contract.js";
import { SCAN_CONTENT_READER } from "./domain/contracts/scan-content-reader.contract.js";
import { PrismaScanContentReader } from "./infrastructure/prisma-scan-content.reader.js";
import { ScanRepositoryCompletedScanResolver } from "./infrastructure/scan-repository-completed-scan.resolver.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ScanModule } from "../scan/scan.module.js";

@Module({
  imports: [PrismaModule, ScanModule],
  providers: [
    AnalysisInputService,
    {
      provide: COMPLETED_SCAN_RESOLVER,
      useClass: ScanRepositoryCompletedScanResolver
    },
    {
      provide: SCAN_CONTENT_READER,
      useClass: PrismaScanContentReader
    }
  ],
  exports: [AnalysisInputService, SCAN_CONTENT_READER]
})
export class AnalysisModule {}
