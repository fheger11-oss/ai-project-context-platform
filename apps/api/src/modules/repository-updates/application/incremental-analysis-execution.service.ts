import { Inject, Injectable } from "@nestjs/common";

import {
  RunAnalysisService,
  type RunAnalysisCommand
} from "../../analysis/application/run-analysis.service.js";
import type { SourceStructureProcessingObserver } from "../../analysis/application/source-structure-analysis.service.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { SourceFileStructure } from "../../analysis/domain/source-structure/source-file-structure.js";
import {
  IncrementalAnalysisDecisionOutcome,
  IncrementalAnalysisStage,
  IncrementalAnalysisStageDisposition,
  type IncrementalAnalysisDecisionResult
} from "./contracts/incremental-analysis-decision.contract.js";

@Injectable()
export class IncrementalAnalysisExecutionService {
  constructor(
    @Inject(RunAnalysisService)
    private readonly analyses: RunAnalysisService
  ) {}

  async execute(
    command: RunAnalysisCommand,
    decision: IncrementalAnalysisDecisionResult,
    reusableSourceStructures: ReadonlyMap<string, SourceFileStructure>,
    observer?: SourceStructureProcessingObserver
  ): Promise<AnalysisResult> {
    if (
      decision.outcome !== IncrementalAnalysisDecisionOutcome.PROCEED ||
      !this.hasRequiredStagePolicy(decision)
    ) {
      throw new Error("Incremental analysis execution requires a safe PROCEED decision.");
    }

    return this.analyses.runWithSourceStructureReuse(command, reusableSourceStructures, observer);
  }

  private hasRequiredStagePolicy(decision: IncrementalAnalysisDecisionResult): boolean {
    const dispositions = new Map(
      decision.stages.map(({ stage, disposition }) => [stage, disposition])
    );
    return (
      dispositions.size === 5 &&
      dispositions.get(IncrementalAnalysisStage.SOURCE_STRUCTURE) ===
        IncrementalAnalysisStageDisposition.REUSABLE &&
      dispositions.get(IncrementalAnalysisStage.FILE_CLASSIFICATION) ===
        IncrementalAnalysisStageDisposition.RECOMPUTE &&
      dispositions.get(IncrementalAnalysisStage.PROJECT_DETECTION) ===
        IncrementalAnalysisStageDisposition.RECOMPUTE &&
      dispositions.get(IncrementalAnalysisStage.RELATIONSHIP_ANALYSIS) ===
        IncrementalAnalysisStageDisposition.RECOMPUTE &&
      dispositions.get(IncrementalAnalysisStage.RESULT_AGGREGATION) ===
        IncrementalAnalysisStageDisposition.RECOMPUTE
    );
  }
}
