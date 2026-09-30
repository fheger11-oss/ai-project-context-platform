import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaProjectDecisionRepository } from "./prisma-project-decision.repository.js";

describe("PrismaProjectDecisionRepository", () => {
  it("uses stable repository-scoped ordering and status filtering", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      projectDecision: { findMany, count },
      $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
    } as unknown as PrismaService;
    const repository = new PrismaProjectDecisionRepository(prisma);

    await repository.listByRepository({
      repositoryId: "repository01",
      status: "ACTIVE",
      page: 2,
      pageSize: 10
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { repositoryId: "repository01", status: "ACTIVE" },
      orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: 10,
      take: 10
    });
  });

  it("looks up relational provenance by both source and repository IDs", async () => {
    const contextFind = vi.fn().mockResolvedValue(null);
    const updateFind = vi.fn().mockResolvedValue(null);
    const repository = new PrismaProjectDecisionRepository({
      projectContext: { findFirst: contextFind },
      repositoryUpdate: { findFirst: updateFind }
    } as unknown as PrismaService);

    await repository.findProjectContextSource("repository01", "context0001");
    await repository.findRepositoryUpdateSource("repository01", "update00001");

    expect(contextFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "context0001", repositoryId: "repository01" } })
    );
    expect(updateFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "update00001", repositoryId: "repository01" } })
    );
  });

  it("updates through a repository-and-decision scoped predicate", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new PrismaProjectDecisionRepository({
      projectDecision: { updateMany }
    } as unknown as PrismaService);
    await expect(
      repository.updateByRepositoryAndId("repository01", "decision0001", { status: "ARCHIVED" })
    ).resolves.toBeNull();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "decision0001", repositoryId: "repository01" } })
    );
  });
});
