import { describe, expect, it } from "vitest";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ArchitectureHistoryModule } from "./architecture-history.module.js";
import { GetArchitectureComparisonService } from "./application/get-architecture-comparison.service.js";
import { ListArchitectureHistoryService } from "./application/list-architecture-history.service.js";
import { ARCHITECTURE_HISTORY_READER } from "./domain/contracts/architecture-history-reader.contract.js";
import { PrismaArchitectureHistoryReader } from "./infrastructure/prisma-architecture-history.reader.js";
import { ArchitectureHistoryController } from "./presentation/architecture-history.controller.js";

describe("ArchitectureHistoryModule", () => {
  it("wires only the focused read-side architecture", () => {
    expect(Reflect.getMetadata("imports", ArchitectureHistoryModule)).toEqual([
      PrismaModule,
      RepositoriesModule
    ]);
    expect(Reflect.getMetadata("controllers", ArchitectureHistoryModule)).toEqual([
      ArchitectureHistoryController
    ]);
    expect(Reflect.getMetadata("providers", ArchitectureHistoryModule)).toEqual([
      ListArchitectureHistoryService,
      GetArchitectureComparisonService,
      { provide: ARCHITECTURE_HISTORY_READER, useClass: PrismaArchitectureHistoryReader }
    ]);
  });
});
