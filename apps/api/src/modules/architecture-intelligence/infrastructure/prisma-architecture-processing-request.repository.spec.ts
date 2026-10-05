import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaArchitectureProcessingRequestRepository } from "./prisma-architecture-processing-request.repository.js";

const now = new Date("2026-10-05T12:00:00.000Z");
const request = {
  id: "request-1",
  repositoryId: "repository-1",
  projectContextId: "context-1",
  processorVersion: "architecture-processor-1.0",
  status: "PENDING" as const,
  attemptCount: 0,
  nextAttemptAt: now,
  claimedBy: null,
  leaseUntil: null,
  startedAt: null,
  completedAt: null,
  lastFailureCategory: null,
  createdAt: now,
  updatedAt: now
};

describe("PrismaArchitectureProcessingRequestRepository", () => {
  it("persists a valid processing request and lets Prisma own defaults", async () => {
    const create = vi.fn().mockResolvedValue(request);
    const repository = makeRepository({ create });

    await expect(
      repository.create({
        repositoryId: "repository-1",
        projectContextId: "context-1",
        processorVersion: "architecture-processor-1.0"
      })
    ).resolves.toEqual(request);
    expect(create).toHaveBeenCalledWith({
      data: {
        repositoryId: "repository-1",
        projectContextId: "context-1",
        processorVersion: "architecture-processor-1.0"
      }
    });
  });

  it("scopes ID and context/version lookups to the repository", async () => {
    const findFirst = vi.fn().mockResolvedValue(request);
    const repository = makeRepository({ findFirst });

    await repository.findByRepositoryAndId("repository-1", "request-1");
    await repository.findByRepositoryContextAndProcessorVersion(
      "repository-1",
      "context-1",
      "architecture-processor-1.0"
    );

    expect(findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "request-1", repositoryId: "repository-1" }
    });
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        repositoryId: "repository-1",
        projectContextId: "context-1",
        processorVersion: "architecture-processor-1.0"
      }
    });
  });

  it.each(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "INCOMPATIBLE"] as const)(
    "persists the %s status through a repository-scoped update",
    async (status) => {
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const findFirst = vi.fn().mockResolvedValue({ ...request, status });
      const repository = makeRepository({ updateMany, findFirst });

      await expect(
        repository.updateStatus({ repositoryId: "repository-1", id: "request-1", status })
      ).resolves.toMatchObject({ status });
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: "request-1", repositoryId: "repository-1" },
        data: { status }
      });
    }
  );
});

function makeRepository(methods: Record<string, unknown>) {
  return new PrismaArchitectureProcessingRequestRepository({
    architectureProcessingRequest: methods
  } as unknown as PrismaService);
}
