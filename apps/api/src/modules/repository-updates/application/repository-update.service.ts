import { Inject, Injectable } from "@nestjs/common";

import {
  RepositoryUpdateStatus,
  type RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import { RepositoriesService } from "../../repositories/repositories.service.js";
import { OperationLockService } from "../../usage/operation-lock.service.js";
import { repositoryUpdateLock } from "../../usage/operation-locks.js";
import type {
  RepositoryUpdateRepository,
  RepositoryUpdateSnapshot
} from "../domain/contracts/repository-update-repository.contract.js";
import { REPOSITORY_UPDATE_REPOSITORY } from "../domain/contracts/repository-update-repository.contract.js";
import {
  RepositoryUpdateFailureReasonError,
  RepositoryUpdateInvalidTransitionError,
  RepositoryUpdateNotFoundError
} from "../domain/errors/repository-update.errors.js";

export type CreatePendingRepositoryUpdateCommand = {
  repositoryId: string;
  userId: string;
  triggerType: RepositoryUpdateTriggerType;
  targetCommitSha: string;
  baseCommitSha?: string | null;
};

@Injectable()
export class RepositoryUpdateService {
  constructor(
    @Inject(REPOSITORY_UPDATE_REPOSITORY)
    private readonly repositoryUpdates: RepositoryUpdateRepository,
    @Inject(RepositoriesService) private readonly repositoriesService: RepositoriesService,
    @Inject(OperationLockService) private readonly operationLockService: OperationLockService
  ) {}

  async createPendingUpdate(
    command: CreatePendingRepositoryUpdateCommand
  ): Promise<RepositoryUpdateSnapshot> {
    await this.repositoriesService.getScanAccessMetadataForUser(
      command.userId,
      command.repositoryId
    );

    return this.repositoryUpdates.createPending({
      repositoryId: command.repositoryId,
      triggerType: command.triggerType,
      targetCommitSha: command.targetCommitSha,
      baseCommitSha: command.baseCommitSha ?? null
    });
  }

  async withRepositoryUpdateLock<T>(
    repositoryId: string,
    userId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.repositoriesService.getScanAccessMetadataForUser(userId, repositoryId);

    return this.operationLockService.withRenewingLocks(
      [repositoryUpdateLock(repositoryId)],
      operation
    );
  }

  async start(updateId: string, userId: string): Promise<RepositoryUpdateSnapshot> {
    return this.transitionWithRepositoryLock(updateId, userId, async (update) => {
      return this.startWithinLock(update, new Date());
    });
  }

  async complete(updateId: string, userId: string): Promise<RepositoryUpdateSnapshot> {
    return this.transitionWithRepositoryLock(updateId, userId, async (update) => {
      return this.completeWithinLock(update, new Date());
    });
  }

  async fail(
    updateId: string,
    userId: string,
    failureReason: string
  ): Promise<RepositoryUpdateSnapshot> {
    const sanitizedFailureReason = failureReason.trim();

    if (!sanitizedFailureReason) {
      throw new RepositoryUpdateFailureReasonError();
    }

    return this.transitionWithRepositoryLock(updateId, userId, async (update) => {
      return this.failWithinLock(update, sanitizedFailureReason, new Date());
    });
  }

  async findOwned(updateId: string, userId: string): Promise<RepositoryUpdateSnapshot> {
    return this.findOwnedUpdate(updateId, userId);
  }

  async startOwnedWithinLock(
    updateId: string,
    userId: string,
    startedAt = new Date()
  ): Promise<RepositoryUpdateSnapshot> {
    const update = await this.findOwnedUpdate(updateId, userId);

    return this.startWithinLock(update, startedAt);
  }

  async completeOwnedWithinLock(
    updateId: string,
    userId: string,
    completedAt = new Date()
  ): Promise<RepositoryUpdateSnapshot> {
    const update = await this.findOwnedUpdate(updateId, userId);

    return this.completeWithinLock(update, completedAt);
  }

  async failOwnedWithinLock(
    updateId: string,
    userId: string,
    failureReason: string,
    failedAt = new Date()
  ): Promise<RepositoryUpdateSnapshot> {
    const sanitizedFailureReason = failureReason.trim();

    if (!sanitizedFailureReason) {
      throw new RepositoryUpdateFailureReasonError();
    }

    const update = await this.findOwnedUpdate(updateId, userId);

    return this.failWithinLock(update, sanitizedFailureReason, failedAt);
  }

  async recordArtifactsOwned(
    updateId: string,
    userId: string,
    artifacts: {
      scanId?: string | null;
      analysisId?: string | null;
      projectContextId?: string | null;
    }
  ): Promise<RepositoryUpdateSnapshot> {
    await this.findOwnedUpdate(updateId, userId);

    const update = await this.repositoryUpdates.updateArtifacts({
      updateId,
      ...artifacts
    });

    if (!update) {
      throw new RepositoryUpdateNotFoundError(updateId);
    }

    return update;
  }

  private async transitionWithRepositoryLock(
    updateId: string,
    userId: string,
    transition: (update: RepositoryUpdateSnapshot) => Promise<RepositoryUpdateSnapshot>
  ): Promise<RepositoryUpdateSnapshot> {
    const update = await this.findOwnedUpdate(updateId, userId);

    return this.withRepositoryUpdateLock(update.repositoryId, userId, async () => {
      const lockedUpdate = await this.findOwnedUpdate(updateId, userId);
      return transition(lockedUpdate);
    });
  }

  private async startWithinLock(
    update: RepositoryUpdateSnapshot,
    startedAt: Date
  ): Promise<RepositoryUpdateSnapshot> {
    this.assertTransition(update, RepositoryUpdateStatus.PENDING, RepositoryUpdateStatus.RUNNING);

    const transitioned = await this.repositoryUpdates.markRunning({
      updateId: update.id,
      startedAt
    });

    return (
      transitioned ??
      this.invalidTransition(update.id, update.status, RepositoryUpdateStatus.RUNNING)
    );
  }

  private async completeWithinLock(
    update: RepositoryUpdateSnapshot,
    completedAt: Date
  ): Promise<RepositoryUpdateSnapshot> {
    this.assertTransition(update, RepositoryUpdateStatus.RUNNING, RepositoryUpdateStatus.COMPLETED);

    const transitioned = await this.repositoryUpdates.markCompleted({
      updateId: update.id,
      completedAt
    });

    return (
      transitioned ??
      this.invalidTransition(update.id, update.status, RepositoryUpdateStatus.COMPLETED)
    );
  }

  private async failWithinLock(
    update: RepositoryUpdateSnapshot,
    failureReason: string,
    failedAt: Date
  ): Promise<RepositoryUpdateSnapshot> {
    this.assertTransition(update, RepositoryUpdateStatus.RUNNING, RepositoryUpdateStatus.FAILED);

    const transitioned = await this.repositoryUpdates.markFailed({
      updateId: update.id,
      failedAt,
      failureReason
    });

    return (
      transitioned ??
      this.invalidTransition(update.id, update.status, RepositoryUpdateStatus.FAILED)
    );
  }

  private async findOwnedUpdate(
    updateId: string,
    userId: string
  ): Promise<RepositoryUpdateSnapshot> {
    const update = await this.repositoryUpdates.findById(updateId);

    if (!update) {
      throw new RepositoryUpdateNotFoundError(updateId);
    }

    await this.repositoriesService.getScanAccessMetadataForUser(userId, update.repositoryId);

    return update;
  }

  private assertTransition(
    update: RepositoryUpdateSnapshot,
    expectedStatus: RepositoryUpdateStatus,
    targetStatus: RepositoryUpdateStatus
  ): void {
    if (update.status !== expectedStatus) {
      this.invalidTransition(update.id, update.status, targetStatus);
    }
  }

  private invalidTransition(
    updateId: string,
    from: RepositoryUpdateStatus,
    to: RepositoryUpdateStatus
  ): never {
    throw new RepositoryUpdateInvalidTransitionError({
      updateId,
      from,
      to
    });
  }
}
