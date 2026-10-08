import { describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type { GetArchitectureHistoryComparisonService } from "./get-architecture-history-comparison.service.js";
import { GetCurrentArchitectureIntelligenceService } from "./get-current-architecture-intelligence.service.js";

describe("GetCurrentArchitectureIntelligenceService", () => {
  it("authorizes before returning an explicit no-processing state", async () => {
    const access = vi.fn(async () => ({}));
    const service = createService({ access, source: null });
    await expect(service.execute(query())).resolves.toEqual({
      processing: null,
      intelligence: null
    });
    expect(access).toHaveBeenCalledWith("user-1", "repository-1");
  });

  it.each(["PENDING", "PROCESSING", "FAILED", "INCOMPATIBLE"] as const)(
    "exposes %s without manufacturing completed intelligence",
    async (status) => {
      const service = createService({ source: source(status) });
      await expect(service.execute(query())).resolves.toMatchObject({
        processing: { status },
        intelligence: null
      });
    }
  );

  it("uses Sprint 4 lifecycle, filters findings, and paginates factual measurements", async () => {
    const service = createService({
      source: source("COMPLETED"),
      comparison: {
        status: "COMPARABLE",
        currentProcessingRequestId: "request-1",
        previousProcessingRequestId: "request-0",
        lifecycle: [
          {
            lifecycle: "NEW",
            fingerprint: "fp-1",
            ruleId: "architecture.circular-dependency",
            ruleVersion: "1.0",
            currentOccurrenceId: "occurrence-1"
          }
        ],
        addedModules: ["module:a"],
        removedModules: [],
        addedRelationships: [{ sourceModuleId: "module:a", targetModuleId: "module:b" }],
        removedRelationships: []
      }
    });
    const result = await service.execute(query({ confidence: "HIGH", lifecycle: "NEW" }));
    expect(result.intelligence).toMatchObject({
      compatibility: "COMPARABLE",
      summary: { moduleCount: 1, relationshipCount: 1, circularDependencyFindingCount: 1 },
      findings: { items: [{ occurrenceId: "occurrence-1", lifecycle: "NEW" }] },
      changes: { addedModules: ["module:a"] }
    });
  });
});

function createService(options: {
  access?: ReturnType<typeof vi.fn>;
  source: ReturnType<typeof source> | null;
  comparison?: object;
}) {
  const findings = [
    {
      id: "occurrence-1",
      repositoryId: "repository-1",
      projectContextId: "context-1",
      processingRequestId: "request-1",
      fingerprint: "fp-1",
      ruleId: "architecture.circular-dependency",
      ruleVersion: "1.0",
      applicability: null,
      confidence: "HIGH" as const,
      subject: { kind: "CYCLE" as const, moduleIds: ["module:a", "module:b"] },
      evidence: [],
      createdAt: new Date()
    }
  ];
  return new GetCurrentArchitectureIntelligenceService(
    { findCurrent: vi.fn(async () => options.source), listHistory: vi.fn() },
    {
      create: vi.fn(),
      listByRepositoryAndProcessingRequest: vi.fn(async (_repositoryId, requestId) =>
        requestId === "request-1" ? findings : []
      ),
      listByRepositoryAndProjectContext: vi.fn()
    },
    {
      create: vi.fn(),
      listByRepositoryAndProcessingRequest: vi.fn(async () => [
        {
          id: "measurement-1",
          repositoryId: "repository-1",
          projectContextId: "context-1",
          processingRequestId: "request-1",
          moduleId: "module:a",
          path: "a",
          confidence: "HIGH" as const,
          sourceFileCount: 1,
          declarationCount: 2,
          fanIn: 0,
          fanOut: 1,
          totalDegree: 1,
          relationshipCount: 1,
          createdAt: new Date()
        }
      ]),
      listByRepositoryAndProjectContext: vi.fn()
    },
    {
      execute: vi.fn(async () => options.comparison ?? { status: "NO_BASELINE" })
    } as unknown as GetArchitectureHistoryComparisonService,
    {
      getScanAccessMetadataForUser: options.access ?? vi.fn(async () => ({}))
    } as unknown as RepositoriesService
  );
}

function query(overrides = {}) {
  return {
    userId: "user-1",
    repositoryId: "repository-1",
    page: 1,
    pageSize: 20,
    modulePage: 1,
    modulePageSize: 20,
    ...overrides
  };
}
function source(status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "INCOMPATIBLE") {
  const now = new Date();
  return {
    historyId: "history-1",
    promotedAt: now,
    projectContextId: "context-1",
    commitSha: "abc",
    contextVersion: "context-1",
    analyzerVersion: "analyzer-1",
    request: {
      id: "request-1",
      repositoryId: "repository-1",
      projectContextId: "context-1",
      processorVersion: "processor-1",
      status,
      attemptCount: 1,
      nextAttemptAt: now,
      claimedBy: null,
      leaseUntil: null,
      startedAt: now,
      completedAt: status === "COMPLETED" ? now : null,
      lastFailureCategory: status === "FAILED" ? "PROCESSOR_FAILURE" : null,
      createdAt: now,
      updatedAt: now
    }
  };
}
