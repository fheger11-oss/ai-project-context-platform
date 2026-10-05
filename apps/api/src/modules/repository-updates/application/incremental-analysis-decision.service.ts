import { Injectable } from "@nestjs/common";

import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import {
  ChangeSetCompleteness,
  ComparisonStatus,
  FileChangeType
} from "../../change-sets/domain/change-set.js";
import {
  IncrementalAnalysisDecisionOutcome as Outcome,
  IncrementalAnalysisDecisionReason as Reason,
  IncrementalAnalysisStage as Stage,
  IncrementalAnalysisStageDisposition as Disposition,
  type IncrementalAnalysisDecisionInput,
  type IncrementalAnalysisDecisionResult,
  type IncrementalAnalysisStageDecision
} from "./contracts/incremental-analysis-decision.contract.js";

const SAFE_STAGE_POLICY: readonly IncrementalAnalysisStageDecision[] = Object.freeze([
  { stage: Stage.FILE_CLASSIFICATION, disposition: Disposition.RECOMPUTE },
  { stage: Stage.PROJECT_DETECTION, disposition: Disposition.RECOMPUTE },
  { stage: Stage.SOURCE_STRUCTURE, disposition: Disposition.REUSABLE },
  { stage: Stage.RELATIONSHIP_ANALYSIS, disposition: Disposition.RECOMPUTE },
  { stage: Stage.RESULT_AGGREGATION, disposition: Disposition.RECOMPUTE }
]);

@Injectable()
export class IncrementalAnalysisDecisionService {
  evaluate(input: IncrementalAnalysisDecisionInput): IncrementalAnalysisDecisionResult {
    if (input.changeSet.completeness !== ChangeSetCompleteness.COMPLETE)
      return this.fallback(Reason.INCOMPLETE_CHANGE_SET);
    if (input.changeSet.comparisonStatus !== ComparisonStatus.AHEAD)
      return this.fallback(Reason.UNSUPPORTED_COMPARISON);
    if (input.changeSet.baseCommitSha !== input.baseCommitSha)
      return this.fallback(Reason.BASE_COMMIT_MISMATCH);
    if (input.changeSet.targetCommitSha !== input.targetCommitSha)
      return this.fallback(Reason.TARGET_COMMIT_MISMATCH);
    if (!input.baseScan || !input.baseAnalysis) return this.fallback(Reason.MISSING_BASE_ARTIFACT);
    if (input.baseScan.status !== "COMPLETED" || input.baseAnalysisStatus !== "COMPLETED")
      return this.fallback(Reason.INCOMPLETE_BASE_ARTIFACT);
    if (
      input.baseScan.repositoryId !== input.repositoryId ||
      input.baseAnalysis.repositoryId !== input.repositoryId ||
      input.baseAnalysis.scanId !== input.baseScan.id ||
      input.baseAnalysisScanId !== input.baseScan.id ||
      input.baseScan.commitSha !== input.baseCommitSha ||
      input.baseAnalysis.commitSha !== input.baseCommitSha
    )
      return this.fallback(Reason.INVALID_ARTIFACT_PROVENANCE);
    if (
      input.baseAnalysis.analyzerVersion !== ANALYSIS_ENGINE_VERSION ||
      input.baseAnalysisAnalyzerVersion !== ANALYSIS_ENGINE_VERSION
    )
      return this.fallback(Reason.ANALYZER_VERSION_MISMATCH);

    const sourcePaths = input.baseAnalysis.sourceStructures.map((structure) => structure.path);
    if (
      new Set(sourcePaths).size !== sourcePaths.length ||
      sourcePaths.length !== input.baseAnalyzablePaths.size ||
      sourcePaths.some((path) => !input.baseAnalyzablePaths.has(path))
    )
      return this.fallback(Reason.SOURCE_STRUCTURE_MISMATCH);

    const touchedPaths = new Set<string>();
    for (const change of input.changeSet.files) {
      if (change.type === FileChangeType.COPIED) return this.fallback(Reason.UNSUPPORTED_CHANGE);
      if (touchedPaths.has(change.path)) return this.fallback(Reason.CONFLICTING_PATH_OPERATION);
      touchedPaths.add(change.path);
      if (change.type === FileChangeType.RENAMED) {
        if (!change.previousPath || touchedPaths.has(change.previousPath))
          return this.fallback(Reason.CONFLICTING_PATH_OPERATION);
        touchedPaths.add(change.previousPath);
      }
    }

    return {
      outcome: Outcome.PROCEED,
      reason: Reason.SAFE_FILE_LOCAL_REUSE,
      stages: SAFE_STAGE_POLICY
    };
  }

  private fallback(reason: Reason): IncrementalAnalysisDecisionResult {
    return { outcome: Outcome.FALLBACK_REQUIRED, reason, stages: SAFE_STAGE_POLICY };
  }
}
