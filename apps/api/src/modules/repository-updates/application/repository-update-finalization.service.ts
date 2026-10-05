import { Inject, Injectable } from "@nestjs/common";

import { RepositoryUpdateStatus } from "../../../generated/prisma/enums.js";
import type { RepositoryUpdateModel } from "../../../generated/prisma/models.js";
import { InvalidPersistedProjectContextError } from "../../context/domain/errors/invalid-persisted-project-context.error.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  deriveRepositoryFreshnessStatus,
  hasValidCurrentContextProvenance,
  toRepositoryStateSnapshot,
  type RepositoryStateSnapshot
} from "../../repositories/repository-state.service.js";
import type { RepositoryUpdateSnapshot } from "../domain/contracts/repository-update-repository.contract.js";
import { RepositoryUpdateInvalidTransitionError } from "../domain/errors/repository-update.errors.js";

export type FinalizeRepositoryUpdateInput = {
  repositoryId: string;
  userId: string;
  updateId: string;
  projectContextId: string;
  targetCommitSha: string;
  completedAt?: Date;
};

export type FinalizeRepositoryUpdateResult = {
  state: RepositoryStateSnapshot;
  update: RepositoryUpdateSnapshot;
};

@Injectable()
export class RepositoryUpdateFinalizationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RepositoriesService) private readonly repositoriesService: RepositoriesService
  ) {}

  async finalize(input: FinalizeRepositoryUpdateInput): Promise<FinalizeRepositoryUpdateResult> {
    await this.repositoriesService.getScanAccessMetadataForUser(input.userId, input.repositoryId);
    await this.validateFinalArtifacts(input);

    return this.prisma.$transaction(async (transaction) => {
      const update = await transaction.repositoryUpdate.findFirst({
        where: { id: input.updateId, repositoryId: input.repositoryId }
      });
      const state = await transaction.repositoryState.findUnique({
        where: { repositoryId: input.repositoryId }
      });
      const context = await transaction.projectContext.findUnique({
        where: { id: input.projectContextId },
        include: CONTEXT_PROVENANCE_INCLUDE
      });

      if (!update || update.status !== RepositoryUpdateStatus.RUNNING) {
        throw new RepositoryUpdateInvalidTransitionError({
          updateId: input.updateId,
          from: update?.status ?? RepositoryUpdateStatus.PENDING,
          to: RepositoryUpdateStatus.COMPLETED
        });
      }
      if (
        update.targetCommitSha !== input.targetCommitSha ||
        update.projectContextId !== input.projectContextId ||
        update.scanId !== context?.scanId ||
        update.analysisId !== context?.analysisId ||
        !context ||
        !hasValidCurrentContextProvenance(context, input.repositoryId, input.targetCommitSha)
      ) {
        throw new InvalidPersistedProjectContextError(
          input.projectContextId,
          "finalization provenance does not match the running update."
        );
      }
      if (!state) {
        throw new Error(`RepositoryState for repository ${input.repositoryId} was not found.`);
      }

      await transaction.repositoryContextHistory.upsert({
        where: {
          repositoryId_projectContextId: {
            repositoryId: input.repositoryId,
            projectContextId: input.projectContextId
          }
        },
        update: {},
        create: {
          repositoryId: input.repositoryId,
          projectContextId: input.projectContextId,
          commitSha: input.targetCommitSha
        }
      });

      const promotedState = await transaction.repositoryState.update({
        where: { repositoryId: input.repositoryId },
        data: {
          lastScannedCommitSha: input.targetCommitSha,
          lastAnalyzedCommitSha: input.targetCommitSha,
          currentProjectContextId: input.projectContextId,
          currentContextCommitSha: input.targetCommitSha,
          freshnessStatus: deriveRepositoryFreshnessStatus({
            remoteHeadCommitSha: state.remoteHeadCommitSha,
            currentContextCommitSha: input.targetCommitSha,
            currentContextProvenanceValid: true,
            remoteHeadObservationValid: state.remoteHeadCheckedAt !== null
          })
        }
      });

      const completion = await transaction.repositoryUpdate.updateMany({
        where: {
          id: input.updateId,
          repositoryId: input.repositoryId,
          status: RepositoryUpdateStatus.RUNNING,
          targetCommitSha: input.targetCommitSha,
          projectContextId: input.projectContextId,
          scanId: context.scanId,
          analysisId: context.analysisId
        },
        data: {
          status: RepositoryUpdateStatus.COMPLETED,
          completedAt: input.completedAt ?? new Date(),
          failedAt: null,
          failureReason: null
        }
      });
      if (completion.count !== 1) {
        throw new RepositoryUpdateInvalidTransitionError({
          updateId: input.updateId,
          from: RepositoryUpdateStatus.RUNNING,
          to: RepositoryUpdateStatus.COMPLETED
        });
      }

      const completedUpdate = await transaction.repositoryUpdate.findUniqueOrThrow({
        where: { id: input.updateId }
      });

      return {
        state: toRepositoryStateSnapshot(promotedState),
        update: toRepositoryUpdateSnapshot(completedUpdate)
      };
    });
  }

  private async validateFinalArtifacts(input: FinalizeRepositoryUpdateInput): Promise<void> {
    const context = await this.prisma.projectContext.findUnique({
      where: { id: input.projectContextId },
      include: CONTEXT_PROVENANCE_INCLUDE
    });

    if (
      !context ||
      !hasValidCurrentContextProvenance(context, input.repositoryId, input.targetCommitSha)
    ) {
      throw new InvalidPersistedProjectContextError(
        input.projectContextId,
        "finalization provenance does not match the repository and target commit."
      );
    }
  }
}

const CONTEXT_PROVENANCE_INCLUDE = {
  scan: {
    select: { id: true, repositoryId: true, commitSha: true, status: true }
  },
  analysis: {
    select: { id: true, scanId: true, repositoryId: true, commitSha: true, status: true }
  }
} as const;

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
