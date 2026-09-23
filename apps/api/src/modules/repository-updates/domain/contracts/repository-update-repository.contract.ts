import type {
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../../generated/prisma/enums.js";

export const REPOSITORY_UPDATE_REPOSITORY = Symbol("REPOSITORY_UPDATE_REPOSITORY");

export type RepositoryUpdateSnapshot = {
  id: string;
  repositoryId: string;
  triggerType: RepositoryUpdateTriggerType;
  baseCommitSha: string | null;
  targetCommitSha: string;
  status: RepositoryUpdateStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
  changeSet: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePendingRepositoryUpdateInput = {
  repositoryId: string;
  triggerType: RepositoryUpdateTriggerType;
  targetCommitSha: string;
  baseCommitSha?: string | null;
};

export type MarkRepositoryUpdateRunningInput = {
  updateId: string;
  startedAt: Date;
};

export type MarkRepositoryUpdateCompletedInput = {
  updateId: string;
  completedAt: Date;
};

export type MarkRepositoryUpdateFailedInput = {
  updateId: string;
  failedAt: Date;
  failureReason: string;
};

export type UpdateRepositoryUpdateArtifactsInput = {
  updateId: string;
  scanId?: string | null;
  analysisId?: string | null;
  projectContextId?: string | null;
};

export interface RepositoryUpdateRepository {
  createPending(input: CreatePendingRepositoryUpdateInput): Promise<RepositoryUpdateSnapshot>;
  findById(updateId: string): Promise<RepositoryUpdateSnapshot | null>;
  markRunning(input: MarkRepositoryUpdateRunningInput): Promise<RepositoryUpdateSnapshot | null>;
  markCompleted(
    input: MarkRepositoryUpdateCompletedInput
  ): Promise<RepositoryUpdateSnapshot | null>;
  markFailed(input: MarkRepositoryUpdateFailedInput): Promise<RepositoryUpdateSnapshot | null>;
  updateArtifacts(
    input: UpdateRepositoryUpdateArtifactsInput
  ): Promise<RepositoryUpdateSnapshot | null>;
}
