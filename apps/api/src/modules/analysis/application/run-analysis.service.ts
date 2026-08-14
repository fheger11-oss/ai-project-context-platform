import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { Analysis } from "../domain/analysis.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { ANALYSIS_ENGINE_VERSION } from "./analysis-engine-version.js";
import { AnalysisInputService } from "./analysis-input.service.js";
import { AnalysisPipelineService } from "./analysis-pipeline.service.js";
import { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import {
  REPOSITORY_OWNERSHIP_VERIFIER,
  type RepositoryOwnershipVerifier
} from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository
} from "../../scan/domain/contracts/scan-repository.contract.js";

export type RunAnalysisCommand = {
  userId: string;
  scanId: string;
};

@Injectable()
export class RunAnalysisService {
  constructor(
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository: ScanRepository,
    @Inject(REPOSITORY_OWNERSHIP_VERIFIER)
    private readonly repositoryOwnershipVerifier: RepositoryOwnershipVerifier,
    @Inject(AnalysisInputService)
    private readonly analysisInputService: AnalysisInputService,
    @Inject(AnalysisPipelineService)
    private readonly analysisPipelineService: AnalysisPipelineService,
    @Inject(PersistAnalysisResultService)
    private readonly persistAnalysisResultService: PersistAnalysisResultService
  ) {}

  async run(command: RunAnalysisCommand): Promise<AnalysisResult> {
    const scan = await this.scanRepository.getScan(command.scanId);

    if (!scan) {
      throw new NotFoundException("Scan was not found");
    }

    await this.repositoryOwnershipVerifier.verifyRepositoryOwnership({
      userId: command.userId,
      repositoryId: scan.repositoryId
    });

    if (scan.status !== "COMPLETED") {
      throw new BadRequestException("Scan is not ready for analysis");
    }

    const analysisInput = await this.analysisInputService.prepareAnalysisInput({
      scanId: command.scanId
    });
    const analysis = Analysis.create({
      id: randomUUID(),
      scanId: scan.id,
      analyzerVersion: ANALYSIS_ENGINE_VERSION
    });
    const result = await this.analysisPipelineService.analyze({
      analysis,
      input: analysisInput,
      generatedAt: new Date()
    });

    return this.persistAnalysisResultService.save(result);
  }
}
