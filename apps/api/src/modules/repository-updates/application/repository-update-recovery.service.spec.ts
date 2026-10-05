import { describe, expect, it, vi } from "vitest";

import {
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import type { AppConfigService } from "../../config/app-config.service.js";
import type { RepositoriesService } from "../../repositories/repositories.service.js";
import type {
  RepositoryUpdateRepository,
  RepositoryUpdateSnapshot
} from "../domain/contracts/repository-update-repository.contract.js";
import {
  RepositoryUpdateRecoveryOutcome,
  RepositoryUpdateRecoveryService,
  STALE_REPOSITORY_UPDATE_RECOVERY_REASON
} from "./repository-update-recovery.service.js";
import type { RepositoryUpdateService } from "./repository-update.service.js";

const now = new Date("2026-09-24T12:00:00.000Z");
const thresholdMs = 6 * 60 * 60 * 1000;

function update(overrides: Partial<RepositoryUpdateSnapshot> = {}): RepositoryUpdateSnapshot {
  return {
    id: "update_1",
    repositoryId: "repository_1",
    triggerType: RepositoryUpdateTriggerType.MANUAL,
    baseCommitSha: "commit_a",
    targetCommitSha: "commit_b",
    status: RepositoryUpdateStatus.RUNNING,
    startedAt: new Date(now.getTime() - thresholdMs - 1),
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

function createHarness(initial: RepositoryUpdateSnapshot | null = update()) {
  let current = initial;
  const findByRepositoryAndId = vi.fn(async () => current);
  const recoverStaleRunning = vi.fn(async (input) => {
    if (
      !current ||
      current.status !== RepositoryUpdateStatus.RUNNING ||
      !current.startedAt ||
      current.startedAt > input.staleBeforeOrAt
    ) {
      return null;
    }
    current = {
      ...current,
      status: RepositoryUpdateStatus.FAILED,
      failedAt: input.failedAt,
      failureReason: input.failureReason
    };
    return current;
  });
  const repositoryUpdates = {
    findByRepositoryAndId,
    recoverStaleRunning
  } as unknown as RepositoryUpdateRepository;
  let lockActive = false;
  const withRepositoryUpdateLock = vi.fn(async (_repositoryId, _userId, operation) => {
    lockActive = true;
    try {
      return await operation();
    } finally {
      lockActive = false;
    }
  });
  const repositoryUpdateService = {
    withRepositoryUpdateLock
  } as unknown as RepositoryUpdateService;
  const getScanAccessMetadataForUser = vi.fn(async () => ({ id: "repository_1" }));
  const repositoriesService = {
    getScanAccessMetadataForUser
  } as unknown as RepositoriesService;
  const config = {
    repositoryUpdateStaleThresholdMilliseconds: thresholdMs
  } as AppConfigService;

  return {
    service: new RepositoryUpdateRecoveryService(
      repositoryUpdates,
      repositoryUpdateService,
      repositoriesService,
      config
    ),
    findByRepositoryAndId,
    recoverStaleRunning,
    withRepositoryUpdateLock,
    getScanAccessMetadataForUser,
    isLockActive: () => lockActive,
    setCurrent(value: RepositoryUpdateSnapshot | null) {
      current = value;
    }
  };
}

const input = {
  repositoryId: "repository_1",
  updateId: "update_1",
  userId: "user_1",
  now
};

describe("RepositoryUpdateRecoveryService", () => {
  it("recovers an old RUNNING update under the repository update lock", async () => {
    const h = createHarness();
    h.recoverStaleRunning.mockImplementationOnce(async (command) => {
      expect(h.isLockActive()).toBe(true);
      return update({
        status: RepositoryUpdateStatus.FAILED,
        failedAt: command.failedAt,
        failureReason: command.failureReason
      });
    });

    await expect(h.service.recover(input)).resolves.toMatchObject({
      outcome: RepositoryUpdateRecoveryOutcome.RECOVERED,
      update: {
        status: RepositoryUpdateStatus.FAILED,
        failedAt: now,
        failureReason: STALE_REPOSITORY_UPDATE_RECOVERY_REASON
      }
    });
    expect(h.recoverStaleRunning).toHaveBeenCalledWith({
      updateId: "update_1",
      repositoryId: "repository_1",
      staleBeforeOrAt: new Date(now.getTime() - thresholdMs),
      failedAt: now,
      failureReason: STALE_REPOSITORY_UPDATE_RECOVERY_REASON
    });
  });

  it("does not recover a recently started legitimate update", async () => {
    const h = createHarness(update({ startedAt: new Date(now.getTime() - thresholdMs + 1) }));

    await expect(h.service.recover(input)).resolves.toMatchObject({
      outcome: RepositoryUpdateRecoveryOutcome.NOT_STALE,
      update: { status: RepositoryUpdateStatus.RUNNING }
    });
    expect(h.recoverStaleRunning).not.toHaveBeenCalled();
  });

  it("conservatively leaves a RUNNING update without startedAt unchanged", async () => {
    const h = createHarness(update({ startedAt: null }));

    await expect(h.service.recover(input)).resolves.toMatchObject({
      outcome: RepositoryUpdateRecoveryOutcome.NOT_STALE
    });
    expect(h.recoverStaleRunning).not.toHaveBeenCalled();
  });

  it.each([RepositoryUpdateStatus.COMPLETED, RepositoryUpdateStatus.FAILED])(
    "does not overwrite an already terminal %s update",
    async (status) => {
      const h = createHarness(update({ status }));

      await expect(h.service.recover(input)).resolves.toMatchObject({
        outcome: RepositoryUpdateRecoveryOutcome.ALREADY_TERMINAL,
        update: { status }
      });
      expect(h.recoverStaleRunning).not.toHaveBeenCalled();
    }
  );

  it("returns NOT_FOUND within an owned repository without creating lifecycle state", async () => {
    const h = createHarness(null);

    await expect(h.service.recover(input)).resolves.toEqual({
      outcome: RepositoryUpdateRecoveryOutcome.NOT_FOUND,
      update: null
    });
    expect(h.recoverStaleRunning).not.toHaveBeenCalled();
  });

  it("does not overwrite a concurrent terminal transition when the conditional update loses", async () => {
    const h = createHarness();
    h.recoverStaleRunning.mockImplementationOnce(async () => {
      h.setCurrent(update({ status: RepositoryUpdateStatus.COMPLETED, completedAt: now }));
      return null;
    });

    await expect(h.service.recover(input)).resolves.toMatchObject({
      outcome: RepositoryUpdateRecoveryOutcome.ALREADY_TERMINAL,
      update: { status: RepositoryUpdateStatus.COMPLETED }
    });
  });

  it("is idempotent when recovery is requested repeatedly", async () => {
    const h = createHarness();

    await expect(h.service.recover(input)).resolves.toMatchObject({
      outcome: RepositoryUpdateRecoveryOutcome.RECOVERED
    });
    await expect(h.service.recover(input)).resolves.toMatchObject({
      outcome: RepositoryUpdateRecoveryOutcome.ALREADY_TERMINAL,
      update: { status: RepositoryUpdateStatus.FAILED }
    });
    expect(h.recoverStaleRunning).toHaveBeenCalledTimes(1);
  });

  it("enforces repository ownership before acquiring the recovery lock", async () => {
    const h = createHarness();

    await h.service.recover(input);

    expect(h.getScanAccessMetadataForUser).toHaveBeenCalledWith("user_1", "repository_1");
    expect(h.withRepositoryUpdateLock).toHaveBeenCalledWith(
      "repository_1",
      "user_1",
      expect.any(Function)
    );
  });
});
