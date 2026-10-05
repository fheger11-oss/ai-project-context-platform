import { describe, expect, it, vi } from "vitest";

import {
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { PrismaRepositoryUpdateRepository } from "./prisma-repository-update.repository.js";

const now = new Date("2026-09-23T12:00:00.000Z");

function createRecord(overrides: Partial<RepositoryUpdateRecord> = {}): RepositoryUpdateRecord {
  return {
    id: "update_1",
    repositoryId: "repository_1",
    triggerType: RepositoryUpdateTriggerType.MANUAL,
    baseCommitSha: "commit_a",
    targetCommitSha: "commit_b",
    status: RepositoryUpdateStatus.COMPLETED,
    startedAt: now,
    completedAt: now,
    failedAt: null,
    failureReason: null,
    scanId: "scan_1",
    analysisId: "analysis_1",
    projectContextId: "context_1",
    changeSet: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository(prisma: Partial<PrismaService>) {
  return new PrismaRepositoryUpdateRepository(prisma as PrismaService);
}

describe("PrismaRepositoryUpdateRepository read methods", () => {
  it("finds an update scoped to a repository", async () => {
    const findFirst = vi.fn(async () => createRecord());
    const repository = createRepository({
      repositoryUpdate: {
        findFirst
      }
    } as unknown as PrismaService);

    await expect(
      repository.findByRepositoryAndId("repository_1", "update_1")
    ).resolves.toMatchObject({
      id: "update_1",
      repositoryId: "repository_1"
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "update_1",
        repositoryId: "repository_1"
      }
    });
  });

  it("lists updates with deterministic repository ordering and pagination", async () => {
    const records = [createRecord({ id: "update_2" }), createRecord({ id: "update_1" })];
    const transaction = vi.fn(async () => [records, 12]);
    const findMany = vi.fn();
    const count = vi.fn();
    const repository = createRepository({
      $transaction: transaction,
      repositoryUpdate: {
        findMany,
        count
      }
    } as unknown as PrismaService);

    await expect(
      repository.listByRepository({ repositoryId: "repository_1", page: 2, pageSize: 5 })
    ).resolves.toMatchObject({
      items: [{ id: "update_2" }, { id: "update_1" }],
      total: 12
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { repositoryId: "repository_1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 5,
      take: 5
    });
    expect(count).toHaveBeenCalledWith({
      where: { repositoryId: "repository_1" }
    });
  });

  it("finds the current pending or running update deterministically", async () => {
    const findFirst = vi.fn(async () =>
      createRecord({ status: RepositoryUpdateStatus.RUNNING, completedAt: null })
    );
    const repository = createRepository({
      repositoryUpdate: {
        findFirst
      }
    } as unknown as PrismaService);

    await repository.findCurrentByRepository("repository_1");

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        repositoryId: "repository_1",
        status: { in: [RepositoryUpdateStatus.PENDING, RepositoryUpdateStatus.RUNNING] }
      },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }]
    });
  });
});

describe("PrismaRepositoryUpdateRepository recovery", () => {
  it("conditionally recovers only an old RUNNING update", async () => {
    const staleBeforeOrAt = new Date("2026-09-23T06:00:00.000Z");
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const findUnique = vi.fn(async () =>
      createRecord({
        status: RepositoryUpdateStatus.FAILED,
        completedAt: null,
        failedAt: now,
        failureReason: "STALE_UPDATE_RECOVERED"
      })
    );
    const repository = createRepository({
      repositoryUpdate: { updateMany, findUnique }
    } as unknown as PrismaService);

    await expect(
      repository.recoverStaleRunning({
        updateId: "update_1",
        repositoryId: "repository_1",
        staleBeforeOrAt,
        failedAt: now,
        failureReason: "STALE_UPDATE_RECOVERED"
      })
    ).resolves.toMatchObject({
      status: RepositoryUpdateStatus.FAILED,
      failureReason: "STALE_UPDATE_RECOVERED"
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "update_1",
        repositoryId: "repository_1",
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: { lte: staleBeforeOrAt }
      },
      data: {
        status: RepositoryUpdateStatus.FAILED,
        failedAt: now,
        failureReason: "STALE_UPDATE_RECOVERED"
      }
    });
  });

  it("does not read a result when the conditional recovery loses a race", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const findUnique = vi.fn();
    const repository = createRepository({
      repositoryUpdate: { updateMany, findUnique }
    } as unknown as PrismaService);

    await expect(
      repository.recoverStaleRunning({
        updateId: "update_1",
        repositoryId: "repository_1",
        staleBeforeOrAt: now,
        failedAt: now,
        failureReason: "STALE_UPDATE_RECOVERED"
      })
    ).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

type RepositoryUpdateRecord = {
  id: string;
  repositoryId: string;
  triggerType: RepositoryUpdateTriggerType;
  baseCommitSha: string | null;
  targetCommitSha: string;
  status: RepositoryUpdateStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
  changeSet: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};
