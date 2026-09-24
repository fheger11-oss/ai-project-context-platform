import type { IncrementalProcessingSummary } from "./repository-incremental-processor.contract.js";
import type {
  RepositoryProcessingMode,
  RepositoryProcessingOutcome
} from "./repository-processing-result.contract.js";

export const REPOSITORY_PROCESSING_COMPLETED_EVENT = "repository.processing.completed";

type RepositoryProcessingObservationBase = Readonly<{
  event: typeof REPOSITORY_PROCESSING_COMPLETED_EVENT;
  mode: RepositoryProcessingMode;
  outcome: RepositoryProcessingOutcome;
  targetCommitSha: string;
}>;

type FullProcessingObservation = RepositoryProcessingObservationBase &
  Readonly<{
    mode: RepositoryProcessingMode.FULL;
    outcome: RepositoryProcessingOutcome.COMPLETED;
  }>;

type IncrementalProcessingObservation = RepositoryProcessingObservationBase &
  Readonly<{
    mode: RepositoryProcessingMode.INCREMENTAL;
    outcome: RepositoryProcessingOutcome.COMPLETED;
  }> &
  Readonly<IncrementalProcessingSummary>;

type FallbackProcessingObservation = RepositoryProcessingObservationBase &
  Readonly<{
    mode: RepositoryProcessingMode.FULL;
    outcome: RepositoryProcessingOutcome.FALLBACK_TO_FULL;
  }> &
  Readonly<IncrementalProcessingSummary>;

export type RepositoryProcessingObservation =
  FullProcessingObservation | IncrementalProcessingObservation | FallbackProcessingObservation;
