import { describe, expect, it, vi } from "vitest";

import type {
  ArchitectureHistoricalResultReader,
  ArchitecturePromotedResultSource
} from "../domain/contracts/architecture-historical-result-reader.contract.js";
import type { ArchitectureProcessingInputReader } from "../domain/contracts/architecture-processing-input-reader.contract.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import { processingInput } from "../testing/architecture-intelligence-fixtures.js";
import { GetArchitectureHistoryComparisonService } from "./get-architecture-history-comparison.service.js";

describe("GetArchitectureHistoryComparisonService", () => {
  it("uses only the immediately previous promoted candidate and does not skip an incompatible boundary", async () => {
    const sources = [
      source("older", [occurrence("cycle", "older")]),
      source("previous", []),
      source("current", [occurrence("cycle", "current")])
    ];
    const service = harness(sources, {
      "context-previous": { analyzerVersion: "incompatible-analysis" }
    });

    await expect(service.execute("repository-1", "request-current")).resolves.toEqual({
      status: "INCOMPATIBLE"
    });
  });

  it("derives recurring across a contiguous compatible sequence with an intervening absence", async () => {
    const sources = [
      source("older", [occurrence("cycle", "older")]),
      source("previous", []),
      source("current", [occurrence("cycle", "current")])
    ];
    const result = await harness(sources).execute("repository-1", "request-current");
    expect(result).toMatchObject({
      status: "COMPARABLE",
      lifecycle: [{ lifecycle: "RECURRING", fingerprint: "cycle" }]
    });
  });

  it("returns no baseline instead of searching past a promoted context without a completed result", async () => {
    const sources = [
      source("older", [occurrence("cycle", "older")]),
      source("previous", [], null),
      source("current", [occurrence("cycle", "current")])
    ];
    await expect(harness(sources).execute("repository-1", "request-current")).resolves.toEqual({
      status: "NO_BASELINE"
    });
  });
});

function harness(
  results: ArchitecturePromotedResultSource[],
  overrides: Record<string, { analyzerVersion?: string; contextVersion?: string }> = {}
) {
  const currentRequest = results.at(-1)?.request;
  if (!currentRequest) throw new Error("Current request fixture is missing.");
  const historyReader: ArchitectureHistoricalResultReader = {
    readThroughCurrent: vi.fn(async (repositoryId, processingRequestId) => {
      expect(repositoryId).toBe("repository-1");
      expect(processingRequestId).toBe(currentRequest.id);
      return { currentRequest, results };
    })
  };
  const inputReader: ArchitectureProcessingInputReader = {
    read: vi.fn(async (request) =>
      processingInput([], [], {
        repositoryId: request.repositoryId,
        projectContextId: request.projectContextId,
        analysisId: `analysis-${request.id}`,
        ...overrides[request.projectContextId]
      })
    )
  };
  return new GetArchitectureHistoryComparisonService(historyReader, inputReader);
}

function source(
  id: string,
  occurrences: ReturnType<typeof occurrence>[],
  request: ArchitectureProcessingRequestRecord | null = processingRequest(id)
): ArchitecturePromotedResultSource {
  return {
    historyId: `history-${id}`,
    promotedAt: new Date("2026-10-05T12:00:00.000Z"),
    projectContextId: `context-${id}`,
    request,
    occurrences
  };
}

function occurrence(fingerprint: string, id: string) {
  return {
    id,
    fingerprint,
    ruleId: "architecture.circular-dependency",
    ruleVersion: "1.0"
  };
}

function processingRequest(id: string): ArchitectureProcessingRequestRecord {
  const now = new Date("2026-10-05T12:00:00.000Z");
  return {
    id: `request-${id}`,
    repositoryId: "repository-1",
    projectContextId: `context-${id}`,
    processorVersion: "architecture-processor-1.0",
    status: "COMPLETED",
    attemptCount: 1,
    nextAttemptAt: now,
    claimedBy: null,
    leaseUntil: null,
    startedAt: now,
    completedAt: now,
    lastFailureCategory: null,
    createdAt: now,
    updatedAt: now
  };
}
