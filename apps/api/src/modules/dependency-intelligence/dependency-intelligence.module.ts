import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { GetDependencyHistoryComparisonService } from "./application/get-dependency-history-comparison.service.js";
import { GetDependencyIntelligenceReadService } from "./application/get-dependency-intelligence-read.service.js";
import { DEPENDENCY_HISTORY_READER } from "./domain/contracts/dependency-history-reader.contract.js";
import { DEPENDENCY_SNAPSHOT_READER } from "./domain/contracts/dependency-snapshot-reader.contract.js";
import { PrismaDependencyHistoryReader } from "./infrastructure/prisma-dependency-history.reader.js";
import { PrismaDependencySnapshotReader } from "./infrastructure/prisma-dependency-snapshot.reader.js";
import { DependencyIntelligenceController } from "./presentation/dependency-intelligence.controller.js";

@Module({
  imports: [PrismaModule, RepositoriesModule],
  controllers: [DependencyIntelligenceController],
  providers: [
    GetDependencyHistoryComparisonService,
    GetDependencyIntelligenceReadService,
    {
      provide: DEPENDENCY_SNAPSHOT_READER,
      useClass: PrismaDependencySnapshotReader
    },
    {
      provide: DEPENDENCY_HISTORY_READER,
      useClass: PrismaDependencyHistoryReader
    }
  ],
  exports: [GetDependencyHistoryComparisonService, DEPENDENCY_SNAPSHOT_READER]
})
export class DependencyIntelligenceModule {}
