import { describe, expect, it, vi } from "vitest";

import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type { GetArchitectureHistoryComparisonService } from "./get-architecture-history-comparison.service.js";
import { ListArchitectureIntelligenceHistoryService } from "./list-architecture-intelligence-history.service.js";

describe("ListArchitectureIntelligenceHistoryService", () => {
  it("authorizes, preserves deterministic reader order, and exposes derived transition counts", async () => {
    const access = vi.fn(async () => ({}));
    const listHistory = vi.fn(async () => ({ items: [source()], total: 21 }));
    const execute = vi.fn(async () => ({
      status: "COMPARABLE" as const,
      currentProcessingRequestId: "request-1",
      previousProcessingRequestId: "request-0",
      lifecycle: [
        {
          lifecycle: "NEW" as const,
          fingerprint: "fp",
          ruleId: "architecture.circular-dependency",
          ruleVersion: "1.0",
          currentOccurrenceId: "occurrence-1"
        }
      ],
      addedModules: ["module:a"],
      removedModules: [],
      addedRelationships: [],
      removedRelationships: []
    }));
    const service = new ListArchitectureIntelligenceHistoryService(
      { findCurrent: vi.fn(), listHistory },
      { execute } as unknown as GetArchitectureHistoryComparisonService,
      { getScanAccessMetadataForUser: access } as unknown as RepositoriesService
    );
    const result = await service.execute({
      userId: "user-1",
      repositoryId: "repository-1",
      page: 2,
      pageSize: 10
    });
    expect(access).toHaveBeenCalledWith("user-1", "repository-1");
    expect(listHistory).toHaveBeenCalledWith({ repositoryId: "repository-1", skip: 10, take: 10 });
    expect(result).toMatchObject({
      items: [
        { compatibility: "COMPARABLE", transitions: { new: 1 }, changes: { addedModules: 1 } }
      ],
      pagination: { page: 2, total: 21, hasNextPage: true }
    });
  });

  it("does not query repository history when ownership fails", async () => {
    const listHistory = vi.fn();
    const service = new ListArchitectureIntelligenceHistoryService(
      { findCurrent: vi.fn(), listHistory },
      { execute: vi.fn() } as unknown as GetArchitectureHistoryComparisonService,
      {
        getScanAccessMetadataForUser: vi.fn(async () => {
          throw new Error("not found");
        })
      } as unknown as RepositoriesService
    );
    await expect(
      service.execute({ userId: "other", repositoryId: "repository-1", page: 1, pageSize: 20 })
    ).rejects.toThrow("not found");
    expect(listHistory).not.toHaveBeenCalled();
  });
});

function source() {
  const now = new Date("2026-10-05T12:00:00.000Z");
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
      status: "COMPLETED" as const,
      attemptCount: 1,
      nextAttemptAt: now,
      claimedBy: null,
      leaseUntil: null,
      startedAt: now,
      completedAt: now,
      lastFailureCategory: null,
      createdAt: now,
      updatedAt: now
    }
  };
}
