import { Injectable } from "@nestjs/common";

import {
  REPOSITORY_PROCESSING_COMPLETED_EVENT,
  type RepositoryProcessingObservation
} from "./contracts/repository-processing-observation.contract.js";
import {
  RepositoryProcessingMode,
  RepositoryProcessingOutcome,
  type RepositoryProcessingResult
} from "./contracts/repository-processing-result.contract.js";

@Injectable()
export class RepositoryProcessingObservationMapper {
  map(result: RepositoryProcessingResult): RepositoryProcessingObservation {
    if (!("incrementalSummary" in result)) {
      return {
        event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
        mode: RepositoryProcessingMode.FULL,
        outcome: RepositoryProcessingOutcome.COMPLETED,
        targetCommitSha: result.targetCommitSha
      };
    }

    const summary = result.incrementalSummary;
    const summaryFields = {
      totalTargetFiles: summary.totalTargetFiles,
      reusedFileCount: summary.reusedFileCount,
      parsedFileCount: summary.parsedFileCount,
      excludedFileCount: summary.excludedFileCount,
      addedFileCount: summary.addedFileCount,
      modifiedFileCount: summary.modifiedFileCount,
      deletedFileCount: summary.deletedFileCount,
      renamedFileCount: summary.renamedFileCount,
      parsingWorkReduced: summary.parsingWorkReduced,
      fallbackRequired: summary.fallbackRequired,
      fallbackReason: summary.fallbackReason
    };

    if (result.outcome === RepositoryProcessingOutcome.FALLBACK_TO_FULL) {
      return {
        event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
        mode: RepositoryProcessingMode.FULL,
        outcome: RepositoryProcessingOutcome.FALLBACK_TO_FULL,
        targetCommitSha: result.targetCommitSha,
        ...summaryFields
      };
    }

    return {
      event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
      mode: RepositoryProcessingMode.INCREMENTAL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: result.targetCommitSha,
      ...summaryFields
    };
  }
}
