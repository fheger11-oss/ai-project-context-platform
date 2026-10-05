import { describe, expect, it } from "vitest";

import { AppConfigModule } from "../config/app-config.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RepositoriesModule } from "../repositories/repositories.module.js";
import { ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR } from "./application/architecture-processing-request-processor.contract.js";
import { ArchitectureProcessingWorker } from "./application/architecture-processing.worker.js";
import { DeterministicArchitectureProcessingService } from "./application/deterministic-architecture-processing.service.js";
import { GetArchitectureHistoryComparisonService } from "./application/get-architecture-history-comparison.service.js";
import { GetCurrentArchitectureIntelligenceService } from "./application/get-current-architecture-intelligence.service.js";
import { ListArchitectureIntelligenceHistoryService } from "./application/list-architecture-intelligence-history.service.js";
import { ArchitectureIntelligenceModule } from "./architecture-intelligence.module.js";
import { ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY } from "./domain/contracts/architecture-finding-occurrence-repository.contract.js";
import { ARCHITECTURE_HISTORICAL_RESULT_READER } from "./domain/contracts/architecture-historical-result-reader.contract.js";
import { ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY } from "./domain/contracts/architecture-intelligence-read-repository.contract.js";
import { ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY } from "./domain/contracts/architecture-module-measurement-repository.contract.js";
import { ARCHITECTURE_PROCESSING_INPUT_READER } from "./domain/contracts/architecture-processing-input-reader.contract.js";
import { ARCHITECTURE_PROCESSING_OUTPUT_WRITER } from "./domain/contracts/architecture-processing-output-writer.contract.js";
import { ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY } from "./domain/contracts/architecture-processing-request-repository.contract.js";
import { PrismaArchitectureFindingOccurrenceRepository } from "./infrastructure/prisma-architecture-finding-occurrence.repository.js";
import { PrismaArchitectureHistoricalResultReader } from "./infrastructure/prisma-architecture-historical-result.reader.js";
import { PrismaArchitectureIntelligenceReadRepository } from "./infrastructure/prisma-architecture-intelligence-read.repository.js";
import { PrismaArchitectureModuleMeasurementRepository } from "./infrastructure/prisma-architecture-module-measurement.repository.js";
import { PrismaArchitectureProcessingInputReader } from "./infrastructure/prisma-architecture-processing-input.reader.js";
import { PrismaArchitectureProcessingOutputWriter } from "./infrastructure/prisma-architecture-processing-output.writer.js";
import { PrismaArchitectureProcessingRequestRepository } from "./infrastructure/prisma-architecture-processing-request.repository.js";
import { ArchitectureIntelligenceController } from "./presentation/architecture-intelligence.controller.js";

describe("ArchitectureIntelligenceModule", () => {
  it("wires the architecture-specific worker and persistence repositories", () => {
    const providers = Reflect.getMetadata("providers", ArchitectureIntelligenceModule);
    expect(Reflect.getMetadata("imports", ArchitectureIntelligenceModule)).toEqual([
      AppConfigModule,
      PrismaModule,
      RepositoriesModule
    ]);
    expect(providers).toEqual([
      ArchitectureProcessingWorker,
      GetArchitectureHistoryComparisonService,
      GetCurrentArchitectureIntelligenceService,
      ListArchitectureIntelligenceHistoryService,
      {
        provide: ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR,
        useClass: DeterministicArchitectureProcessingService
      },
      {
        provide: ARCHITECTURE_PROCESSING_INPUT_READER,
        useClass: PrismaArchitectureProcessingInputReader
      },
      {
        provide: ARCHITECTURE_PROCESSING_OUTPUT_WRITER,
        useClass: PrismaArchitectureProcessingOutputWriter
      },
      {
        provide: ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY,
        useClass: PrismaArchitectureIntelligenceReadRepository
      },
      {
        provide: ARCHITECTURE_HISTORICAL_RESULT_READER,
        useClass: PrismaArchitectureHistoricalResultReader
      },
      {
        provide: ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY,
        useClass: PrismaArchitectureProcessingRequestRepository
      },
      {
        provide: ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY,
        useClass: PrismaArchitectureFindingOccurrenceRepository
      },
      {
        provide: ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY,
        useClass: PrismaArchitectureModuleMeasurementRepository
      }
    ]);
    expect(Reflect.getMetadata("exports", ArchitectureIntelligenceModule)).toEqual([
      GetArchitectureHistoryComparisonService,
      ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY,
      ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY,
      ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY
    ]);
    expect(Reflect.getMetadata("controllers", ArchitectureIntelligenceModule)).toEqual([
      ArchitectureIntelligenceController
    ]);
  });
});
