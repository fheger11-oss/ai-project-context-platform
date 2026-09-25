import { Inject, Injectable, Logger } from "@nestjs/common";

import type { RunRepositoryUpdateResult } from "./run-repository-update.service.js";
import { RunRepositoryUpdateService } from "./run-repository-update.service.js";
import { RepositoryUpdateTargetSupersededError } from "./errors/repository-update-target-superseded.error.js";
import { OperationConcurrencyError } from "../../usage/errors/operation-concurrency.error.js";
import {
  REPOSITORY_CHANGE_TRIGGER_REPOSITORY,
  type RepositoryChangeTriggerRepository
} from "../domain/contracts/repository-change-trigger-repository.contract.js";
import {
  InvalidRepositoryChangeTriggerError,
  RepositoryChangeIdentityMismatchError,
  RepositoryChangeProviderIdentityMismatchError
} from "../domain/errors/repository-change-trigger.errors.js";

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DELIVERY_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._:/-]{1,255}$/;

export enum RepositoryChangeProvider {
  GITHUB = "GITHUB"
}

export enum RepositoryChangeTriggerSource {
  WEBHOOK = "WEBHOOK"
}

export enum RepositoryChangeEventType {
  PUSH = "PUSH"
}

export type RepositoryChangeTrigger = {
  provider: RepositoryChangeProvider;
  source: RepositoryChangeTriggerSource;
  eventType: RepositoryChangeEventType | string;
  repositoryId: string;
  providerRepositoryId: string;
  repositoryFullName: string;
  branch: string;
  targetCommitSha: string;
  deliveryId?: string;
  occurredAt?: Date;
};

export enum RepositoryChangeTriggerOutcome {
  TRIGGERED = "TRIGGERED",
  NOOP = "NOOP",
  IGNORED_EVENT = "IGNORED_EVENT",
  IGNORED_NON_DEFAULT_BRANCH = "IGNORED_NON_DEFAULT_BRANCH",
  IGNORED_UNKNOWN_REPOSITORY = "IGNORED_UNKNOWN_REPOSITORY",
  IGNORED_STALE_TARGET = "IGNORED_STALE_TARGET",
  IGNORED_UPDATE_IN_PROGRESS = "IGNORED_UPDATE_IN_PROGRESS"
}

export type RepositoryChangeTriggerResult = {
  outcome: RepositoryChangeTriggerOutcome;
  repositoryId: string;
  targetCommitSha: string;
  updateResult?: RunRepositoryUpdateResult;
};

@Injectable()
export class RepositoryChangeTriggerService {
  private readonly logger = new Logger(RepositoryChangeTriggerService.name);

  constructor(
    @Inject(REPOSITORY_CHANGE_TRIGGER_REPOSITORY)
    private readonly repositories: RepositoryChangeTriggerRepository,
    @Inject(RunRepositoryUpdateService)
    private readonly runRepositoryUpdateService: RunRepositoryUpdateService
  ) {}

  async trigger(input: RepositoryChangeTrigger): Promise<RepositoryChangeTriggerResult> {
    this.validateMetadata(input);

    if (input.eventType !== RepositoryChangeEventType.PUSH) {
      return this.outcome(input, RepositoryChangeTriggerOutcome.IGNORED_EVENT);
    }

    const repository = await this.repositories.findConnectedById(input.repositoryId);
    if (!repository) {
      return this.outcome(input, RepositoryChangeTriggerOutcome.IGNORED_UNKNOWN_REPOSITORY);
    }

    if (repository.providerRepositoryId !== input.providerRepositoryId) {
      throw new RepositoryChangeProviderIdentityMismatchError();
    }

    if (repository.fullName.toLowerCase() !== input.repositoryFullName.toLowerCase()) {
      throw new RepositoryChangeIdentityMismatchError();
    }

    if (this.normalizeBranch(input.branch) !== repository.defaultBranch) {
      return this.outcome(input, RepositoryChangeTriggerOutcome.IGNORED_NON_DEFAULT_BRANCH);
    }

    try {
      const updateResult = await this.runRepositoryUpdateService.runWebhookUpdate(
        repository.id,
        repository.userId,
        input.targetCommitSha.toLowerCase()
      );
      return this.outcome(
        input,
        updateResult.noop
          ? RepositoryChangeTriggerOutcome.NOOP
          : RepositoryChangeTriggerOutcome.TRIGGERED,
        updateResult
      );
    } catch (error) {
      if (error instanceof RepositoryUpdateTargetSupersededError) {
        return this.outcome(input, RepositoryChangeTriggerOutcome.IGNORED_STALE_TARGET);
      }
      if (
        error instanceof OperationConcurrencyError &&
        error.details.operationType === "repository.update"
      ) {
        return this.outcome(input, RepositoryChangeTriggerOutcome.IGNORED_UPDATE_IN_PROGRESS);
      }

      throw error;
    }
  }

  private validateMetadata(input: RepositoryChangeTrigger): void {
    if (input.provider !== RepositoryChangeProvider.GITHUB) {
      throw new InvalidRepositoryChangeTriggerError("Unsupported repository change provider.");
    }
    if (input.source !== RepositoryChangeTriggerSource.WEBHOOK) {
      throw new InvalidRepositoryChangeTriggerError("Unsupported repository change source.");
    }
    if (
      !SAFE_IDENTIFIER_PATTERN.test(input.repositoryId) ||
      !SAFE_IDENTIFIER_PATTERN.test(input.providerRepositoryId)
    ) {
      throw new InvalidRepositoryChangeTriggerError("Repository identities are required.");
    }
    if (
      !SAFE_IDENTIFIER_PATTERN.test(input.repositoryFullName) ||
      !SAFE_IDENTIFIER_PATTERN.test(input.branch) ||
      !SAFE_IDENTIFIER_PATTERN.test(input.eventType)
    ) {
      throw new InvalidRepositoryChangeTriggerError("Repository name and branch are required.");
    }
    if (!COMMIT_SHA_PATTERN.test(input.targetCommitSha)) {
      throw new InvalidRepositoryChangeTriggerError("Target commit SHA must be a full Git SHA.");
    }
    if (input.deliveryId !== undefined && !DELIVERY_ID_PATTERN.test(input.deliveryId)) {
      throw new InvalidRepositoryChangeTriggerError("Delivery ID is invalid.");
    }
    if (input.occurredAt !== undefined && Number.isNaN(input.occurredAt.getTime())) {
      throw new InvalidRepositoryChangeTriggerError("Event timestamp is invalid.");
    }
  }

  private normalizeBranch(branch: string): string {
    return branch.startsWith("refs/heads/") ? branch.slice("refs/heads/".length) : branch;
  }

  private outcome(
    input: RepositoryChangeTrigger,
    outcome: RepositoryChangeTriggerOutcome,
    updateResult?: RunRepositoryUpdateResult
  ): RepositoryChangeTriggerResult {
    this.logger.log(
      `repository.change.trigger repositoryId=${input.repositoryId} provider=${input.provider} source=${input.source} eventType=${input.eventType} branch=${this.normalizeBranch(input.branch)} targetCommitSha=${input.targetCommitSha.toLowerCase()} outcome=${outcome}${updateResult?.update ? ` updateId=${updateResult.update.id}` : ""}`
    );

    return {
      outcome,
      repositoryId: input.repositoryId,
      targetCommitSha: input.targetCommitSha.toLowerCase(),
      ...(updateResult ? { updateResult } : {})
    };
  }
}
