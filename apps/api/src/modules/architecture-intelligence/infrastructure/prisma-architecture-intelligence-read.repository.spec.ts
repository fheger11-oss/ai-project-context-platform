import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaArchitectureIntelligenceReadRepository } from "./prisma-architecture-intelligence-read.repository.js";

describe("PrismaArchitectureIntelligenceReadRepository", () => {
  it("scopes the current context and nested history to one repository", async () => {
    type FindFirstArgs = NonNullable<Parameters<PrismaService["repositoryState"]["findFirst"]>[0]>;
    const findFirst = vi.fn(async (_args: FindFirstArgs) => ({ currentProjectContext: context() }));
    const repository = new PrismaArchitectureIntelligenceReadRepository({
      repositoryState: { findFirst }
    } as unknown as PrismaService);

    await expect(repository.findCurrent("repository-a")).resolves.toMatchObject({
      projectContextId: "context-1",
      request: { repositoryId: "repository-a" }
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { repositoryId: "repository-a" } })
    );
    expect(findFirst.mock.calls[0]?.[0]).toMatchObject({
      select: {
        currentProjectContext: {
          select: {
            repositoryId: true,
            repositoryContextHistory: { where: { repositoryId: "repository-a" } },
            architectureProcessingRequests: { where: { repositoryId: "repository-a" } }
          }
        }
      }
    });
  });

  it("does not return a current context owned by another repository", async () => {
    const findFirst = vi.fn(async (_args: unknown) => ({
      currentProjectContext: context("repository-b")
    }));
    const repository = new PrismaArchitectureIntelligenceReadRepository({
      repositoryState: { findFirst }
    } as unknown as PrismaService);

    await expect(repository.findCurrent("repository-a")).resolves.toBeNull();
  });

  it("uses repository scope, deterministic ordering, and bounded history pagination", async () => {
    const count = vi.fn(async () => 1);
    const findMany = vi.fn(async () => [
      {
        id: "history-1",
        createdAt: new Date("2026-10-05T12:00:00.000Z"),
        projectContext: context()
      }
    ]);
    const repository = new PrismaArchitectureIntelligenceReadRepository({
      repositoryContextHistory: { count, findMany }
    } as unknown as PrismaService);

    await repository.listHistory({ repositoryId: "repository-a", skip: 20, take: 20 });
    expect(count).toHaveBeenCalledWith({ where: { repositoryId: "repository-a" } });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repositoryId: "repository-a" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 20,
        take: 20
      })
    );
  });
});

function context(repositoryId = "repository-a") {
  const now = new Date("2026-10-05T12:00:00.000Z");
  return {
    id: "context-1",
    repositoryId,
    commitSha: "abc123",
    contextVersion: "context-1",
    analysis: { analyzerVersion: "analyzer-1" },
    repositoryContextHistory: [{ id: "history-1", createdAt: now }],
    architectureProcessingRequests: [
      {
        id: "request-1",
        repositoryId,
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
    ]
  };
}
