import { Inject, Injectable } from "@nestjs/common";

import { RepositoryUpdateStatus } from "../../../generated/prisma/enums.js";
import type { RepositoryUpdateModel } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreatePendingRepositoryUpdateInput,
  MarkRepositoryUpdateCompletedInput,
  MarkRepositoryUpdateFailedInput,
  MarkRepositoryUpdateRunningInput,
  RepositoryUpdateHistoryQuery,
  RepositoryUpdateHistoryResult,
  RepositoryUpdateRepository,
  RepositoryUpdateSnapshot,
  RecoverStaleRepositoryUpdateInput,
  UpdateRepositoryUpdateArtifactsInput
} from "../domain/contracts/repository-update-repository.contract.js";

@Injectable()
export class PrismaRepositoryUpdateRepository implements RepositoryUpdateRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createPending(
    input: CreatePendingRepositoryUpdateInput
  ): Promise<RepositoryUpdateSnapshot> {
    const update = await this.prisma.repositoryUpdate.create({
      data: {
        repositoryId: input.repositoryId,
        triggerType: input.triggerType,
        targetCommitSha: input.targetCommitSha,
        baseCommitSha: input.baseCommitSha ?? null,
        status: RepositoryUpdateStatus.PENDING
      }
    });

    return toRepositoryUpdateSnapshot(update);
  }

  async findById(updateId: string): Promise<RepositoryUpdateSnapshot | null> {
    const update = await this.prisma.repositoryUpdate.findUnique({
      where: { id: updateId }
    });

    return update ? toRepositoryUpdateSnapshot(update) : null;
  }

  async findByRepositoryAndId(
    repositoryId: string,
    updateId: string
  ): Promise<RepositoryUpdateSnapshot | null> {
    const update = await this.prisma.repositoryUpdate.findFirst({
      where: {
        id: updateId,
        repositoryId
      }
    });

    return update ? toRepositoryUpdateSnapshot(update) : null;
  }

  async findCurrentByRepository(repositoryId: string): Promise<RepositoryUpdateSnapshot | null> {
    const update = await this.prisma.repositoryUpdate.findFirst({
      where: {
        repositoryId,
        status: { in: [RepositoryUpdateStatus.PENDING, RepositoryUpdateStatus.RUNNING] }
      },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
    });

    return update ? toRepositoryUpdateSnapshot(update) : null;
  }

  async listByRepository(
    query: RepositoryUpdateHistoryQuery
  ): Promise<RepositoryUpdateHistoryResult> {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.repositoryUpdate.findMany({
        where: { repositoryId: query.repositoryId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: query.pageSize
      }),
      this.prisma.repositoryUpdate.count({
        where: { repositoryId: query.repositoryId }
      })
    ]);

    return {
      items: items.map(toRepositoryUpdateSnapshot),
      total
    };
  }

  async markRunning(
    input: MarkRepositoryUpdateRunningInput
  ): Promise<RepositoryUpdateSnapshot | null> {
    const updated = await this.prisma.repositoryUpdate.updateMany({
      where: {
        id: input.updateId,
        status: RepositoryUpdateStatus.PENDING
      },
      data: {
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: input.startedAt
      }
    });

    if (updated.count !== 1) {
      return null;
    }

    return this.findById(input.updateId);
  }

  async markCompleted(
    input: MarkRepositoryUpdateCompletedInput
  ): Promise<RepositoryUpdateSnapshot | null> {
    const updated = await this.prisma.repositoryUpdate.updateMany({
      where: {
        id: input.updateId,
        status: RepositoryUpdateStatus.RUNNING
      },
      data: {
        status: RepositoryUpdateStatus.COMPLETED,
        completedAt: input.completedAt,
        failedAt: null,
        failureReason: null
      }
    });

    if (updated.count !== 1) {
      return null;
    }

    return this.findById(input.updateId);
  }

  async markFailed(
    input: MarkRepositoryUpdateFailedInput
  ): Promise<RepositoryUpdateSnapshot | null> {
    const updated = await this.prisma.repositoryUpdate.updateMany({
      where: {
        id: input.updateId,
        status: RepositoryUpdateStatus.RUNNING
      },
      data: {
        status: RepositoryUpdateStatus.FAILED,
        failedAt: input.failedAt,
        failureReason: input.failureReason
      }
    });

    if (updated.count !== 1) {
      return null;
    }

    return this.findById(input.updateId);
  }

  async recoverStaleRunning(
    input: RecoverStaleRepositoryUpdateInput
  ): Promise<RepositoryUpdateSnapshot | null> {
    const updated = await this.prisma.repositoryUpdate.updateMany({
      where: {
        id: input.updateId,
        repositoryId: input.repositoryId,
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: { lte: input.staleBeforeOrAt }
      },
      data: {
        status: RepositoryUpdateStatus.FAILED,
        failedAt: input.failedAt,
        failureReason: input.failureReason
      }
    });

    if (updated.count !== 1) return null;
    return this.findById(input.updateId);
  }

  async updateArtifacts(
    input: UpdateRepositoryUpdateArtifactsInput
  ): Promise<RepositoryUpdateSnapshot | null> {
    const update = await this.prisma.repositoryUpdate.update({
      where: { id: input.updateId },
      data: {
        ...(input.scanId !== undefined ? { scanId: input.scanId } : {}),
        ...(input.analysisId !== undefined ? { analysisId: input.analysisId } : {}),
        ...(input.projectContextId !== undefined
          ? { projectContextId: input.projectContextId }
          : {})
      }
    });

    return toRepositoryUpdateSnapshot(update);
  }
}

function toRepositoryUpdateSnapshot(update: RepositoryUpdateModel): RepositoryUpdateSnapshot {
  return {
    id: update.id,
    repositoryId: update.repositoryId,
    triggerType: update.triggerType,
    baseCommitSha: update.baseCommitSha,
    targetCommitSha: update.targetCommitSha,
    status: update.status,
    startedAt: update.startedAt,
    completedAt: update.completedAt,
    failedAt: update.failedAt,
    failureReason: update.failureReason,
    scanId: update.scanId,
    analysisId: update.analysisId,
    projectContextId: update.projectContextId,
    changeSet: update.changeSet,
    createdAt: update.createdAt,
    updatedAt: update.updatedAt
  };
}
