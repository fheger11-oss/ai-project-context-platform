import { Inject, Injectable } from "@nestjs/common";

import {
  CONTEXT_GENERATOR,
  type ContextGenerator
} from "../domain/contracts/context-generator.contract.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { type GenerateProjectContextCommand } from "./generate-project-context.service.js";
import { PersistProjectContextService } from "./persist-project-context.service.js";
import { ReadContextInputService } from "./read-context-input.service.js";
import { OperationLockService } from "../../usage/operation-lock.service.js";
import { userHeavyOperationLock } from "../../usage/operation-locks.js";
import { UsageService } from "../../usage/usage.service.js";
import { V1_USAGE_LIMITS } from "../../usage/v1-usage-limits.js";

export type GenerateAndPersistProjectContextCommand = GenerateProjectContextCommand;

@Injectable()
export class GenerateAndPersistProjectContextService {
  constructor(
    @Inject(PersistProjectContextService)
    private readonly persistProjectContextService: PersistProjectContextService,
    @Inject(ReadContextInputService)
    private readonly readContextInputService: ReadContextInputService,
    @Inject(CONTEXT_GENERATOR)
    private readonly contextGenerator: ContextGenerator,
    @Inject(UsageService)
    private readonly usageService: UsageService,
    @Inject(OperationLockService)
    private readonly operationLockService: OperationLockService
  ) {}

  async generate(
    command: GenerateAndPersistProjectContextCommand
  ): Promise<PersistedProjectContext> {
    const input = await this.readContextInputService.read(command);

    await this.usageService.assertMonthlyQuota({
      userId: command.userId,
      resource: "contexts",
      limit: V1_USAGE_LIMITS.contextsPerMonth
    });

    return this.operationLockService.withRenewingLocks(
      [userHeavyOperationLock(command.userId, V1_USAGE_LIMITS.lockLeaseMs.context)],
      async () => {
        const context = await this.contextGenerator.generate(input);

        return this.persistProjectContextService.save(context);
      }
    );
  }
}
