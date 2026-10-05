import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaArchitectureModuleMeasurementRepository } from "./prisma-architecture-module-measurement.repository.js";

const measurement = {
  id: "measurement-1",
  repositoryId: "repository-1",
  projectContextId: "context-1",
  processingRequestId: "request-1",
  moduleId: "module:src/api",
  path: "src/api",
  confidence: "HIGH" as const,
  sourceFileCount: 12,
  declarationCount: 47,
  fanIn: 4,
  fanOut: 7,
  totalDegree: 11,
  relationshipCount: 15,
  createdAt: new Date("2026-10-05T12:00:00.000Z")
};

describe("PrismaArchitectureModuleMeasurementRepository", () => {
  it("persists every raw module measurement field", async () => {
    const create = vi.fn().mockResolvedValue(measurement);
    const repository = makeRepository({ create });
    const { id: _id, createdAt: _createdAt, ...input } = measurement;

    await expect(repository.create(input)).resolves.toEqual(measurement);
    expect(create).toHaveBeenCalledWith({ data: input });
  });

  it("keeps request and context queries repository-scoped", async () => {
    const findMany = vi.fn().mockResolvedValue([measurement]);
    const repository = makeRepository({ findMany });

    await repository.listByRepositoryAndProcessingRequest("repository-1", "request-1");
    await repository.listByRepositoryAndProjectContext("repository-1", "context-1");

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { repositoryId: "repository-1", processingRequestId: "request-1" },
      orderBy: [{ moduleId: "asc" }, { id: "asc" }]
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { repositoryId: "repository-1", projectContextId: "context-1" },
      orderBy: [{ moduleId: "asc" }, { id: "asc" }]
    });
  });
});

function makeRepository(methods: Record<string, unknown>) {
  return new PrismaArchitectureModuleMeasurementRepository({
    architectureModuleMeasurement: methods
  } as unknown as PrismaService);
}
