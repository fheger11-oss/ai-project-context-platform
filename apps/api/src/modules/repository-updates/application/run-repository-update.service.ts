import { BadGatewayException, Inject, Injectable } from "@nestjs/common";

import { RepositoryUpdateTriggerType } from "../../../generated/prisma/enums.js";
import type { RepositoryFreshnessStatus } from "../../../generated/prisma/enums.js";
import { RunAnalysisService } from "../../analysis/application/run-analysis.service.js";
import { ChangeSetService } from "../../change-sets/application/change-set.service.js";
import { ChangeSetCompleteness, type ChangeSet } from "../../change-sets/domain/change-set.js";
import { GenerateAndPersistProjectContextService } from "../../context/application/generate-and-persist-project-context.service.js";
import {
  RepositoryStateService,
  type RepositoryStateSnapshot
} from "../../repositories/repository-state.service.js";
import { ScanService } from "../../scan/application/scan.service.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { PersistedProjectContext } from "../../context/domain/contracts/project-context-repository.contract.js";
import type { ScanSnapshot } from "../../scan/domain/contracts/scan-repository.contract.js";
import type { RepositoryUpdateSnapshot } from "../domain/contracts/repository-update-repository.contract.js";
import { RepositoryUpdateService } from "./repository-update.service.js";

export type RepositoryUpdateFailureReason =
  | "CHANGESET_COMPARISON_FAILED"
  | "SCAN_FAILED"
  | "ANALYSIS_FAILED"
  | "CONTEXT_GENERATION_FAILED"
  | "CURRENT_CONTEXT_UPDATE_FAILED";

type RepositoryUpdateExecutionContext = {
  update: RepositoryUpdateSnapshot;
  changeSet: ChangeSet | null;
  changeSetUsableForIncrementalProcessing: boolean;
};

export type RunRepositoryUpdateResult = {
  noop: boolean;
  update: RepositoryUpdateSnapshot | null;
  baseCommitSha: string | null;
  targetCommitSha: string;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
  freshnessStatus: RepositoryFreshnessStatus;
};

@Injectable()
export class RunRepositoryUpdateService {
  constructor(
    @Inject(RepositoryUpdateService)
    private readonly repositoryUpdateService: RepositoryUpdateService,
    @Inject(RepositoryStateService)
    private readonly repositoryStateService: RepositoryStateService,
    @Inject(ChangeSetService)
    private readonly changeSetService: ChangeSetService,
    @Inject(ScanService)
    private readonly scanService: ScanService,
    @Inject(RunAnalysisService)
    private readonly runAnalysisService: RunAnalysisService,
    @Inject(GenerateAndPersistProjectContextService)
    private readonly generateAndPersistProjectContextService: GenerateAndPersistProjectContextService
  ) {}

  async runManualUpdate(repositoryId: string, userId: string): Promise<RunRepositoryUpdateResult> {
    return this.repositoryUpdateService.withRepositoryUpdateLock(repositoryId, userId, async () => {
      const initialState = await this.repositoryStateService.getOrInitialize(repositoryId, userId);
      const refreshedState = await this.repositoryStateService.refreshRemoteHead(
        repositoryId,
        userId
      );
      const targetCommitSha = this.requireRemoteHead(refreshedState);
      const baseCommitSha = initialState.currentContextCommitSha;

      if (targetCommitSha === baseCommitSha) {
        return {
          noop: true,
          update: null,
          baseCommitSha,
          targetCommitSha,
          scanId: null,
          analysisId: null,
          projectContextId: initialState.currentProjectContextId,
          freshnessStatus: refreshedState.freshnessStatus
        };
      }

      let changeSet: ChangeSet | null = null;

      if (baseCommitSha) {
        try {
          changeSet = await this.changeSetService.compare({
            repositoryId,
            userId,
            baseCommitSha,
            targetCommitSha
          });
        } catch (error) {
          const failedExecution = await this.createExecutionContext({
            repositoryId,
            userId,
            baseCommitSha,
            targetCommitSha,
            changeSet: null
          });
          await this.repositoryUpdateService.failOwnedWithinLock(
            failedExecution.update.id,
            userId,
            "CHANGESET_COMPARISON_FAILED"
          );

          return Promise.reject(error);
        }
      }

      const execution = await this.createExecutionContext({
        repositoryId,
        userId,
        baseCommitSha,
        targetCommitSha,
        changeSet
      });
      let update = execution.update;
      let scan: ScanSnapshot | null = null;
      let analysis: AnalysisResult | null = null;
      let context: PersistedProjectContext | null = null;

      try {
        scan = await this.runScan(repositoryId, userId, targetCommitSha);
        update = await this.repositoryUpdateService.recordArtifactsOwned(update.id, userId, {
          scanId: scan.id
        });

        analysis = await this.runAnalysis(userId, scan, targetCommitSha);
        update = await this.repositoryUpdateService.recordArtifactsOwned(update.id, userId, {
          analysisId: analysis.analysisId
        });

        context = await this.runContextGeneration(userId, analysis, targetCommitSha);
        update = await this.repositoryUpdateService.recordArtifactsOwned(update.id, userId, {
          projectContextId: context.id
        });

        const finalState = await this.repositoryStateService.markCurrentProjectContext({
          repositoryId,
          userId,
          projectContextId: context.id,
          commitSha: targetCommitSha
        });
        update = await this.repositoryUpdateService.completeOwnedWithinLock(update.id, userId);

        return {
          noop: false,
          update,
          baseCommitSha,
          targetCommitSha,
          scanId: scan.id,
          analysisId: analysis.analysisId,
          projectContextId: context.id,
          freshnessStatus: finalState.freshnessStatus
        };
      } catch (error) {
        const failureReason = this.failureReasonForProgress({ scan, analysis, context });
        await this.repositoryStateService.markRemoteHeadObserved({
          repositoryId,
          userId,
          remoteHeadCommitSha: targetCommitSha
        });
        await this.repositoryUpdateService.failOwnedWithinLock(update.id, userId, failureReason);

        return Promise.reject(error);
      }
    });
  }

  private async createExecutionContext(input: {
    repositoryId: string;
    userId: string;
    baseCommitSha: string | null;
    targetCommitSha: string;
    changeSet: ChangeSet | null;
  }): Promise<RepositoryUpdateExecutionContext> {
    const pendingUpdate = await this.repositoryUpdateService.createPendingUpdate({
      repositoryId: input.repositoryId,
      userId: input.userId,
      triggerType: RepositoryUpdateTriggerType.MANUAL,
      baseCommitSha: input.baseCommitSha,
      targetCommitSha: input.targetCommitSha
    });
    const update = await this.repositoryUpdateService.startOwnedWithinLock(
      pendingUpdate.id,
      input.userId
    );

    return {
      update,
      changeSet: input.changeSet,
      changeSetUsableForIncrementalProcessing:
        input.changeSet?.completeness === ChangeSetCompleteness.COMPLETE
    };
  }

  private async runScan(
    repositoryId: string,
    userId: string,
    targetCommitSha: string
  ): Promise<ScanSnapshot> {
    const scan = await this.scanService.startScan({
      repositoryId,
      userId,
      reference: targetCommitSha
    });

    if (scan.status !== "COMPLETED" || scan.commitSha !== targetCommitSha) {
      throw new BadGatewayException("Repository update scan did not produce the target commit.");
    }

    return scan;
  }

  private async runAnalysis(
    userId: string,
    scan: ScanSnapshot,
    targetCommitSha: string
  ): Promise<AnalysisResult> {
    const analysis = await this.runAnalysisService.run({
      userId,
      scanId: scan.id
    });

    if (analysis.commitSha !== targetCommitSha) {
      throw new BadGatewayException("Repository update analysis did not match the target commit.");
    }

    return analysis;
  }

  private async runContextGeneration(
    userId: string,
    analysis: AnalysisResult,
    targetCommitSha: string
  ): Promise<PersistedProjectContext> {
    const context = await this.generateAndPersistProjectContextService.generate({
      userId,
      analysisId: analysis.analysisId
    });

    if (context.commitSha !== targetCommitSha) {
      throw new BadGatewayException("Repository update context did not match the target commit.");
    }

    return context;
  }

  private requireRemoteHead(state: RepositoryStateSnapshot): string {
    if (!state.remoteHeadCommitSha) {
      throw new BadGatewayException("Repository remote HEAD could not be resolved.");
    }

    return state.remoteHeadCommitSha;
  }

  private failureReasonForProgress(input: {
    scan: ScanSnapshot | null;
    analysis: AnalysisResult | null;
    context: PersistedProjectContext | null;
  }): RepositoryUpdateFailureReason {
    if (!input.scan) {
      return "SCAN_FAILED";
    }

    if (!input.analysis) {
      return "ANALYSIS_FAILED";
    }

    if (!input.context) {
      return "CONTEXT_GENERATION_FAILED";
    }

    return "CURRENT_CONTEXT_UPDATE_FAILED";
  }
}
