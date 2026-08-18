import { Inject, Injectable } from "@nestjs/common";

import {
  PROJECT_CONTEXT_REPOSITORY,
  type PersistedProjectContext,
  type ProjectContextRepository
} from "../domain/contracts/project-context-repository.contract.js";
import type { ProjectContext } from "../domain/project-context.js";

@Injectable()
export class PersistProjectContextService {
  constructor(
    @Inject(PROJECT_CONTEXT_REPOSITORY)
    private readonly projectContextRepository: ProjectContextRepository
  ) {}

  async save(context: ProjectContext): Promise<PersistedProjectContext> {
    return this.projectContextRepository.save(context);
  }

  async findById(id: string): Promise<PersistedProjectContext | null> {
    return this.projectContextRepository.findById(id);
  }

  async listByAnalysisId(analysisId: string): Promise<PersistedProjectContext[]> {
    return this.projectContextRepository.listByAnalysisId(analysisId);
  }

  async findLatestByAnalysisId(analysisId: string): Promise<PersistedProjectContext | null> {
    return this.projectContextRepository.findLatestByAnalysisId(analysisId);
  }
}
