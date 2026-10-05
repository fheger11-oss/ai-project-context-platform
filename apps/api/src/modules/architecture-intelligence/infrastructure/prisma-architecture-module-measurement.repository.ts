import { Inject, Injectable } from "@nestjs/common";
import type { ArchitectureModuleMeasurementModel } from "../../../generated/prisma/models.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureModuleMeasurementRecord,
  ArchitectureModuleMeasurementRepository,
  CreateArchitectureModuleMeasurementInput
} from "../domain/contracts/architecture-module-measurement-repository.contract.js";

@Injectable()
export class PrismaArchitectureModuleMeasurementRepository implements ArchitectureModuleMeasurementRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    input: CreateArchitectureModuleMeasurementInput
  ): Promise<ArchitectureModuleMeasurementRecord> {
    return toRecord(await this.prisma.architectureModuleMeasurement.create({ data: input }));
  }

  async listByRepositoryAndProcessingRequest(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureModuleMeasurementRecord[]> {
    const stored = await this.prisma.architectureModuleMeasurement.findMany({
      where: { repositoryId, processingRequestId },
      orderBy: [{ moduleId: "asc" }, { id: "asc" }]
    });
    return stored.map(toRecord);
  }

  async listByRepositoryAndProjectContext(
    repositoryId: string,
    projectContextId: string
  ): Promise<ArchitectureModuleMeasurementRecord[]> {
    const stored = await this.prisma.architectureModuleMeasurement.findMany({
      where: { repositoryId, projectContextId },
      orderBy: [{ moduleId: "asc" }, { id: "asc" }]
    });
    return stored.map(toRecord);
  }
}

function toRecord(stored: ArchitectureModuleMeasurementModel): ArchitectureModuleMeasurementRecord {
  return { ...stored };
}
