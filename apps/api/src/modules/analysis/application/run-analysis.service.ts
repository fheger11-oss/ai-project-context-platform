import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { Analysis } from "../domain/analysis.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import type { SourceFileStructure } from "../domain/source-structure/source-file-structure.js";
import { ANALYSIS_ENGINE_VERSION } from "./analysis-engine-version.js";
import { AnalysisInputService } from "./analysis-input.service.js";
import { AnalysisPipelineService } from "./analysis-pipeline.service.js";
import type { SourceStructureProcessingObserver } from "./source-structure-analysis.service.js";
import { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import {
  ANALYSIS_REPOSITORY,
  type AnalysisRepository
} from "../domain/contracts/analysis-repository.contract.js";
import {
  REPOSITORY_OWNERSHIP_VERIFIER,
  type RepositoryOwnershipVerifier
} from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository
} from "../../scan/domain/contracts/scan-repository.contract.js";
import { OperationLockService } from "../../usage/operation-lock.service.js";
import {
  globalAnalysisLock,
  scanAnalysisLock,
  userHeavyOperationLock
} from "../../usage/operation-locks.js";
import { UsageService } from "../../usage/usage.service.js";
import { V1_USAGE_LIMITS } from "../../usage/v1-usage-limits.js";

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
    private readonly persistAnalysisResultService: PersistAnalysisResultService,
    @Inject(ANALYSIS_REPOSITORY)
    private readonly analysisRepository: AnalysisRepository,
    @Inject(UsageService)
    private readonly usageService: UsageService,
    @Inject(OperationLockService)
    private readonly operationLockService: OperationLockService
  ) {}

  async run(command: RunAnalysisCommand): Promise<AnalysisResult> {
    return this.execute(command);
  }

  // Internal incremental entry point; the caller has verified reuse against both snapshots.
  async runWithSourceStructureReuse(
    command: RunAnalysisCommand,
    reusableSourceStructures: ReadonlyMap<string, SourceFileStructure>,
    observer?: SourceStructureProcessingObserver
  ): Promise<AnalysisResult> {
    return this.execute(command, reusableSourceStructures, observer);
  }

  private async execute(
    command: RunAnalysisCommand,
    reusableSourceStructures?: ReadonlyMap<string, SourceFileStructure>,
    observer?: SourceStructureProcessingObserver
  ): Promise<AnalysisResult> {
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

    await this.usageService.assertMonthlyQuota({
      userId: command.userId,
      resource: "analyses",
      limit: V1_USAGE_LIMITS.analysesPerMonth
    });

    return this.operationLockService.withRenewingLocks(
      [
        globalAnalysisLock(),
        userHeavyOperationLock(command.userId, V1_USAGE_LIMITS.lockLeaseMs.analysis),
        scanAnalysisLock(scan.id)
      ],
      async () => {
        const analysisInput = await this.analysisInputService.prepareAnalysisInput({
          scanId: command.scanId
        });
        const analysis = Analysis.create({
          id: randomUUID(),
          scanId: scan.id,
          analyzerVersion: ANALYSIS_ENGINE_VERSION
        }).transitionTo("RUNNING");
        const acceptedAnalysis = await this.analysisRepository.save(analysis);

        try {
          const result = await this.analysisPipelineService.analyze({
            analysis: acceptedAnalysis,
            input: analysisInput,
            generatedAt: new Date(),
            ...(reusableSourceStructures ? { reusableSourceStructures } : {}),
            ...(observer ? { sourceStructureProcessingObserver: observer } : {})
          });

          return await this.persistAnalysisResultService.save(result);
        } catch (error) {
          await this.analysisRepository
            .save(acceptedAnalysis.transitionTo("FAILED"))
            .catch(() => undefined);
          throw error;
        }
      }
    );
  }
}
