import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaProjectKnowledgeRepository } from "./prisma-project-knowledge.repository.js";

describe("PrismaProjectKnowledgeRepository", () => {
  it("lets Prisma generate a valid durable ID instead of accepting one in create input", async () => {
    const generatedId = "cm1234567890abcdef123456";
    const create = vi.fn().mockImplementation(({ data }) => ({
      ...data,
      id: generatedId,
      status: "ACTIVE",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-01T00:00:00.000Z")
    }));
    const repository = new PrismaProjectKnowledgeRepository({
      projectKnowledge: { create }
    } as unknown as PrismaService);

    const result = await repository.create({
      repositoryId: "repository01",
      content: "Durable fact",
      origin: "USER_AUTHORED",
      kind: "USER_ASSERTED",
      sourceType: "USER",
      confidence: null,
      sourceProjectContextId: null,
      sourceProjectDecisionId: null,
      verifiedAt: null
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ id: expect.anything() })
    });
    expect(result.id).toBe(generatedId);
    expect(result.id).toMatch(/^[a-z0-9]+$/i);
    expect(result.id.length).toBeGreaterThanOrEqual(10);
    expect(result.id.length).toBeLessThanOrEqual(32);
  });
});
