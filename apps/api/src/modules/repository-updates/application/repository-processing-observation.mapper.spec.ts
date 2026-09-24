import { describe, expect, it } from "vitest";

import { IncrementalFallbackReason } from "./contracts/repository-incremental-processor.contract.js";
import { REPOSITORY_PROCESSING_COMPLETED_EVENT } from "./contracts/repository-processing-observation.contract.js";
import {
  RepositoryProcessingMode,
  RepositoryProcessingOutcome,
  type RepositoryProcessingResult
} from "./contracts/repository-processing-result.contract.js";
import { RepositoryProcessingObservationMapper } from "./repository-processing-observation.mapper.js";

const summary = {
  totalTargetFiles: 100,
  reusedFileCount: 98,
  parsedFileCount: 2,
  excludedFileCount: 0,
  addedFileCount: 1,
  modifiedFileCount: 1,
  deletedFileCount: 0,
  renamedFileCount: 0,
  parsingWorkReduced: true,
  fallbackRequired: false,
  fallbackReason: null
} as const;

describe("RepositoryProcessingObservationMapper", () => {
  const mapper = new RepositoryProcessingObservationMapper();

  it("maps FULL / COMPLETED without inventing incremental fields", () => {
    const result: RepositoryProcessingResult = {
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "full-target"
    };

    expect(mapper.map(result)).toEqual({
      event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "full-target"
    });
  });

  it("preserves every incremental summary value without mutating the result", () => {
    const result: RepositoryProcessingResult = {
      mode: RepositoryProcessingMode.INCREMENTAL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "incremental-target",
      incrementalSummary: summary
    };
    const before = structuredClone(result);

    expect(mapper.map(result)).toEqual({
      event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
      mode: RepositoryProcessingMode.INCREMENTAL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "incremental-target",
      ...summary
    });
    expect(result).toEqual(before);
  });

  it("preserves fallback outcome and reason without provider or repository information", () => {
    const fallbackSummary = {
      ...summary,
      parsingWorkReduced: false,
      fallbackRequired: true,
      fallbackReason: IncrementalFallbackReason.UNSUPPORTED_CHANGE
    } as const;
    const observation = mapper.map({
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.FALLBACK_TO_FULL,
      targetCommitSha: "fallback-target",
      incrementalSummary: fallbackSummary
    });

    expect(observation).toEqual({
      event: REPOSITORY_PROCESSING_COMPLETED_EVENT,
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.FALLBACK_TO_FULL,
      targetCommitSha: "fallback-target",
      ...fallbackSummary
    });
    expect(JSON.stringify(observation).toLowerCase()).not.toMatch(
      /repositoryurl|github|owner|userid|filepath|sourcecode|credential|token|providerresponse/
    );
  });
});
