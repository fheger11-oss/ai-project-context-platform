import type { IncrementalProcessingSummary } from "./repository-incremental-processor.contract.js";

export enum RepositoryProcessingMode {
  FULL = "FULL",
  INCREMENTAL = "INCREMENTAL"
}

export enum RepositoryProcessingOutcome {
  COMPLETED = "COMPLETED",
  FALLBACK_TO_FULL = "FALLBACK_TO_FULL"
}

type CompletedFullProcessingResult = Readonly<{
  mode: RepositoryProcessingMode.FULL;
  outcome: RepositoryProcessingOutcome.COMPLETED;
  targetCommitSha: string;
}>;

type CompletedIncrementalRepositoryProcessingResult = Readonly<{
  mode: RepositoryProcessingMode.INCREMENTAL;
  outcome: RepositoryProcessingOutcome.COMPLETED;
  targetCommitSha: string;
  incrementalSummary: Readonly<IncrementalProcessingSummary>;
}>;

type FallbackRepositoryProcessingResult = Readonly<{
  mode: RepositoryProcessingMode.FULL;
  outcome: RepositoryProcessingOutcome.FALLBACK_TO_FULL;
  targetCommitSha: string;
  incrementalSummary: Readonly<IncrementalProcessingSummary>;
}>;

export type RepositoryProcessingResult =
  | CompletedFullProcessingResult
  | CompletedIncrementalRepositoryProcessingResult
  | FallbackRepositoryProcessingResult;
