import type { AnalysisStatus } from "../../../analysis/domain/analysis-status.js";
import type { AnalysisResult } from "../../../analysis/domain/contracts/analysis-result.contract.js";
import type { ChangeSet } from "../../../change-sets/domain/change-set.js";
import type { ScanSnapshot } from "../../../scan/domain/contracts/scan-repository.contract.js";

export enum IncrementalAnalysisStage {
  FILE_CLASSIFICATION = "FILE_CLASSIFICATION",
  PROJECT_DETECTION = "PROJECT_DETECTION",
  SOURCE_STRUCTURE = "SOURCE_STRUCTURE",
  RELATIONSHIP_ANALYSIS = "RELATIONSHIP_ANALYSIS",
  RESULT_AGGREGATION = "RESULT_AGGREGATION"
}

export enum IncrementalAnalysisStageDisposition {
  REUSABLE = "REUSABLE",
  RECOMPUTE = "RECOMPUTE",
  UNKNOWN = "UNKNOWN"
}

export enum IncrementalAnalysisDecisionOutcome {
  PROCEED = "PROCEED",
  FALLBACK_REQUIRED = "FALLBACK_REQUIRED"
}

export enum IncrementalAnalysisDecisionReason {
  SAFE_FILE_LOCAL_REUSE = "SAFE_FILE_LOCAL_REUSE",
  INCOMPLETE_CHANGE_SET = "INCOMPLETE_CHANGE_SET",
  UNSUPPORTED_COMPARISON = "UNSUPPORTED_COMPARISON",
  UNSUPPORTED_CHANGE = "UNSUPPORTED_CHANGE",
  CONFLICTING_PATH_OPERATION = "CONFLICTING_PATH_OPERATION",
  MISSING_BASE_ARTIFACT = "MISSING_BASE_ARTIFACT",
  INCOMPLETE_BASE_ARTIFACT = "INCOMPLETE_BASE_ARTIFACT",
  INVALID_ARTIFACT_PROVENANCE = "INVALID_ARTIFACT_PROVENANCE",
  ANALYZER_VERSION_MISMATCH = "ANALYZER_VERSION_MISMATCH",
  BASE_COMMIT_MISMATCH = "BASE_COMMIT_MISMATCH",
  TARGET_COMMIT_MISMATCH = "TARGET_COMMIT_MISMATCH",
  SOURCE_STRUCTURE_MISMATCH = "SOURCE_STRUCTURE_MISMATCH"
}

export type IncrementalAnalysisStageDecision = Readonly<{
  stage: IncrementalAnalysisStage;
  disposition: IncrementalAnalysisStageDisposition;
}>;

export type IncrementalAnalysisDecisionInput = Readonly<{
  repositoryId: string;
  baseCommitSha: string;
  targetCommitSha: string;
  changeSet: ChangeSet;
  baseScan: ScanSnapshot | null;
  baseAnalysis: AnalysisResult | null;
  baseAnalysisStatus: AnalysisStatus | null;
  baseAnalysisScanId: string | null;
  baseAnalysisAnalyzerVersion: string | null;
  baseAnalyzablePaths: ReadonlySet<string>;
}>;

export type IncrementalAnalysisDecisionResult = Readonly<{
  outcome: IncrementalAnalysisDecisionOutcome;
  reason: IncrementalAnalysisDecisionReason;
  stages: readonly IncrementalAnalysisStageDecision[];
}>;
