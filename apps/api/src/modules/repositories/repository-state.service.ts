import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { RepositoryFreshnessStatus } from "../../generated/prisma/enums.js";
import type { ProjectContextModel, RepositoryStateModel } from "../../generated/prisma/models.js";
import { GitHubAccountService } from "../auth/providers/github-account.service.js";
import type { PersistedProjectContext } from "../context/domain/contracts/project-context-repository.contract.js";
import { InvalidPersistedProjectContextError } from "../context/domain/errors/invalid-persisted-project-context.error.js";
import { ProjectContext, type ProjectContextSnapshot } from "../context/domain/project-context.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { GitHubRepositoryHeadProvider } from "./providers/github-repository-head.provider.js";
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

export type RepositoryStateBackfillResult = {
  createdCount: number;
  skippedCount: number;
};

export type MarkRepositoryCurrentContextInput = {
  repositoryId: string;
  userId: string;
  projectContextId: string;
  commitSha: string;
};

export type MarkRepositoryRemoteHeadObservedInput = {
  repositoryId: string;
  userId: string;
  remoteHeadCommitSha: string;
  remoteHeadCheckedAt?: Date;
};

@Injectable()
export class RepositoryStateService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RepositoriesService) private readonly repositoriesService: RepositoriesService,
    @Inject(GitHubAccountService)
    private readonly githubAccountService: GitHubAccountService,
    @Inject(GitHubRepositoryHeadProvider)
    private readonly repositoryHeadProvider: GitHubRepositoryHeadProvider
  ) {}

  async getOrInitialize(repositoryId: string, userId: string): Promise<RepositoryStateSnapshot> {
    await this.repositoriesService.getScanAccessMetadataForUser(userId, repositoryId);

    const state = await this.getOrCreateRepositoryState(repositoryId);
    return this.withCanonicalFreshness(state);
  }

  async getCurrentProjectContext(
    repositoryId: string,
    userId: string
  ): Promise<PersistedProjectContext> {
    const state = await this.getOrInitialize(repositoryId, userId);

    if (!state.currentProjectContextId) {
      throw new NotFoundException("Current ProjectContext was not found");
    }

    const context = await this.findContextWithProvenance(state.currentProjectContextId);

    if (
      !context ||
      !hasValidCurrentContextProvenance(context, repositoryId, state.currentContextCommitSha)
    ) {
      throw new NotFoundException("Current ProjectContext was not found");
    }

    return toPersistedProjectContext(context);
  }

  async refreshRemoteHead(repositoryId: string, userId: string): Promise<RepositoryStateSnapshot> {
    const repository = await this.repositoriesService.getScanAccessMetadataForUser(
      userId,
      repositoryId
    );
    const state = await this.getOrCreateRepositoryState(repositoryId);
    const currentContextProvenanceValid = await this.hasValidCurrentContext(state);
    const accessToken = await this.githubAccountService.getAccessTokenForUser(userId);

    try {
      const remoteHead = await this.repositoryHeadProvider.resolveHead({
        accessToken,
        owner: repository.owner,
        name: repository.name,
        reference: repository.defaultBranch
      });
      const updated = await this.prisma.repositoryState.update({
        where: { repositoryId },
        data: {
          remoteHeadCommitSha: remoteHead.commitSha,
          remoteHeadCheckedAt: new Date(),
          freshnessStatus: deriveRepositoryFreshnessStatus({
            remoteHeadCommitSha: remoteHead.commitSha,
            currentContextCommitSha: state.currentContextCommitSha,
            currentContextProvenanceValid,
            remoteHeadObservationValid: true
          })
        }
      });

      return toRepositoryStateSnapshot(updated);
    } catch (error) {
      await this.prisma.repositoryState.update({
        where: { repositoryId },
        data: {
          remoteHeadCheckedAt: null,
          freshnessStatus: RepositoryFreshnessStatus.UNKNOWN
        }
      });

      throw error;
    }
  }

  async markRemoteHeadObserved(
    input: MarkRepositoryRemoteHeadObservedInput
  ): Promise<RepositoryStateSnapshot> {
    await this.repositoriesService.getScanAccessMetadataForUser(input.userId, input.repositoryId);
    const state = await this.getOrCreateRepositoryState(input.repositoryId);
    const currentContextProvenanceValid = await this.hasValidCurrentContext(state);
    const remoteHeadCheckedAt = input.remoteHeadCheckedAt ?? new Date();

    const updated = await this.prisma.repositoryState.update({
      where: { repositoryId: input.repositoryId },
      data: {
        remoteHeadCommitSha: input.remoteHeadCommitSha,
        remoteHeadCheckedAt,
        freshnessStatus: deriveRepositoryFreshnessStatus({
          remoteHeadCommitSha: input.remoteHeadCommitSha,
          currentContextCommitSha: state.currentContextCommitSha,
          currentContextProvenanceValid,
          remoteHeadObservationValid: true
        })
      }
    });

    return toRepositoryStateSnapshot(updated);
  }

  async markCurrentProjectContext(
    input: MarkRepositoryCurrentContextInput
  ): Promise<RepositoryStateSnapshot> {
    await this.repositoriesService.getScanAccessMetadataForUser(input.userId, input.repositoryId);
    const state = await this.getOrCreateRepositoryState(input.repositoryId);
    const context = await this.findContextWithProvenance(input.projectContextId);
    if (
      !context ||
      !hasValidCurrentContextProvenance(context, input.repositoryId, input.commitSha)
    ) {
      throw new InvalidPersistedProjectContextError(
        input.projectContextId,
        "promotion provenance does not match the repository and commit."
      );
    }

    await this.ensureRepositoryContextHistory(
      input.repositoryId,
      input.projectContextId,
      input.commitSha
    );
    const updated = await this.prisma.repositoryState.update({
      where: { repositoryId: input.repositoryId },
      data: {
        lastScannedCommitSha: input.commitSha,
        lastAnalyzedCommitSha: input.commitSha,
        currentProjectContextId: input.projectContextId,
        currentContextCommitSha: input.commitSha,
        freshnessStatus: deriveRepositoryFreshnessStatus({
          remoteHeadCommitSha: state.remoteHeadCommitSha,
          currentContextCommitSha: input.commitSha,
          currentContextProvenanceValid: true,
          remoteHeadObservationValid: state.remoteHeadCheckedAt !== null
        })
      }
    });

    return toRepositoryStateSnapshot(updated);
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
      if (initialState.currentProjectContextId && initialState.currentContextCommitSha) {
        await this.ensureRepositoryContextHistory(
          repositoryId,
          initialState.currentProjectContextId,
          initialState.currentContextCommitSha
        );
      }
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

  private async withCanonicalFreshness(
    state: RepositoryStateSnapshot
  ): Promise<RepositoryStateSnapshot> {
    const currentContextProvenanceValid = await this.hasValidCurrentContext(state);
    return {
      ...state,
      freshnessStatus: deriveRepositoryFreshnessStatus({
        remoteHeadCommitSha: state.remoteHeadCommitSha,
        currentContextCommitSha: state.currentContextCommitSha,
        currentContextProvenanceValid,
        remoteHeadObservationValid: state.remoteHeadCheckedAt !== null
      })
    };
  }

  private async hasValidCurrentContext(state: RepositoryStateSnapshot): Promise<boolean> {
    if (!state.currentProjectContextId || !state.currentContextCommitSha) return false;
    const context = await this.findContextWithProvenance(state.currentProjectContextId);
    return Boolean(
      context &&
      hasValidCurrentContextProvenance(context, state.repositoryId, state.currentContextCommitSha)
    );
  }

  private findContextWithProvenance(projectContextId: string) {
    return this.prisma.projectContext.findUnique({
      where: { id: projectContextId },
      include: {
        scan: {
          select: { id: true, repositoryId: true, commitSha: true, status: true }
        },
        analysis: {
          select: {
            id: true,
            scanId: true,
            repositoryId: true,
            commitSha: true,
            status: true
          }
        }
      }
    });
  }

  private async ensureRepositoryContextHistory(
    repositoryId: string,
    projectContextId: string,
    commitSha: string
  ): Promise<void> {
    await this.prisma.repositoryContextHistory.upsert({
      where: {
        repositoryId_projectContextId: {
          repositoryId,
          projectContextId
        }
      },
      update: {},
      create: {
        repositoryId,
        projectContextId,
        commitSha
      }
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

export function deriveRepositoryFreshnessStatus(input: {
  currentContextCommitSha: string | null;
  remoteHeadCommitSha: string | null;
  currentContextProvenanceValid?: boolean;
  remoteHeadObservationValid?: boolean;
}): RepositoryFreshnessStatus {
  if (
    !input.remoteHeadCommitSha ||
    !input.currentContextCommitSha ||
    input.currentContextProvenanceValid === false ||
    input.remoteHeadObservationValid === false
  ) {
    return RepositoryFreshnessStatus.UNKNOWN;
  }

  return input.remoteHeadCommitSha === input.currentContextCommitSha
    ? RepositoryFreshnessStatus.FRESH
    : RepositoryFreshnessStatus.STALE;
}

export type CurrentContextProvenance = {
  id: string;
  repositoryId: string;
  commitSha: string;
  scanId: string;
  analysisId: string;
  scan: {
    id: string;
    repositoryId: string;
    commitSha: string;
    status: string;
  };
  analysis: {
    id: string;
    scanId: string;
    repositoryId: string;
    commitSha: string;
    status: string;
  };
};

export function hasValidCurrentContextProvenance(
  context: CurrentContextProvenance | null,
  repositoryId: string,
  commitSha: string | null
): boolean {
  return Boolean(
    commitSha &&
    context &&
    context.repositoryId === repositoryId &&
    context.commitSha === commitSha &&
    context.scanId === context.scan.id &&
    context.analysisId === context.analysis.id &&
    context.analysis.scanId === context.scan.id &&
    context.scan.repositoryId === repositoryId &&
    context.analysis.repositoryId === repositoryId &&
    context.scan.commitSha === commitSha &&
    context.analysis.commitSha === commitSha &&
    context.scan.status === "COMPLETED" &&
    context.analysis.status === "COMPLETED"
  );
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

function toPersistedProjectContext(context: ProjectContextModel): PersistedProjectContext {
  const snapshot = deserializeSnapshot(context.id, context.snapshot);
  assertSnapshotMatchesStoredMetadata(context, snapshot);

  return {
    id: context.id,
    contextId: context.contextId,
    analysisId: context.analysisId,
    scanId: context.scanId,
    repositoryId: context.repositoryId,
    commitSha: context.commitSha,
    contextVersion: context.contextVersion,
    generatedAt: context.generatedAt,
    createdAt: context.createdAt,
    context: ProjectContext.fromSnapshot(snapshot)
  };
}

type SerializedProjectContextSnapshot = Omit<ProjectContextSnapshot, "generatedAt"> & {
  generatedAt: string;
};

function deserializeSnapshot(recordId: string, value: unknown): ProjectContextSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidPersistedProjectContextError(recordId, "snapshot must be an object.");
  }

  const snapshot = value as SerializedProjectContextSnapshot;

  if (typeof snapshot.generatedAt !== "string") {
    throw new InvalidPersistedProjectContextError(
      recordId,
      "snapshot.generatedAt must be a string."
    );
  }

  const generatedAt = new Date(snapshot.generatedAt);

  if (Number.isNaN(generatedAt.getTime())) {
    throw new InvalidPersistedProjectContextError(recordId, "snapshot.generatedAt is invalid.");
  }

  return {
    ...snapshot,
    generatedAt
  };
}

function assertSnapshotMatchesStoredMetadata(
  context: ProjectContextModel,
  snapshot: ProjectContextSnapshot
): void {
  const comparisons = [
    ["contextId", context.contextId, snapshot.contextId],
    ["analysisId", context.analysisId, snapshot.analysisId],
    ["scanId", context.scanId, snapshot.scanId],
    ["repositoryId", context.repositoryId, snapshot.repositoryId],
    ["commitSha", context.commitSha, snapshot.commitSha],
    ["contextVersion", context.contextVersion, snapshot.contextVersion],
    ["generatedAt", context.generatedAt.toISOString(), snapshot.generatedAt.toISOString()]
  ] as const;

  for (const [field, storedValue, snapshotValue] of comparisons) {
    if (storedValue !== snapshotValue) {
      throw new InvalidPersistedProjectContextError(
        context.id,
        `${field} does not match persisted metadata.`
      );
    }
  }
}
