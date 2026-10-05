import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { AppConfigService } from "../../config/app-config.service.js";
import type { ArchitectureProcessingRequestRepository } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import { ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import {
  ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR,
  type ArchitectureProcessingRequestProcessor
} from "./architecture-processing-request-processor.contract.js";

const FAILURE_CATEGORY = "ARCHITECTURE_PROCESSING_FAILURE";

@Injectable()
export class ArchitectureProcessingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArchitectureProcessingWorker.name);
  private readonly workerId = randomUUID();
  private timer?: NodeJS.Timeout;
  private active: Promise<void> | undefined;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(ARCHITECTURE_PROCESSING_REQUEST_REPOSITORY)
    private readonly requests: ArchitectureProcessingRequestRepository,
    @Inject(ARCHITECTURE_PROCESSING_REQUEST_PROCESSOR)
    private readonly processor: ArchitectureProcessingRequestProcessor
  ) {}

  onModuleInit() {
    if (!this.config.architectureProcessingWorkerEnabled) return;
    this.logger.log(`architecture.processing.worker started workerId=${this.workerId}`);
    this.timer = setInterval(
      () => this.schedule(),
      this.config.architectureProcessingWorkerPollIntervalMilliseconds
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
    const leaseMs = this.config.architectureProcessingWorkerLeaseMilliseconds;
    const request = await this.requests.claim(
      this.workerId,
      now,
      new Date(now.getTime() + leaseMs)
    );
    if (!request) return false;

    const heartbeat = setInterval(
      () => {
        const heartbeatAt = new Date();
        void this.requests
          .renewLease(
            {
              id: request.id,
              repositoryId: request.repositoryId,
              workerId: this.workerId,
              now: heartbeatAt
            },
            new Date(heartbeatAt.getTime() + leaseMs)
          )
          .catch(() =>
            this.logger.warn(
              `architecture.processing heartbeat failed requestId=${request.id} repositoryId=${request.repositoryId}`
            )
          );
      },
      Math.max(10_000, Math.floor(leaseMs / 3))
    );
    heartbeat.unref();

    try {
      const outcome = await this.processor.process(request);
      const transitionAt = new Date();
      const transitioned =
        outcome === "INCOMPATIBLE"
          ? await this.requests.markIncompatible({
              id: request.id,
              repositoryId: request.repositoryId,
              workerId: this.workerId,
              now: transitionAt
            })
          : await this.requests.complete({
              id: request.id,
              repositoryId: request.repositoryId,
              workerId: this.workerId,
              now: transitionAt
            });
      if (!transitioned) {
        this.logger.warn(
          `architecture.processing ownership lost requestId=${request.id} repositoryId=${request.repositoryId}`
        );
      }
    } catch {
      const transitionAt = new Date();
      if (request.attemptCount >= this.config.architectureProcessingWorkerMaxAttempts) {
        await this.requests.fail({
          id: request.id,
          repositoryId: request.repositoryId,
          workerId: this.workerId,
          now: transitionAt,
          failureCategory: FAILURE_CATEGORY
        });
      } else {
        const delay =
          this.config.architectureProcessingWorkerBackoffBaseMilliseconds *
          2 ** (request.attemptCount - 1);
        await this.requests.retry({
          id: request.id,
          repositoryId: request.repositoryId,
          workerId: this.workerId,
          now: transitionAt,
          nextAttemptAt: new Date(transitionAt.getTime() + delay),
          failureCategory: FAILURE_CATEGORY
        });
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
      .catch(() => this.logger.error("architecture.processing.worker poll failed"))
      .finally(() => {
        this.active = undefined;
      });
  }
}
