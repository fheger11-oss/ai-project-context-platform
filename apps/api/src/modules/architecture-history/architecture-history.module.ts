import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { GetArchitectureComparisonService } from "./application/get-architecture-comparison.service.js";
import { ListArchitectureHistoryService } from "./application/list-architecture-history.service.js";
import { ARCHITECTURE_HISTORY_READER } from "./domain/contracts/architecture-history-reader.contract.js";
import { PrismaArchitectureHistoryReader } from "./infrastructure/prisma-architecture-history.reader.js";
import { ArchitectureHistoryController } from "./presentation/architecture-history.controller.js";

@Module({
  imports: [PrismaModule, RepositoriesModule],
  controllers: [ArchitectureHistoryController],
  providers: [
    ListArchitectureHistoryService,
    GetArchitectureComparisonService,
    { provide: ARCHITECTURE_HISTORY_READER, useClass: PrismaArchitectureHistoryReader }
  ]
})
export class ArchitectureHistoryModule {}
