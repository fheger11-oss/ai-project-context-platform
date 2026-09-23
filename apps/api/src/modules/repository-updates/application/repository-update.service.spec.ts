import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type { OperationLockService } from "../../usage/operation-lock.service.js";
import { repositoryUpdateLock } from "../../usage/operation-locks.js";
import type {
  RepositoryUpdateRepository,
  RepositoryUpdateSnapshot
} from "../domain/contracts/repository-update-repository.contract.js";
import {
  RepositoryUpdateFailureReasonError,
  RepositoryUpdateInvalidTransitionError,
  RepositoryUpdateNotFoundError
} from "../domain/errors/repository-update.errors.js";
import { RepositoryUpdateService } from "./repository-update.service.js";

const now = new Date("2026-09-23T12:00:00.000Z");

function createUpdate(overrides: Partial<RepositoryUpdateSnapshot> = {}): RepositoryUpdateSnapshot {
  return {
    id: "update_1",
    repositoryId: "repository_1",
    triggerType: RepositoryUpdateTriggerType.MANUAL,
    baseCommitSha: null,
    targetCommitSha: "target_commit",
    status: RepositoryUpdateStatus.PENDING,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    failureReason: null,
    scanId: null,
    analysisId: null,
    projectContextId: null,
    changeSet: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createHarness(
  options: {
    update?: RepositoryUpdateSnapshot | null;
    lockedUpdate?: RepositoryUpdateSnapshot | null;
    ownershipError?: Error;
    lockError?: Error;
  } = {}
) {
  let findByIdCalls = 0;
  const findById = vi.fn(async () => {
    findByIdCalls += 1;

    if (findByIdCalls > 1 && "lockedUpdate" in options) {
      return options.lockedUpdate ?? null;
    }

    if ("update" in options) {
      return options.update ?? null;
    }

    return createUpdate();
  });
  const createPending = vi.fn(async (input) =>
    createUpdate({
      repositoryId: input.repositoryId,
      triggerType: input.triggerType,
      targetCommitSha: input.targetCommitSha,
      baseCommitSha: input.baseCommitSha ?? null
    })
  );
  const markRunning = vi.fn(async (input) =>
    createUpdate({
      ...(options.update ?? {}),
      status: RepositoryUpdateStatus.RUNNING,
      startedAt: input.startedAt
    })
  );
  const markCompleted = vi.fn(async (input) =>
    createUpdate({
      ...(options.update ?? {}),
      status: RepositoryUpdateStatus.COMPLETED,
      completedAt: input.completedAt,
      failedAt: null,
      failureReason: null
    })
  );
  const markFailed = vi.fn(async (input) =>
    createUpdate({
      ...(options.update ?? {}),
      status: RepositoryUpdateStatus.FAILED,
      failedAt: input.failedAt,
      failureReason: input.failureReason
    })
  );
  const repositoryUpdates = {
    createPending,
    findById,
    markRunning,
    markCompleted,
    markFailed
  } satisfies RepositoryUpdateRepository;
  const getScanAccessMetadataForUser = vi.fn(async () => {
    if (options.ownershipError) {
      throw options.ownershipError;
    }

    return {
      id: "repository_1",
      userId: "user_1",
      owner: "owner",
      name: "repo",
      defaultBranch: "main"
    };
  });
  const repositoriesService = {
    getScanAccessMetadataForUser
  } as unknown as RepositoriesService;
  const withRenewingLocks = vi.fn(async (_locks, operation) => {
    if (options.lockError) {
      throw options.lockError;
    }

    return operation();
  });
  const operationLockService = {
    withRenewingLocks
  } as unknown as OperationLockService;

  return {
    service: new RepositoryUpdateService(
      repositoryUpdates,
      repositoriesService,
      operationLockService
    ),
    createPending,
    findById,
    markRunning,
    markCompleted,
    markFailed,
    getScanAccessMetadataForUser,
    withRenewingLocks
  };
}

describe("RepositoryUpdateService", () => {
  it("creates a pending update for the repository owner", async () => {
    const { service, createPending, getScanAccessMetadataForUser } = createHarness();

    await expect(
      service.createPendingUpdate({
        repositoryId: "repository_1",
        userId: "user_1",
        triggerType: RepositoryUpdateTriggerType.MANUAL,
        targetCommitSha: "target_commit",
        baseCommitSha: null
      })
    ).resolves.toMatchObject({
      repositoryId: "repository_1",
      triggerType: RepositoryUpdateTriggerType.MANUAL,
      targetCommitSha: "target_commit",
      baseCommitSha: null,
      status: RepositoryUpdateStatus.PENDING,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null
    });
    expect(getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(createPending).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      triggerType: RepositoryUpdateTriggerType.MANUAL,
      targetCommitSha: "target_commit",
      baseCommitSha: null
    });
  });

  it("denies creating a pending update across users", async () => {
    const { service, createPending } = createHarness({
      ownershipError: new NotFoundException("Repository not found")
    });

    await expect(
      service.createPendingUpdate({
        repositoryId: "repository_1",
        userId: "user_2",
        triggerType: RepositoryUpdateTriggerType.MANUAL,
        targetCommitSha: "target_commit"
      })
    ).rejects.toThrow(NotFoundException);
    expect(createPending).not.toHaveBeenCalled();
  });

  it("starts a pending update under the repository update lock", async () => {
    const update = createUpdate({ baseCommitSha: "base_commit" });
    const { service, withRenewingLocks, markRunning } = createHarness({ update });

    await expect(service.start("update_1", "user_1")).resolves.toMatchObject({
      status: RepositoryUpdateStatus.RUNNING,
      targetCommitSha: "target_commit",
      baseCommitSha: "base_commit",
      startedAt: expect.any(Date)
    });
    expect(withRenewingLocks).toHaveBeenCalledWith(
      [repositoryUpdateLock("repository_1")],
      expect.any(Function)
    );
    expect(markRunning).toHaveBeenCalledWith({
      updateId: "update_1",
      startedAt: expect.any(Date)
    });
  });

  it("exposes a composable repository update lock boundary", async () => {
    const { service, withRenewingLocks, getScanAccessMetadataForUser } = createHarness();
    const operation = vi.fn(async () => "locked");

    await expect(
      service.withRepositoryUpdateLock("repository_1", "user_1", operation)
    ).resolves.toBe("locked");
    expect(getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(withRenewingLocks).toHaveBeenCalledWith(
      [repositoryUpdateLock("repository_1")],
      operation
    );
  });

  it("does not enter the repository update lock for a cross-user repository", async () => {
    const { service, withRenewingLocks } = createHarness({
      ownershipError: new NotFoundException("Repository not found")
    });
    const operation = vi.fn(async () => "locked");

    await expect(
      service.withRepositoryUpdateLock("repository_1", "user_2", operation)
    ).rejects.toThrow(NotFoundException);
    expect(withRenewingLocks).not.toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
  });

  it.each([
    RepositoryUpdateStatus.RUNNING,
    RepositoryUpdateStatus.COMPLETED,
    RepositoryUpdateStatus.FAILED
  ])("rejects starting a %s update", async (status) => {
    const { service, markRunning } = createHarness({
      update: createUpdate({ status })
    });

    await expect(service.start("update_1", "user_1")).rejects.toBeInstanceOf(
      RepositoryUpdateInvalidTransitionError
    );
    expect(markRunning).not.toHaveBeenCalled();
  });

  it("rejects concurrent start when the locked reload is no longer pending", async () => {
    const { service, markRunning } = createHarness({
      update: createUpdate({ status: RepositoryUpdateStatus.PENDING }),
      lockedUpdate: createUpdate({
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: now
      })
    });

    await expect(service.start("update_1", "user_1")).rejects.toBeInstanceOf(
      RepositoryUpdateInvalidTransitionError
    );
    expect(markRunning).not.toHaveBeenCalled();
  });

  it("completes a running update without touching failure fields", async () => {
    const { service, markCompleted } = createHarness({
      update: createUpdate({
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: now
      })
    });

    await expect(service.complete("update_1", "user_1")).resolves.toMatchObject({
      status: RepositoryUpdateStatus.COMPLETED,
      completedAt: expect.any(Date),
      failedAt: null,
      failureReason: null
    });
    expect(markCompleted).toHaveBeenCalledWith({
      updateId: "update_1",
      completedAt: expect.any(Date)
    });
  });

  it.each([
    RepositoryUpdateStatus.PENDING,
    RepositoryUpdateStatus.COMPLETED,
    RepositoryUpdateStatus.FAILED
  ])("rejects completing a %s update", async (status) => {
    const { service, markCompleted } = createHarness({
      update: createUpdate({ status })
    });

    await expect(service.complete("update_1", "user_1")).rejects.toBeInstanceOf(
      RepositoryUpdateInvalidTransitionError
    );
    expect(markCompleted).not.toHaveBeenCalled();
  });

  it("fails a running update and stores the failure reason", async () => {
    const { service, markFailed } = createHarness({
      update: createUpdate({
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: now
      })
    });

    await expect(
      service.fail("update_1", "user_1", "GitHub compare failed")
    ).resolves.toMatchObject({
      status: RepositoryUpdateStatus.FAILED,
      failedAt: expect.any(Date),
      failureReason: "GitHub compare failed"
    });
    expect(markFailed).toHaveBeenCalledWith({
      updateId: "update_1",
      failedAt: expect.any(Date),
      failureReason: "GitHub compare failed"
    });
  });

  it("rejects blank failure reasons", async () => {
    const { service, markFailed } = createHarness({
      update: createUpdate({ status: RepositoryUpdateStatus.RUNNING })
    });

    await expect(service.fail("update_1", "user_1", "  ")).rejects.toBeInstanceOf(
      RepositoryUpdateFailureReasonError
    );
    expect(markFailed).not.toHaveBeenCalled();
  });

  it.each([
    RepositoryUpdateStatus.PENDING,
    RepositoryUpdateStatus.COMPLETED,
    RepositoryUpdateStatus.FAILED
  ])("rejects failing a %s update", async (status) => {
    const { service, markFailed } = createHarness({
      update: createUpdate({ status })
    });

    await expect(service.fail("update_1", "user_1", "failed")).rejects.toBeInstanceOf(
      RepositoryUpdateInvalidTransitionError
    );
    expect(markFailed).not.toHaveBeenCalled();
  });

  it.each(["start", "complete", "fail"] as const)("denies cross-user %s", async (method) => {
    const { service, markRunning, markCompleted, markFailed } = createHarness({
      update: createUpdate({ status: RepositoryUpdateStatus.RUNNING }),
      ownershipError: new NotFoundException("Repository not found")
    });
    const action =
      method === "start"
        ? service.start("update_1", "user_2")
        : method === "complete"
          ? service.complete("update_1", "user_2")
          : service.fail("update_1", "user_2", "failed");

    await expect(action).rejects.toThrow(NotFoundException);
    expect(markRunning).not.toHaveBeenCalled();
    expect(markCompleted).not.toHaveBeenCalled();
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("throws a clean not found error for missing updates", async () => {
    const { service } = createHarness({ update: null });

    await expect(service.start("missing_update", "user_1")).rejects.toBeInstanceOf(
      RepositoryUpdateNotFoundError
    );
  });

  it("does not replace the update context reference during lifecycle operations", async () => {
    const { service, markCompleted } = createHarness({
      update: createUpdate({
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: now,
        projectContextId: "context_1"
      })
    });

    await expect(service.complete("update_1", "user_1")).resolves.toMatchObject({
      projectContextId: "context_1"
    });
    expect(markCompleted).toHaveBeenCalledOnce();

    const failedHarness = createHarness({
      update: createUpdate({
        status: RepositoryUpdateStatus.RUNNING,
        startedAt: now,
        projectContextId: "context_1"
      })
    });
    await expect(failedHarness.service.fail("update_1", "user_1", "failed")).resolves.toMatchObject(
      {
        projectContextId: "context_1"
      }
    );
  });

  it("surfaces repository update lock conflicts", async () => {
    const lockError = new Error("repository update is already running");
    const { service, markRunning } = createHarness({
      lockError
    });

    await expect(service.start("update_1", "user_1")).rejects.toBe(lockError);
    expect(markRunning).not.toHaveBeenCalled();
  });
});
