import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { GetAnalysisResultService } from "../../analysis/application/get-analysis-result.service.js";
import type { PersistedProjectContext } from "../domain/contracts/project-context-repository.contract.js";
import { PersistProjectContextService } from "./persist-project-context.service.js";

export type GetAnalysisProjectContextsQuery = {
  userId: string;
  analysisId: string;
};

@Injectable()
export class GetAnalysisProjectContextsService {
  constructor(
    @Inject(GetAnalysisResultService)
    private readonly getAnalysisResultService: GetAnalysisResultService,
    @Inject(PersistProjectContextService)
    private readonly persistProjectContextService: PersistProjectContextService
  ) {}

  async getLatest(query: GetAnalysisProjectContextsQuery): Promise<PersistedProjectContext> {
    await this.verifyAnalysisOwnership(query);
    const context = await this.persistProjectContextService.findLatestByAnalysisId(
      query.analysisId
    );

    if (!context) {
      throw new NotFoundException("Context was not found");
    }

    return context;
  }

  async getHistory(query: GetAnalysisProjectContextsQuery): Promise<PersistedProjectContext[]> {
    await this.verifyAnalysisOwnership(query);

    return this.persistProjectContextService.listByAnalysisId(query.analysisId);
  }

  private async verifyAnalysisOwnership(query: GetAnalysisProjectContextsQuery): Promise<void> {
    await this.getAnalysisResultService.get({
      userId: query.userId,
      analysisId: query.analysisId
    });
  }
}
