import type { AnalysisResult } from "../../../analysis/domain/contracts/analysis-result.contract.js";
import type { ChangeSet } from "../../../change-sets/domain/change-set.js";
import type { PersistedProjectContext } from "../../../context/domain/contracts/project-context-repository.contract.js";
import type { ScanSnapshot } from "../../../scan/domain/contracts/scan-repository.contract.js";

export const REPOSITORY_INCREMENTAL_PROCESSOR = Symbol("REPOSITORY_INCREMENTAL_PROCESSOR");

export type IncrementalProcessingInput = {
  repositoryId: string;
  userId: string;
  baseCommitSha: string;
  targetCommitSha: string;
  changeSet: ChangeSet;
};

export enum IncrementalFallbackReason {
  INCOMPLETE_CHANGE_SET = "INCOMPLETE_CHANGE_SET",
  MISSING_BASE_CONTEXT = "MISSING_BASE_CONTEXT",
  MISSING_BASE_ARTIFACTS = "MISSING_BASE_ARTIFACTS",
  BASE_COMMIT_MISMATCH = "BASE_COMMIT_MISMATCH",
  UNSUPPORTED_CHANGE = "UNSUPPORTED_CHANGE",
  INSUFFICIENT_REPOSITORY_CONTENT = "INSUFFICIENT_REPOSITORY_CONTENT",
  INCREMENTAL_ARTIFACT_INVALID = "INCREMENTAL_ARTIFACT_INVALID"
}

export type IncrementalProcessingSummary = {
  totalTargetFiles: number;
  reusedFileCount: number;
  parsedFileCount: number;
  excludedFileCount: number;
  addedFileCount: number;
  modifiedFileCount: number;
  deletedFileCount: number;
  renamedFileCount: number;
  parsingWorkReduced: boolean;
  fallbackRequired: boolean;
  fallbackReason: IncrementalFallbackReason | null;
};

export type CompletedIncrementalProcessingResult = {
  outcome: "COMPLETED";
  targetCommitSha: string;
  scan: ScanSnapshot;
  analysis: AnalysisResult;
  projectContext: PersistedProjectContext;
  summary: IncrementalProcessingSummary;
};

export type IncrementalProcessingResult =
  | CompletedIncrementalProcessingResult
  | {
      outcome: "FALLBACK_REQUIRED";
      reason: IncrementalFallbackReason;
      summary: IncrementalProcessingSummary;
    };

export interface RepositoryIncrementalProcessor {
  process(input: IncrementalProcessingInput): Promise<IncrementalProcessingResult>;
}
