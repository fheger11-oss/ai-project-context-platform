import { Inject, Injectable, Logger } from "@nestjs/common";

import { RepositoryUpdateStatus } from "../../../generated/prisma/enums.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  REPOSITORY_UPDATE_REPOSITORY,
  type RepositoryUpdateRepository,
  type RepositoryUpdateSnapshot
} from "../domain/contracts/repository-update-repository.contract.js";
import { RepositoryUpdateService } from "./repository-update.service.js";

export const STALE_REPOSITORY_UPDATE_RECOVERY_REASON = "STALE_UPDATE_RECOVERED";

export enum RepositoryUpdateRecoveryOutcome {
  RECOVERED = "RECOVERED",
  NOT_STALE = "NOT_STALE",
  ALREADY_TERMINAL = "ALREADY_TERMINAL",
  NOT_FOUND = "NOT_FOUND"
}

export type RepositoryUpdateRecoveryResult = Readonly<{
  outcome: RepositoryUpdateRecoveryOutcome;
  update: RepositoryUpdateSnapshot | null;
}>;

export type RecoverRepositoryUpdateInput = {
  repositoryId: string;
  updateId: string;
  userId: string;
  now?: Date;
};

@Injectable()
export class RepositoryUpdateRecoveryService {
  private readonly logger = new Logger(RepositoryUpdateRecoveryService.name);

  constructor(
    @Inject(REPOSITORY_UPDATE_REPOSITORY)
    private readonly repositoryUpdates: RepositoryUpdateRepository,
    @Inject(RepositoryUpdateService)
    private readonly repositoryUpdateService: RepositoryUpdateService,
    @Inject(RepositoriesService) private readonly repositoriesService: RepositoriesService,
    @Inject(AppConfigService) private readonly config: AppConfigService
  ) {}

  async recover(input: RecoverRepositoryUpdateInput): Promise<RepositoryUpdateRecoveryResult> {
    await this.repositoriesService.getScanAccessMetadataForUser(input.userId, input.repositoryId);

    return this.repositoryUpdateService.withRepositoryUpdateLock(
      input.repositoryId,
      input.userId,
      async () => this.recoverWithinLock(input)
    );
  }

  private async recoverWithinLock(
    input: RecoverRepositoryUpdateInput
  ): Promise<RepositoryUpdateRecoveryResult> {
    const update = await this.repositoryUpdates.findByRepositoryAndId(
      input.repositoryId,
      input.updateId
    );
    if (!update) return { outcome: RepositoryUpdateRecoveryOutcome.NOT_FOUND, update: null };
    if (
      update.status === RepositoryUpdateStatus.COMPLETED ||
      update.status === RepositoryUpdateStatus.FAILED
    ) {
      return { outcome: RepositoryUpdateRecoveryOutcome.ALREADY_TERMINAL, update };
    }
    if (update.status !== RepositoryUpdateStatus.RUNNING) {
      return { outcome: RepositoryUpdateRecoveryOutcome.NOT_STALE, update };
    }

    const now = input.now ?? new Date();
    const staleBeforeOrAt = new Date(
      now.getTime() - this.config.repositoryUpdateStaleThresholdMilliseconds
    );
    if (!update.startedAt || update.startedAt > staleBeforeOrAt) {
      return { outcome: RepositoryUpdateRecoveryOutcome.NOT_STALE, update };
    }

    const recovered = await this.repositoryUpdates.recoverStaleRunning({
      updateId: update.id,
      repositoryId: update.repositoryId,
      staleBeforeOrAt,
      failedAt: now,
      failureReason: STALE_REPOSITORY_UPDATE_RECOVERY_REASON
    });
    if (recovered) {
      this.logger.warn(
        `repository.update.recovered repositoryId=${recovered.repositoryId} updateId=${recovered.id} previousStatus=RUNNING newStatus=FAILED reason=${STALE_REPOSITORY_UPDATE_RECOVERY_REASON}`
      );
      return { outcome: RepositoryUpdateRecoveryOutcome.RECOVERED, update: recovered };
    }

    const current = await this.repositoryUpdates.findByRepositoryAndId(
      input.repositoryId,
      input.updateId
    );
    if (!current) return { outcome: RepositoryUpdateRecoveryOutcome.NOT_FOUND, update: null };
    if (current.status !== RepositoryUpdateStatus.RUNNING) {
      return { outcome: RepositoryUpdateRecoveryOutcome.ALREADY_TERMINAL, update: current };
    }
    return { outcome: RepositoryUpdateRecoveryOutcome.NOT_STALE, update: current };
  }
}
