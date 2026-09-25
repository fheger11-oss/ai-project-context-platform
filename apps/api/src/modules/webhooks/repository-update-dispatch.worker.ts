import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { AppConfigService } from "../config/app-config.service.js";
import {
  RepositoryChangeEventType,
  RepositoryChangeProvider,
  RepositoryChangeTriggerOutcome,
  RepositoryChangeTriggerService,
  RepositoryChangeTriggerSource
} from "../repository-updates/application/repository-change-trigger.service.js";
import {
  InvalidRepositoryChangeTriggerError,
  RepositoryChangeIdentityMismatchError,
  RepositoryChangeProviderIdentityMismatchError
} from "../repository-updates/domain/errors/repository-change-trigger.errors.js";
import { RepositoryUpdateDispatchRepository } from "./repository-update-dispatch.repository.js";

@Injectable()
export class RepositoryUpdateDispatchWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RepositoryUpdateDispatchWorker.name);
  private readonly workerId = randomUUID();
  private timer?: NodeJS.Timeout;
  private active: Promise<void> | undefined;
  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(RepositoryUpdateDispatchRepository)
    private readonly dispatches: RepositoryUpdateDispatchRepository,
    @Inject(RepositoryChangeTriggerService)
    private readonly triggers: RepositoryChangeTriggerService
  ) {}

  onModuleInit() {
    if (!this.config.repositoryUpdateWorkerEnabled) return;
    this.logger.log(`repository.dispatch.worker started workerId=${this.workerId}`);
    this.timer = setInterval(
      () => this.schedule(),
      this.config.repositoryUpdateWorkerPollIntervalMilliseconds
    );
    this.timer.unref();
    this.schedule();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.active;
  }

  async processOne(): Promise<boolean> {
    const now = new Date();
    const leaseMs = this.config.repositoryUpdateWorkerLeaseMilliseconds;
    const job = await this.dispatches.claim(this.workerId, now, new Date(now.getTime() + leaseMs));
    if (!job) return false;
    const heartbeat = setInterval(
      () => void this.dispatches.renew(job.id, this.workerId, new Date(Date.now() + leaseMs)),
      Math.max(10_000, Math.floor(leaseMs / 3))
    );
    heartbeat.unref();
    try {
      const delivery = job.webhookDelivery;
      const result = await this.triggers.trigger({
        provider: RepositoryChangeProvider.GITHUB,
        source: RepositoryChangeTriggerSource.WEBHOOK,
        eventType: RepositoryChangeEventType.PUSH,
        repositoryId: job.repositoryId,
        providerRepositoryId: delivery.providerRepositoryId,
        repositoryFullName: delivery.repositoryFullName,
        branch: delivery.branch,
        targetCommitSha: delivery.targetCommitSha,
        deliveryId: delivery.deliveryId,
        ...(delivery.occurredAt ? { occurredAt: delivery.occurredAt } : {})
      });
      if (result.outcome === RepositoryChangeTriggerOutcome.IGNORED_UPDATE_IN_PROGRESS) {
        if (job.attemptCount >= this.config.repositoryUpdateWorkerMaxAttempts) {
          await this.dispatches.fail(job.id, this.workerId, "UPDATE_IN_PROGRESS");
        } else {
          const delay =
            this.config.repositoryUpdateWorkerBackoffBaseMilliseconds * 2 ** (job.attemptCount - 1);
          await this.dispatches.retry(
            job.id,
            this.workerId,
            new Date(Date.now() + delay),
            "UPDATE_IN_PROGRESS"
          );
        }
        return true;
      }
      const ignored =
        result.outcome !== RepositoryChangeTriggerOutcome.TRIGGERED &&
        result.outcome !== RepositoryChangeTriggerOutcome.NOOP;
      await this.dispatches.finish(
        job.id,
        this.workerId,
        ignored ? "IGNORED" : "COMPLETED",
        result.updateResult?.update?.id
      );
      this.logger.log(
        `repository.dispatch completed dispatchId=${job.id} deliveryId=${delivery.deliveryId} repositoryId=${job.repositoryId} attempt=${job.attemptCount} outcome=${result.outcome}`
      );
    } catch (error) {
      const category = failureCategory(error);
      const permanent = isPermanent(error);
      if (permanent || job.attemptCount >= this.config.repositoryUpdateWorkerMaxAttempts) {
        await this.dispatches.fail(job.id, this.workerId, category);
        this.logger.warn(
          `repository.dispatch failed dispatchId=${job.id} repositoryId=${job.repositoryId} attempt=${job.attemptCount} category=${category}`
        );
      } else {
        const delay =
          this.config.repositoryUpdateWorkerBackoffBaseMilliseconds * 2 ** (job.attemptCount - 1);
        await this.dispatches.retry(job.id, this.workerId, new Date(Date.now() + delay), category);
        this.logger.warn(
          `repository.dispatch retry dispatchId=${job.id} repositoryId=${job.repositoryId} attempt=${job.attemptCount} category=${category}`
        );
      }
    } finally {
      clearInterval(heartbeat);
    }
    return true;
  }

  private schedule() {
    if (this.active) return;
    this.active = this.processOne()
      .then(() => undefined)
      .catch(() => this.logger.error("repository.dispatch.worker poll failed"))
      .finally(() => {
        this.active = undefined;
      });
  }
}

function isPermanent(error: unknown) {
  return (
    error instanceof InvalidRepositoryChangeTriggerError ||
    error instanceof RepositoryChangeIdentityMismatchError ||
    error instanceof RepositoryChangeProviderIdentityMismatchError
  );
}
function failureCategory(error: unknown) {
  return isPermanent(error) ? "INVALID_TRIGGER" : "TRANSIENT_PROCESSING_FAILURE";
}
