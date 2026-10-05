import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import type { ArchitectureFindingOccurrenceRecord } from "../domain/contracts/architecture-finding-occurrence-repository.contract.js";
import { PrismaArchitectureFindingOccurrenceRepository } from "./prisma-architecture-finding-occurrence.repository.js";

const now = new Date("2026-10-05T12:00:00.000Z");
const occurrence = {
  id: "occurrence-1",
  repositoryId: "repository-1",
  projectContextId: "context-1",
  processingRequestId: "request-1",
  fingerprint: "fingerprint-1",
  ruleId: "architecture.circular-dependency",
  ruleVersion: "1.0",
  confidence: "HIGH" as const,
  subject: { kind: "CYCLE", moduleIds: ["module:a", "module:b"] },
  evidence: [
    {
      kind: "MODULE_RELATIONSHIP",
      sourceModuleId: "module:a",
      targetModuleId: "module:b"
    }
  ],
  createdAt: now
} satisfies ArchitectureFindingOccurrenceRecord;

describe("PrismaArchitectureFindingOccurrenceRepository", () => {
  it("persists and restores typed JSON subject and evidence", async () => {
    const create = vi.fn().mockResolvedValue(occurrence);
    const repository = makeRepository({ create });

    await expect(repository.create(occurrence)).resolves.toEqual(occurrence);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subject: occurrence.subject,
        evidence: occurrence.evidence
      })
    });
  });

  it("keeps request and context queries repository-scoped", async () => {
    const findMany = vi.fn().mockResolvedValue([occurrence]);
    const repository = makeRepository({ findMany });

    await repository.listByRepositoryAndProcessingRequest("repository-1", "request-1");
    await repository.listByRepositoryAndProjectContext("repository-1", "context-1");

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { repositoryId: "repository-1", processingRequestId: "request-1" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { repositoryId: "repository-1", projectContextId: "context-1" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
  });
});

function makeRepository(methods: Record<string, unknown>) {
  return new PrismaArchitectureFindingOccurrenceRepository({
    architectureFindingOccurrence: methods
  } as unknown as PrismaService);
}
