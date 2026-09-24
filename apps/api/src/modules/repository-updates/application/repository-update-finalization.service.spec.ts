import { describe, expect, it, vi } from "vitest";

import {
  RepositoryFreshnessStatus,
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import type { RepositoriesService } from "../../repositories/repositories.service.js";
import { RepositoryUpdateFinalizationService } from "./repository-update-finalization.service.js";

const now = new Date("2026-09-24T12:00:00.000Z");

function context(overrides: Record<string, unknown> = {}) {
  return {
    id: "context_b",
    repositoryId: "repository_1",
    commitSha: "commit_b",
    scanId: "scan_b",
    analysisId: "analysis_b",
    scan: {
      id: "scan_b",
      repositoryId: "repository_1",
      commitSha: "commit_b",
      status: "COMPLETED"
    },
    analysis: {
      id: "analysis_b",
      scanId: "scan_b",
      repositoryId: "repository_1",
      commitSha: "commit_b",
      status: "COMPLETED"
    },
    ...overrides
  };
}

function state(overrides: Record<string, unknown> = {}) {
  return {
    id: "state_1",
    repositoryId: "repository_1",
    remoteHeadCommitSha: "commit_b",
    remoteHeadCheckedAt: now,
    lastScannedCommitSha: "commit_a",
    lastAnalyzedCommitSha: "commit_a",
    currentProjectContextId: "context_a",
    currentContextCommitSha: "commit_a",
    freshnessStatus: RepositoryFreshnessStatus.STALE,
    lastUpdateStatus: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function update(overrides: Record<string, unknown> = {}) {
  return {
    id: "update_1",
    repositoryId: "repository_1",
    triggerType: RepositoryUpdateTriggerType.MANUAL,
    baseCommitSha: "commit_a",
    targetCommitSha: "commit_b",
    status: RepositoryUpdateStatus.RUNNING,
    startedAt: now,
    completedAt: null,
    failedAt: null,
    failureReason: null,
    scanId: "scan_b",
    analysisId: "analysis_b",
    projectContextId: "context_b",
    changeSet: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createHarness(
  options: {
    context?: ReturnType<typeof context> | null;
    historyError?: Error;
    stateError?: Error;
    completionCount?: number;
  } = {}
) {
  const projectContextFindUnique = vi.fn(async () =>
    options.context === undefined ? context() : options.context
  );
  const repositoryUpdateFindFirst = vi.fn(async () => update());
  const repositoryStateFindUnique = vi.fn(async () => state());
  const historyUpsert = vi.fn(async () => {
    if (options.historyError) throw options.historyError;
    return {};
  });
  const repositoryStateUpdate = vi.fn(async (args: { data: Record<string, unknown> }) => {
    if (options.stateError) throw options.stateError;
    return state(args.data);
  });
  const repositoryUpdateUpdateMany = vi.fn(async () => ({
    count: options.completionCount ?? 1
  }));
  const repositoryUpdateFindUniqueOrThrow = vi.fn(async () =>
    update({ status: RepositoryUpdateStatus.COMPLETED, completedAt: now })
  );
  const transactionClient = {
    projectContext: { findUnique: projectContextFindUnique },
    repositoryUpdate: {
      findFirst: repositoryUpdateFindFirst,
      updateMany: repositoryUpdateUpdateMany,
      findUniqueOrThrow: repositoryUpdateFindUniqueOrThrow
    },
    repositoryState: {
      findUnique: repositoryStateFindUnique,
      update: repositoryStateUpdate
    },
    repositoryContextHistory: { upsert: historyUpsert }
  };
  const transaction = vi.fn(async (operation: (tx: typeof transactionClient) => unknown) =>
    operation(transactionClient)
  );
  const prisma = {
    projectContext: { findUnique: projectContextFindUnique },
    $transaction: transaction
  } as unknown as PrismaService;
  const getScanAccessMetadataForUser = vi.fn(async () => ({ id: "repository_1" }));
  const repositories = {
    getScanAccessMetadataForUser
  } as unknown as RepositoriesService;

  return {
    service: new RepositoryUpdateFinalizationService(prisma, repositories),
    transaction,
    projectContextFindUnique,
    historyUpsert,
    repositoryStateUpdate,
    repositoryUpdateUpdateMany,
    repositoryUpdateFindUniqueOrThrow,
    getScanAccessMetadataForUser
  };
}

const input = {
  repositoryId: "repository_1",
  userId: "user_1",
  updateId: "update_1",
  projectContextId: "context_b",
  targetCommitSha: "commit_b",
  completedAt: now
};

describe("RepositoryUpdateFinalizationService", () => {
  it("atomically records history, promotes state, and completes the running update", async () => {
    const h = createHarness();

    await expect(h.service.finalize(input)).resolves.toMatchObject({
      state: {
        currentProjectContextId: "context_b",
        currentContextCommitSha: "commit_b",
        freshnessStatus: RepositoryFreshnessStatus.FRESH
      },
      update: {
        id: "update_1",
        status: RepositoryUpdateStatus.COMPLETED,
        projectContextId: "context_b"
      }
    });

    expect(h.getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(h.projectContextFindUnique).toHaveBeenCalledTimes(2);
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.historyUpsert).toHaveBeenCalledTimes(1);
    expect(h.repositoryStateUpdate).toHaveBeenCalledTimes(1);
    expect(h.repositoryUpdateUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "update_1",
        repositoryId: "repository_1",
        status: RepositoryUpdateStatus.RUNNING,
        targetCommitSha: "commit_b",
        projectContextId: "context_b",
        scanId: "scan_b",
        analysisId: "analysis_b"
      },
      data: {
        status: RepositoryUpdateStatus.COMPLETED,
        completedAt: now,
        failedAt: null,
        failureReason: null
      }
    });
  });

  it("rejects invalid provenance before opening the final transaction", async () => {
    const h = createHarness({ context: context({ repositoryId: "repository_2" }) });

    await expect(h.service.finalize(input)).rejects.toThrow("finalization provenance");
    expect(h.transaction).not.toHaveBeenCalled();
    expect(h.historyUpsert).not.toHaveBeenCalled();
    expect(h.repositoryStateUpdate).not.toHaveBeenCalled();
    expect(h.repositoryUpdateUpdateMany).not.toHaveBeenCalled();
  });

  it("does not attempt promotion or completion when history persistence fails", async () => {
    const h = createHarness({ historyError: new Error("history write failed") });

    await expect(h.service.finalize(input)).rejects.toThrow("history write failed");
    expect(h.repositoryStateUpdate).not.toHaveBeenCalled();
    expect(h.repositoryUpdateUpdateMany).not.toHaveBeenCalled();
    expect(h.repositoryUpdateFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("does not attempt completion when RepositoryState promotion fails", async () => {
    const h = createHarness({ stateError: new Error("state write failed") });

    await expect(h.service.finalize(input)).rejects.toThrow("state write failed");
    expect(h.repositoryUpdateUpdateMany).not.toHaveBeenCalled();
    expect(h.repositoryUpdateFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects a lost completion transition so Prisma rolls back history and promotion", async () => {
    const h = createHarness({ completionCount: 0 });

    await expect(h.service.finalize(input)).rejects.toThrow();
    expect(h.historyUpsert).toHaveBeenCalledTimes(1);
    expect(h.repositoryStateUpdate).toHaveBeenCalledTimes(1);
    expect(h.repositoryUpdateFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("can be retried safely after a rolled-back finalization failure", async () => {
    const h = createHarness();
    h.historyUpsert.mockRejectedValueOnce(new Error("transient history failure"));

    await expect(h.service.finalize(input)).rejects.toThrow("transient history failure");
    await expect(h.service.finalize(input)).resolves.toMatchObject({
      state: { currentProjectContextId: "context_b" },
      update: { status: RepositoryUpdateStatus.COMPLETED }
    });

    expect(h.historyUpsert).toHaveBeenCalledTimes(2);
    expect(h.historyUpsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          repositoryId_projectContextId: {
            repositoryId: "repository_1",
            projectContextId: "context_b"
          }
        },
        update: {}
      })
    );
    expect(h.repositoryStateUpdate).toHaveBeenCalledTimes(1);
    expect(h.repositoryUpdateUpdateMany).toHaveBeenCalledTimes(1);
  });
});
