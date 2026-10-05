import { Inject, Injectable } from "@nestjs/common";
import type { ArchitectureProcessingRequestModel } from "../../../generated/prisma/models.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureProcessingRequestRecord,
  ArchitectureProcessingRequestRepository,
  CreateArchitectureProcessingRequestInput,
  UpdateArchitectureProcessingRequestStatusInput
} from "../domain/contracts/architecture-processing-request-repository.contract.js";

@Injectable()
export class PrismaArchitectureProcessingRequestRepository implements ArchitectureProcessingRequestRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(
    input: CreateArchitectureProcessingRequestInput
  ): Promise<ArchitectureProcessingRequestRecord> {
    const stored = await this.prisma.architectureProcessingRequest.create({
      data: {
        repositoryId: input.repositoryId,
        projectContextId: input.projectContextId,
        processorVersion: input.processorVersion,
        ...(input.nextAttemptAt ? { nextAttemptAt: input.nextAttemptAt } : {})
      }
    });
    return toRecord(stored);
  }

  async findByRepositoryAndId(
    repositoryId: string,
    id: string
  ): Promise<ArchitectureProcessingRequestRecord | null> {
    const stored = await this.prisma.architectureProcessingRequest.findFirst({
      where: { id, repositoryId }
    });
    return stored ? toRecord(stored) : null;
  }

  async findByRepositoryContextAndProcessorVersion(
    repositoryId: string,
    projectContextId: string,
    processorVersion: string
  ): Promise<ArchitectureProcessingRequestRecord | null> {
    const stored = await this.prisma.architectureProcessingRequest.findFirst({
      where: { repositoryId, projectContextId, processorVersion }
    });
    return stored ? toRecord(stored) : null;
  }

  async updateStatus(
    input: UpdateArchitectureProcessingRequestStatusInput
  ): Promise<ArchitectureProcessingRequestRecord | null> {
    const updated = await this.prisma.architectureProcessingRequest.updateMany({
      where: { id: input.id, repositoryId: input.repositoryId },
      data: {
        status: input.status,
        ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        ...(input.lastFailureCategory !== undefined
          ? { lastFailureCategory: input.lastFailureCategory }
          : {})
      }
    });
    if (updated.count !== 1) return null;
    return this.findByRepositoryAndId(input.repositoryId, input.id);
  }
}

function toRecord(stored: ArchitectureProcessingRequestModel): ArchitectureProcessingRequestRecord {
  return { ...stored };
}
