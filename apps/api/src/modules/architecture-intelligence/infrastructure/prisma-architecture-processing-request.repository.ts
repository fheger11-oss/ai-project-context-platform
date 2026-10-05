import { Inject, Injectable } from "@nestjs/common";
import type { ArchitectureProcessingRequestModel } from "../../../generated/prisma/models.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureProcessingRequestRecord,
  ArchitectureProcessingRequestRepository,
  CreateArchitectureProcessingRequestInput,
  FailArchitectureProcessingRequestInput,
  OwnedArchitectureProcessingRequestInput,
  RetryArchitectureProcessingRequestInput,
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

  async claim(
    workerId: string,
    now: Date,
    leaseUntil: Date
  ): Promise<ArchitectureProcessingRequestRecord | null> {
    for (let tries = 0; tries < 5; tries += 1) {
      const candidate = await this.prisma.architectureProcessingRequest.findFirst({
        where: eligibleAt(now),
        orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
        select: { id: true, repositoryId: true, startedAt: true }
      });
      if (!candidate) return null;

      const claimed = await this.prisma.architectureProcessingRequest.updateMany({
        where: {
          id: candidate.id,
          repositoryId: candidate.repositoryId,
          ...eligibleAt(now)
        },
        data: {
          status: "PROCESSING",
          claimedBy: workerId,
          leaseUntil,
          startedAt: candidate.startedAt ?? now,
          attemptCount: { increment: 1 }
        }
      });
      if (claimed.count === 1) {
        return this.findByRepositoryAndId(candidate.repositoryId, candidate.id);
      }
    }
    return null;
  }

  async renewLease(
    input: OwnedArchitectureProcessingRequestInput,
    leaseUntil: Date
  ): Promise<boolean> {
    return this.updateOwnedActive(input, { leaseUntil });
  }

  async complete(input: OwnedArchitectureProcessingRequestInput): Promise<boolean> {
    const completed = await this.updateOwnedActive(input, {
      status: "COMPLETED",
      completedAt: input.now,
      claimedBy: null,
      leaseUntil: null,
      lastFailureCategory: null
    });
    if (completed) return true;
    const current = await this.findByRepositoryAndId(input.repositoryId, input.id);
    return current?.status === "COMPLETED";
  }

  async retry(input: RetryArchitectureProcessingRequestInput): Promise<boolean> {
    return this.updateOwnedActive(input, {
      status: "PENDING",
      nextAttemptAt: input.nextAttemptAt,
      claimedBy: null,
      leaseUntil: null,
      lastFailureCategory: input.failureCategory
    });
  }

  async fail(input: FailArchitectureProcessingRequestInput): Promise<boolean> {
    return this.updateOwnedActive(input, {
      status: "FAILED",
      completedAt: input.now,
      claimedBy: null,
      leaseUntil: null,
      lastFailureCategory: input.failureCategory
    });
  }

  async markIncompatible(input: OwnedArchitectureProcessingRequestInput): Promise<boolean> {
    const incompatible = await this.updateOwnedActive(input, {
      status: "INCOMPATIBLE",
      completedAt: input.now,
      claimedBy: null,
      leaseUntil: null,
      lastFailureCategory: null
    });
    if (incompatible) return true;
    const current = await this.findByRepositoryAndId(input.repositoryId, input.id);
    return current?.status === "INCOMPATIBLE";
  }

  private async updateOwnedActive(
    input: OwnedArchitectureProcessingRequestInput,
    data: Parameters<PrismaService["architectureProcessingRequest"]["updateMany"]>[0]["data"]
  ): Promise<boolean> {
    const updated = await this.prisma.architectureProcessingRequest.updateMany({
      where: {
        id: input.id,
        repositoryId: input.repositoryId,
        status: "PROCESSING",
        claimedBy: input.workerId,
        leaseUntil: { gt: input.now }
      },
      data
    });
    return updated.count === 1;
  }
}

function eligibleAt(now: Date) {
  return {
    OR: [
      { status: "PENDING" as const, nextAttemptAt: { lte: now } },
      { status: "PROCESSING" as const, leaseUntil: { lt: now } }
    ]
  };
}

function toRecord(stored: ArchitectureProcessingRequestModel): ArchitectureProcessingRequestRecord {
  return { ...stored };
}
