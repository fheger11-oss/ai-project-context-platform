import { Module } from "@nestjs/common";

import { AppConfigModule } from "../config/app-config.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR } from "./application/architecture-processing-request-processor.contract.js";
import { ArchitectureProcessingWorker } from "./application/architecture-processing.worker.js";
import { PlaceholderArchitectureProcessingService } from "./application/placeholder-architecture-processing.service.js";
import { ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY } from "./domain/contracts/architecture-finding-occurrence-repository.contract.js";
import { ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY } from "./domain/contracts/architecture-module-measurement-repository.contract.js";
import { ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY } from "./domain/contracts/architecture-processing-request-repository.contract.js";
import { PrismaArchitectureFindingOccurrenceRepository } from "./infrastructure/prisma-architecture-finding-occurrence.repository.js";
import { PrismaArchitectureModuleMeasurementRepository } from "./infrastructure/prisma-architecture-module-measurement.repository.js";
import { PrismaArchitectureProcessingRequestRepository } from "./infrastructure/prisma-architecture-processing-request.repository.js";

@Module({
  imports: [AppConfigModule, PrismaModule],
  providers: [
    ArchitectureProcessingWorker,
    {
      provide: ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR,
      useClass: PlaceholderArchitectureProcessingService
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
  ],
  exports: [
    ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY,
    ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY,
    ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY
  ]
})
export class ArchitectureIntelligenceModule {}
