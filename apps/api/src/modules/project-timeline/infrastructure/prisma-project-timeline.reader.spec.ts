import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaProjectTimelineReader } from "./prisma-project-timeline.reader.js";

const date = new Date("2026-09-30T10:00:00.000Z");

function harness() {
  const repository = {
    id: "repository01",
    name: "ctxaro",
    fullName: "owner/ctxaro",
    createdAt: date
  };
  const update = {
    id: "update00001",
    repositoryId: "repository01",
    triggerType: "MANUAL" as const,
    status: "COMPLETED" as const,
    baseCommitSha: "a".repeat(40),
    targetCommitSha: "b".repeat(40),
    startedAt: date,
    completedAt: date,
    failedAt: null,
    scanId: "scan000001",
    analysisId: "analysis0001",
    projectContextId: "context0001",
    createdAt: date
  };
  const promotion = {
    id: "history0001",
    repositoryId: "repository01",
    createdAt: date,
    projectContext: {
      id: "context0002",
      contextId: "context:analysis0002:context-engine@1",
      contextVersion: "context-engine@1",
      generatedAt: date,
      commitSha: "c".repeat(40),
      scanId: "scan000002",
      analysisId: "analysis0002"
    }
  };
  const decision = {
    id: "decision001",
    repositoryId: "repository01",
    title: "Database",
    affectedArea: "Infrastructure",
    status: "ACTIVE" as const,
    decidedAt: date,
    sourceProjectContextId: null,
    sourceRepositoryUpdateId: null,
    sourceCommitSha: null
  };
  const findRepository = vi.fn().mockResolvedValue(repository);
  const findUpdates = vi.fn().mockResolvedValue([update]);
  const findPromotions = vi.fn().mockResolvedValue([promotion]);
  const findDecisions = vi.fn().mockResolvedValue([decision]);
  const updateCount = vi.fn().mockResolvedValue(1);
  const promotionCount = vi.fn().mockResolvedValue(1);
  const decisionCount = vi.fn().mockResolvedValue(1);
  const prisma = {
    repository: { findFirst: findRepository },
    repositoryUpdate: { findMany: findUpdates, count: updateCount },
    repositoryContextHistory: { findMany: findPromotions, count: promotionCount },
    projectDecision: { findMany: findDecisions, count: decisionCount },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  } as unknown as PrismaService;

  return {
    reader: new PrismaProjectTimelineReader(prisma),
    findRepository,
    findUpdates,
    findPromotions,
    findDecisions,
    updateCount,
    promotionCount,
    decisionCount
  };
}

describe("PrismaProjectTimelineReader", () => {
  it("reads bounded candidates and exact counts from each repository-scoped source", async () => {
    const h = harness();

    await expect(
      h.reader.readCandidates({ repositoryId: "repository01", take: 40 })
    ).resolves.toMatchObject({
      repository: { id: "repository01", createdAt: date },
      updates: [{ id: "update00001", createdAt: date }],
      contextPromotions: [{ id: "history0001", createdAt: date }],
      decisions: [{ id: "decision001", decidedAt: date }],
      totals: { updates: 1, contextPromotions: 1, decisions: 1 }
    });

    expect(h.findRepository).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "repository01" } })
    );
    expect(h.findUpdates).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repositoryId: "repository01" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 40
      })
    );
    expect(h.findDecisions).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repositoryId: "repository01" },
        orderBy: [{ decidedAt: "desc" }, { id: "desc" }],
        take: 40
      })
    );
  });

  it("deduplicates promoted contexts through the exact same-repository update relation", async () => {
    const h = harness();
    await h.reader.readCandidates({ repositoryId: "repository01", take: 20 });

    const expectedWhere = {
      repositoryId: "repository01",
      projectContext: {
        repositoryUpdates: {
          none: { repositoryId: "repository01" }
        }
      }
    };
    expect(h.findPromotions).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere, take: 20 })
    );
    expect(h.promotionCount).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it("does not query any source without the requested repository boundary", async () => {
    const h = harness();
    await h.reader.readCandidates({ repositoryId: "repository02", take: 20 });

    expect(h.findRepository).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "repository02" } })
    );
    for (const query of [
      h.findUpdates,
      h.findPromotions,
      h.findDecisions,
      h.updateCount,
      h.promotionCount,
      h.decisionCount
    ]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ repositoryId: "repository02" })
        })
      );
    }
  });
});
