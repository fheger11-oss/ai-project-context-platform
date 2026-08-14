import { Inject, Injectable } from "@nestjs/common";

import {
  ANALYSIS_REPOSITORY,
  type AnalysisRepository
} from "../domain/contracts/analysis-repository.contract.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { AnalysisPersistenceError } from "../domain/errors/analysis-persistence.error.js";

@Injectable()
export class PersistAnalysisResultService {
  constructor(
    @Inject(ANALYSIS_REPOSITORY)
    private readonly analysisRepository: AnalysisRepository
  ) {}

  async save(result: AnalysisResult): Promise<AnalysisResult> {
    this.assertRequired(result.analysisId, "analysisId");
    this.assertRequired(result.scanId, "scanId");
    this.assertRequired(result.repositoryId, "repositoryId");
    this.assertRequired(result.commitSha, "commitSha");
    this.assertRequired(result.analyzerVersion, "analyzerVersion");

    if (!(result.generatedAt instanceof Date) || Number.isNaN(result.generatedAt.getTime())) {
      throw new AnalysisPersistenceError("AnalysisResult.generatedAt is required.");
    }

    return this.analysisRepository.saveResult(result);
  }

  async findById(analysisId: string): Promise<AnalysisResult | null> {
    this.assertRequired(analysisId, "analysisId");

    return this.analysisRepository.findResultById(analysisId);
  }

  private assertRequired(value: string, field: string): void {
    if (value.trim() === "") {
      throw new AnalysisPersistenceError(`AnalysisResult.${field} is required.`);
    }
  }
}
