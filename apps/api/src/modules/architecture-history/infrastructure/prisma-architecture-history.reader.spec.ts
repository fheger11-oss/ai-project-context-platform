import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaArchitectureHistoryReader } from "./prisma-architecture-history.reader.js";

describe("PrismaArchitectureHistoryReader", () => {
  it("reads only durable history for the requested repository in promotion order", async () => {
    const date = new Date("2026-09-30T10:00:00.000Z");
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "history0001",
        repositoryId: "repository01",
        createdAt: date,
        projectContext: {
          id: "context00001",
          analysisId: "analysis00001",
          scanId: "scan0000001",
          commitSha: "a".repeat(40),
          generatedAt: date,
          contextVersion: "context-engine@5.7.1",
          snapshot: { architecture: { claims: [] } },
          analysis: { analyzerVersion: "analysis-engine-4.10" }
        }
      }
    ]);
    const reader = new PrismaArchitectureHistoryReader({
      repositoryContextHistory: { findMany }
    } as unknown as PrismaService);

    await expect(reader.list("repository01")).resolves.toMatchObject([
      {
        historyId: "history0001",
        repositoryId: "repository01",
        analyzerVersion: "analysis-engine-4.10"
      }
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repositoryId: "repository01" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      })
    );
  });
});
