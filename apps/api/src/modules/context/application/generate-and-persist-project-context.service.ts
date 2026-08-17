import { Inject, Injectable } from "@nestjs/common";

import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import {
  GenerateProjectContextService,
  type GenerateProjectContextCommand
} from "./generate-project-context.service.js";
import { PersistProjectContextService } from "./persist-project-context.service.js";

export type GenerateAndPersistProjectContextCommand = GenerateProjectContextCommand;

@Injectable()
export class GenerateAndPersistProjectContextService {
  constructor(
    @Inject(GenerateProjectContextService)
    private readonly generateProjectContextService: GenerateProjectContextService,
    @Inject(PersistProjectContextService)
    private readonly persistProjectContextService: PersistProjectContextService
  ) {}

  async generate(
    command: GenerateAndPersistProjectContextCommand
  ): Promise<PersistedProjectContext> {
    const context = await this.generateProjectContextService.generate(command);

    return this.persistProjectContextService.save(context);
  }
}
