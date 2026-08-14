import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import {
  REPOSITORY_OWNERSHIP_VERIFIER,
  type RepositoryOwnershipVerifier
} from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";

export type GetAnalysisResultQuery = {
  userId: string;
  analysisId: string;
};

@Injectable()
export class GetAnalysisResultService {
  constructor(
    @Inject(PersistAnalysisResultService)
    private readonly persistAnalysisResultService: PersistAnalysisResultService,
    @Inject(REPOSITORY_OWNERSHIP_VERIFIER)
    private readonly repositoryOwnershipVerifier: RepositoryOwnershipVerifier
  ) {}

  async get(query: GetAnalysisResultQuery): Promise<AnalysisResult> {
    const result = await this.persistAnalysisResultService.findById(query.analysisId);

    if (!result) {
      throw new NotFoundException("Analysis was not found");
    }

    await this.repositoryOwnershipVerifier.verifyRepositoryOwnership({
      userId: query.userId,
      repositoryId: result.repositoryId
    });

    return result;
  }
}
