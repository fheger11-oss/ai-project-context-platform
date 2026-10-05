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

  it("claims pending or expired work with a conditional atomic update", async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: "request-1", repositoryId: "repository-1", startedAt: null })
      .mockResolvedValueOnce({ ...request, status: "PROCESSING", attemptCount: 1 });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = makeRepository({ findFirst, updateMany });
    const leaseUntil = new Date(now.getTime() + 90_000);

    await expect(repository.claim("worker-1", now, leaseUntil)).resolves.toMatchObject({
      status: "PROCESSING",
      attemptCount: 1
    });
    const eligibility = {
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PROCESSING", leaseUntil: { lt: now } }
      ]
    };
    expect(findFirst).toHaveBeenNthCalledWith(1, {
      where: eligibility,
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      select: { id: true, repositoryId: true, startedAt: true }
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "request-1", repositoryId: "repository-1", ...eligibility },
      data: {
        status: "PROCESSING",
        claimedBy: "worker-1",
        leaseUntil,
        startedAt: now,
        attemptCount: { increment: 1 }
      }
    });
  });

  it("allows only one concurrent claimant to win the conditional update", async () => {
    const candidate = { id: "request-1", repositoryId: "repository-1", startedAt: null };
    const findFirst = vi.fn(async (args: { select?: unknown }) =>
      args.select ? candidate : { ...request, status: "PROCESSING", attemptCount: 1 }
    );
    let updateCalls = 0;
    const updateMany = vi.fn(async () => ({ count: updateCalls++ === 0 ? 1 : 0 }));
    const repository = makeRepository({ findFirst, updateMany });

    const results = await Promise.all([
      repository.claim("worker-1", now, new Date(now.getTime() + 90_000)),
      repository.claim("worker-2", now, new Date(now.getTime() + 90_000))
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(updateMany).toHaveBeenCalledTimes(6);
  });

  it("renews a lease only for its unexpired repository-scoped owner", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = makeRepository({ updateMany });
    const leaseUntil = new Date(now.getTime() + 90_000);

    await expect(
      repository.renewLease(
        { id: "request-1", repositoryId: "repository-1", workerId: "worker-1", now },
        leaseUntil
      )
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "request-1",
        repositoryId: "repository-1",
        status: "PROCESSING",
        claimedBy: "worker-1",
        leaseUntil: { gt: now }
      },
      data: { leaseUntil }
    });
  });

  it("rejects stale heartbeat and completion mutations", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn().mockResolvedValue({ ...request, status: "PROCESSING" });
    const repository = makeRepository({ updateMany, findFirst });
    const owned = {
      id: "request-1",
      repositoryId: "repository-1",
      workerId: "stale-worker",
      now
    };

    await expect(repository.renewLease(owned, new Date(now.getTime() + 90_000))).resolves.toBe(
      false
    );
    await expect(repository.complete(owned)).resolves.toBe(false);
  });

  it("persists retry, terminal failure, completion, and incompatibility transitions", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = makeRepository({ updateMany });
    const owned = {
      id: "request-1",
      repositoryId: "repository-1",
      workerId: "worker-1",
      now
    };
    const nextAttemptAt = new Date(now.getTime() + 30_000);

    await expect(
      repository.retry({
        ...owned,
        nextAttemptAt,
        failureCategory: "TRANSIENT"
      })
    ).resolves.toBe(true);
    await expect(repository.fail({ ...owned, failureCategory: "TERMINAL" })).resolves.toBe(true);
    await expect(repository.complete(owned)).resolves.toBe(true);
    await expect(repository.markIncompatible(owned)).resolves.toBe(true);

    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: {
          status: "PENDING",
          nextAttemptAt,
          claimedBy: null,
          leaseUntil: null,
          lastFailureCategory: "TRANSIENT"
        }
      })
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: {
          status: "FAILED",
          completedAt: now,
          claimedBy: null,
          leaseUntil: null,
          lastFailureCategory: "TERMINAL"
        }
      })
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: {
          status: "COMPLETED",
          completedAt: now,
          claimedBy: null,
          leaseUntil: null,
          lastFailureCategory: null
        }
      })
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        data: {
          status: "INCOMPATIBLE",
          completedAt: now,
          claimedBy: null,
          leaseUntil: null,
          lastFailureCategory: null
        }
      })
    );
  });
});

function makeRepository(methods: Record<string, unknown>) {
  return new PrismaArchitectureProcessingRequestRepository({
    architectureProcessingRequest: methods
  } as unknown as PrismaService);
}
