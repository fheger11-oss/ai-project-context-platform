import { Inject, Injectable } from "@nestjs/common";

import {
  CONTEXT_GENERATOR,
  type ContextGenerator
} from "../domain/contracts/context-generator.contract.js";
import type { ProjectContext } from "../domain/project-context.js";
import {
  ReadContextInputService,
  type ReadContextInputQuery
} from "./read-context-input.service.js";

export type GenerateProjectContextCommand = ReadContextInputQuery;

@Injectable()
export class GenerateProjectContextService {
  constructor(
    @Inject(ReadContextInputService)
    private readonly readContextInputService: ReadContextInputService,
    @Inject(CONTEXT_GENERATOR)
    private readonly contextGenerator: ContextGenerator
  ) {}

  async generate(command: GenerateProjectContextCommand): Promise<ProjectContext> {
    const input = await this.readContextInputService.read(command);

    return this.contextGenerator.generate(input);
  }
}
