import type { ArchitectureProcessingRequestRecord } from "./architecture-processing-request-repository.contract.js";

export const ARCHITECTURE_HISTORICAL_RESULT_READER = Symbol(
  "ARCHITECTURE_HISTORICAL_RESULT_READER"
);

export type ArchitectureHistoricalOccurrenceReference = {
  id: string;
  fingerprint: string;
  ruleId: string;
  ruleVersion: string;
};

export type ArchitecturePromotedResultSource = {
  historyId: string;
  promotedAt: Date;
  projectContextId: string;
  request: ArchitectureProcessingRequestRecord | null;
  occurrences: readonly ArchitectureHistoricalOccurrenceReference[];
};

export type ArchitectureHistoricalResultSequence = {
  currentRequest: ArchitectureProcessingRequestRecord;
  results: readonly ArchitecturePromotedResultSource[];
};

export interface ArchitectureHistoricalResultReader {
  readThroughCurrent(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureHistoricalResultSequence>;
}
