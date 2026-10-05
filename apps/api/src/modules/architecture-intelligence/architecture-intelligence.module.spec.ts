import { describe, expect, it } from "vitest";

import { PrismaModule } from "../prisma/prisma.module.js";
import { ArchitectureIntelligenceModule } from "./architecture-intelligence.module.js";
import { ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY } from "./domain/contracts/architecture-finding-occurrence-repository.contract.js";
import { ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY } from "./domain/contracts/architecture-module-measurement-repository.contract.js";
import { ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY } from "./domain/contracts/architecture-processing-request-repository.contract.js";
import { PrismaArchitectureFindingOccurrenceRepository } from "./infrastructure/prisma-architecture-finding-occurrence.repository.js";
import { PrismaArchitectureModuleMeasurementRepository } from "./infrastructure/prisma-architecture-module-measurement.repository.js";
import { PrismaArchitectureProcessingRequestRepository } from "./infrastructure/prisma-architecture-processing-request.repository.js";

describe("ArchitectureIntelligenceModule", () => {
  it("wires only the three Sprint 1 persistence repositories", () => {
    const providers = Reflect.getMetadata("providers", ArchitectureIntelligenceModule);
    expect(Reflect.getMetadata("imports", ArchitectureIntelligenceModule)).toEqual([PrismaModule]);
    expect(providers).toEqual([
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
      ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY,
      ARCHITECTURE_FINDING_OCCURRENCE_REPOSITORY,
      ARCHITECTURE_MODULE_MEASUREMENT_REPOSITORY
    ]);
    expect(Reflect.getMetadata("controllers", ArchitectureIntelligenceModule)).toBeUndefined();
  });
});
