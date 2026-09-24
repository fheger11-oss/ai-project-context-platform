import { describe, expect, it } from "vitest";

import { IncrementalFallbackReason } from "./contracts/repository-incremental-processor.contract.js";
import {
  RepositoryProcessingMode,
  RepositoryProcessingOutcome,
  type RepositoryProcessingResult
} from "./contracts/repository-processing-result.contract.js";
import { NoopRepositoryProcessingResultConsumer } from "./noop-repository-processing-result.consumer.js";

const summary = {
  totalTargetFiles: 3,
  reusedFileCount: 2,
  parsedFileCount: 1,
  excludedFileCount: 0,
  addedFileCount: 0,
  modifiedFileCount: 1,
  deletedFileCount: 0,
  renamedFileCount: 0,
  parsingWorkReduced: true,
  fallbackRequired: false,
  fallbackReason: null
} as const;

describe("NoopRepositoryProcessingResultConsumer", () => {
  const consumer = new NoopRepositoryProcessingResultConsumer();

  it.each<RepositoryProcessingResult>([
    {
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "target"
    },
    {
      mode: RepositoryProcessingMode.INCREMENTAL,
      outcome: RepositoryProcessingOutcome.COMPLETED,
      targetCommitSha: "target",
      incrementalSummary: summary
    },
    {
      mode: RepositoryProcessingMode.FULL,
      outcome: RepositoryProcessingOutcome.FALLBACK_TO_FULL,
      targetCommitSha: "target",
      incrementalSummary: {
        ...summary,
        parsingWorkReduced: false,
        fallbackRequired: true,
        fallbackReason: IncrementalFallbackReason.UNSUPPORTED_CHANGE
      }
    }
  ])("accepts $mode / $outcome without side effects", async (result) => {
    await expect(consumer.consume(result)).resolves.toBeUndefined();
  });
});
