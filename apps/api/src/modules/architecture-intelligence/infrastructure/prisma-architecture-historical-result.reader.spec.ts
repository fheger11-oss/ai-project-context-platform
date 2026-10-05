import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaArchitectureHistoricalResultReader } from "./prisma-architecture-historical-result.reader.js";

describe("PrismaArchitectureHistoricalResultReader", () => {
  it("reads only repository-scoped promoted results in deterministic order through current", async () => {
    const current = storedRequest("request-2", "context-2");
    const findFirst = vi.fn(async () => current);
    const findMany = vi.fn(async () => [
      history("history-1", "context-1", [storedRequest("request-1", "context-1")]),
      history("history-2", "context-2", [current]),
      history("history-3", "context-3", [storedRequest("request-3", "context-3")])
    ]);
    const reader = new PrismaArchitectureHistoricalResultReader({
      architectureProcessingRequest: { findFirst },
      repositoryContextHistory: { findMany }
    } as unknown as PrismaService);

    const result = await reader.readThroughCurrent("repository-1", "request-2");

    expect(result.results.map((item) => item.historyId)).toEqual(["history-1", "history-2"]);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-2", repositoryId: "repository-1", status: "COMPLETED" }
      })
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repositoryId: "repository-1" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      })
    );
  });

  it("rejects a request from another repository or an unpromoted context", async () => {
    const missingReader = harness(null, []);
    await expect(missingReader.readThroughCurrent("repository-1", "request-2")).rejects.toThrow(
      /not found for repository/
    );

    const unpromotedReader = harness(storedRequest("request-2", "context-2"), [
      history("history-1", "context-1", [])
    ]);
    await expect(unpromotedReader.readThroughCurrent("repository-1", "request-2")).rejects.toThrow(
      /does not belong to a promoted context/
    );
  });

  it("preserves a missing immediately previous completed result as a lifecycle boundary", async () => {
    const current = storedRequest("request-2", "context-2");
    const reader = harness(current, [
      history("history-1", "context-1", []),
      history("history-2", "context-2", [current])
    ]);
    const result = await reader.readThroughCurrent("repository-1", "request-2");
    expect(result.results[0]?.request).toBeNull();
  });
});

function harness(current: ReturnType<typeof storedRequest> | null, histories: unknown[]) {
  return new PrismaArchitectureHistoricalResultReader({
    architectureProcessingRequest: { findFirst: vi.fn(async () => current) },
    repositoryContextHistory: { findMany: vi.fn(async () => histories) }
  } as unknown as PrismaService);
}

function history(
  id: string,
  projectContextId: string,
  requests: ReturnType<typeof storedRequest>[]
) {
  return {
    id,
    createdAt: new Date(`2026-10-0${id.at(-1)}T12:00:00.000Z`),
    projectContextId,
    projectContext: { architectureProcessingRequests: requests }
  };
}

function storedRequest(id: string, projectContextId: string) {
  return {
    id,
    repositoryId: "repository-1",
    projectContextId,
    processorVersion: "architecture-processor-1.0",
    status: "COMPLETED" as const,
    attemptCount: 1,
    nextAttemptAt: new Date("2026-10-01T12:00:00.000Z"),
    claimedBy: null,
    leaseUntil: null,
    startedAt: new Date("2026-10-01T12:00:00.000Z"),
    completedAt: new Date("2026-10-01T12:01:00.000Z"),
    lastFailureCategory: null,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:01:00.000Z"),
    findingOccurrences: [
      {
        id: `occurrence-${id}`,
        fingerprint: `fingerprint-${id}`,
        ruleId: "architecture.circular-dependency",
        ruleVersion: "1.0"
      }
    ]
  };
}
