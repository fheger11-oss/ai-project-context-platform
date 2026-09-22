import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { RepositoryFreshnessStatus } from "../../generated/prisma/enums.js";
import type { ProjectContextModel, RepositoryStateModel } from "../../generated/prisma/models.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RepositoriesService } from "./repositories.service.js";

export type RepositoryStateSnapshot = {
  id: string;
  repositoryId: string;
  remoteHeadCommitSha: string | null;
  remoteHeadCheckedAt: Date | null;
  lastScannedCommitSha: string | null;
  lastAnalyzedCommitSha: string | null;
  currentProjectContextId: string | null;
  currentContextCommitSha: string | null;
  freshnessStatus: RepositoryFreshnessStatus;
  lastUpdateStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RepositoryCurrentProjectContextSnapshot = {
  id: string;
  contextId: string;
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  contextVersion: string;
  generatedAt: Date;
  createdAt: Date;
};

export type RepositoryStateBackfillResult = {
  createdCount: number;
  skippedCount: number;
};

@Injectable()
export class RepositoryStateService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RepositoriesService) private readonly repositoriesService: RepositoriesService
  ) {}

  async getOrInitialize(repositoryId: string, userId: string): Promise<RepositoryStateSnapshot> {
    await this.repositoriesService.getScanAccessMetadataForUser(userId, repositoryId);

    return this.getOrCreateRepositoryState(repositoryId);
  }

  async getCurrentProjectContext(
    repositoryId: string,
    userId: string
  ): Promise<RepositoryCurrentProjectContextSnapshot> {
    const state = await this.getOrInitialize(repositoryId, userId);

    if (!state.currentProjectContextId) {
      throw new NotFoundException("Current ProjectContext was not found");
    }

    const context = await this.prisma.projectContext.findUnique({
      where: { id: state.currentProjectContextId }
    });

    if (!context || context.repositoryId !== repositoryId) {
      throw new NotFoundException("Current ProjectContext was not found");
    }

    return toCurrentProjectContextSnapshot(context);
  }

  async backfillMissingRepositoryStates(): Promise<RepositoryStateBackfillResult> {
    const repositoriesWithoutState = await this.prisma.repository.findMany({
      where: { state: null },
      select: { id: true }
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const repository of repositoriesWithoutState) {
      const created = await this.createRepositoryStateIfMissing(repository.id);

      if (created) {
        createdCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    return { createdCount, skippedCount };
  }

  private async getOrCreateRepositoryState(repositoryId: string): Promise<RepositoryStateSnapshot> {
    const existing = await this.findRepositoryState(repositoryId);

    if (existing) {
      return toRepositoryStateSnapshot(existing);
    }

    const created = await this.createRepositoryStateIfMissing(repositoryId);

    if (created) {
      return toRepositoryStateSnapshot(created);
    }

    const concurrentState = await this.findRepositoryState(repositoryId);

    if (concurrentState) {
      return toRepositoryStateSnapshot(concurrentState);
    }

    throw new Error(`RepositoryState for repository ${repositoryId} could not be initialized.`);
  }

  private async createRepositoryStateIfMissing(
    repositoryId: string
  ): Promise<RepositoryStateModel | null> {
    const existing = await this.findRepositoryState(repositoryId);

    if (existing) {
      return null;
    }

    const initialState = await this.deriveInitialState(repositoryId);

    try {
      return await this.prisma.repositoryState.create({
        data: {
          repositoryId,
          remoteHeadCommitSha: null,
          remoteHeadCheckedAt: null,
          lastScannedCommitSha: initialState.lastScannedCommitSha,
          lastAnalyzedCommitSha: initialState.lastAnalyzedCommitSha,
          currentProjectContextId: initialState.currentProjectContextId,
          currentContextCommitSha: initialState.currentContextCommitSha,
          freshnessStatus: RepositoryFreshnessStatus.UNKNOWN,
          lastUpdateStatus: null
        }
      });
    } catch (error) {
      const concurrentState = await this.findRepositoryState(repositoryId);

      if (concurrentState) {
        return null;
      }

      throw error;
    }
  }

  private async findRepositoryState(repositoryId: string): Promise<RepositoryStateModel | null> {
    return this.prisma.repositoryState.findUnique({
      where: { repositoryId }
    });
  }

  private async deriveInitialState(repositoryId: string) {
    const [latestCompletedScan, latestCompletedAnalysis, latestContext] = await Promise.all([
      this.prisma.scan.findFirst({
        where: {
          repositoryId,
          status: "COMPLETED"
        },
        orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: { commitSha: true }
      }),
      this.prisma.analysis.findFirst({
        where: {
          repositoryId,
          status: "COMPLETED",
          generatedAt: { not: null }
        },
        orderBy: [
          { generatedAt: "desc" },
          { completedAt: "desc" },
          { createdAt: "desc" },
          { id: "desc" }
        ],
        select: { commitSha: true }
      }),
      this.prisma.projectContext.findFirst({
        where: { repositoryId },
        orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          commitSha: true
        }
      })
    ]);

    return {
      lastScannedCommitSha: latestCompletedScan?.commitSha ?? null,
      lastAnalyzedCommitSha: latestCompletedAnalysis?.commitSha ?? null,
      currentProjectContextId: latestContext?.id ?? null,
      currentContextCommitSha: latestContext?.commitSha ?? null
    };
  }
}

function toRepositoryStateSnapshot(state: RepositoryStateModel): RepositoryStateSnapshot {
  return {
    id: state.id,
    repositoryId: state.repositoryId,
    remoteHeadCommitSha: state.remoteHeadCommitSha,
    remoteHeadCheckedAt: state.remoteHeadCheckedAt,
    lastScannedCommitSha: state.lastScannedCommitSha,
    lastAnalyzedCommitSha: state.lastAnalyzedCommitSha,
    currentProjectContextId: state.currentProjectContextId,
    currentContextCommitSha: state.currentContextCommitSha,
    freshnessStatus: state.freshnessStatus,
    lastUpdateStatus: state.lastUpdateStatus,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  };
}

function toCurrentProjectContextSnapshot(
  context: ProjectContextModel
): RepositoryCurrentProjectContextSnapshot {
  return {
    id: context.id,
    contextId: context.contextId,
    analysisId: context.analysisId,
    scanId: context.scanId,
    repositoryId: context.repositoryId,
    commitSha: context.commitSha,
    contextVersion: context.contextVersion,
    generatedAt: context.generatedAt,
    createdAt: context.createdAt
  };
}
