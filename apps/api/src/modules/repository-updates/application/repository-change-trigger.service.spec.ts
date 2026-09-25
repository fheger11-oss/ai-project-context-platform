import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunRepositoryUpdateResult } from "./run-repository-update.service.js";
import { RepositoryChangeTriggerService } from "./repository-change-trigger.service.js";
import {
  RepositoryChangeEventType,
  RepositoryChangeProvider,
  RepositoryChangeTriggerOutcome,
  RepositoryChangeTriggerSource,
  type RepositoryChangeTrigger
} from "./repository-change-trigger.service.js";
import { RepositoryUpdateTargetSupersededError } from "./errors/repository-update-target-superseded.error.js";
import { OperationConcurrencyError } from "../../usage/errors/operation-concurrency.error.js";
import type { RepositoryChangeTriggerRepository } from "../domain/contracts/repository-change-trigger-repository.contract.js";
import {
  InvalidRepositoryChangeTriggerError,
  RepositoryChangeIdentityMismatchError,
  RepositoryChangeProviderIdentityMismatchError
} from "../domain/errors/repository-change-trigger.errors.js";

const TARGET_SHA = "b".repeat(40);

const trigger: RepositoryChangeTrigger = {
  provider: RepositoryChangeProvider.GITHUB,
  source: RepositoryChangeTriggerSource.WEBHOOK,
  eventType: RepositoryChangeEventType.PUSH,
  repositoryId: "repository_1",
  providerRepositoryId: "12345",
  repositoryFullName: "ctxaro/api",
  branch: "refs/heads/main",
  targetCommitSha: TARGET_SHA,
  deliveryId: "delivery-1",
  occurredAt: new Date("2026-09-25T10:00:00.000Z")
};

const connectedRepository = {
  id: "repository_1",
  userId: "user_1",
  providerRepositoryId: "12345",
  fullName: "Ctxaro/API",
  defaultBranch: "main"
};

const completed = {
  noop: false,
  update: { id: "update_1" },
  targetCommitSha: TARGET_SHA
} as RunRepositoryUpdateResult;

function createHarness(
  options: {
    repository?: typeof connectedRepository | null;
    run?: (
      repositoryId: string,
      userId: string,
      targetCommitSha: string
    ) => Promise<RunRepositoryUpdateResult>;
  } = {}
) {
  const findConnectedById = vi.fn(async () =>
    options.repository === undefined ? connectedRepository : options.repository
  );
  const runWebhookUpdate = vi.fn(options.run ?? (async () => completed));
  const service = new RepositoryChangeTriggerService(
    { findConnectedById } as RepositoryChangeTriggerRepository,
    { runWebhookUpdate } as never
  );

  return { findConnectedById, runWebhookUpdate, service };
}

describe("RepositoryChangeTriggerService", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  it("delegates a valid default-branch GitHub push to the existing update lifecycle", async () => {
    const h = createHarness();

    await expect(h.service.trigger(trigger)).resolves.toMatchObject({
      outcome: RepositoryChangeTriggerOutcome.TRIGGERED,
      updateResult: completed
    });
    expect(h.findConnectedById).toHaveBeenCalledWith("repository_1");
    expect(h.runWebhookUpdate).toHaveBeenCalledWith("repository_1", "user_1", TARGET_SHA);
  });

  it("ignores a non-default branch without entering RepositoryUpdate", async () => {
    const h = createHarness();

    await expect(
      h.service.trigger({ ...trigger, branch: "refs/heads/feature" })
    ).resolves.toMatchObject({
      outcome: RepositoryChangeTriggerOutcome.IGNORED_NON_DEFAULT_BRANCH
    });
    expect(h.runWebhookUpdate).not.toHaveBeenCalled();
  });

  it.each(["unknown", "disconnected"])("ignores an %s repository", async () => {
    const h = createHarness({ repository: null });

    await expect(h.service.trigger(trigger)).resolves.toMatchObject({
      outcome: RepositoryChangeTriggerOutcome.IGNORED_UNKNOWN_REPOSITORY
    });
    expect(h.runWebhookUpdate).not.toHaveBeenCalled();
  });

  it("ignores irrelevant verified event types", async () => {
    const h = createHarness();

    await expect(h.service.trigger({ ...trigger, eventType: "PING" })).resolves.toMatchObject({
      outcome: RepositoryChangeTriggerOutcome.IGNORED_EVENT
    });
    expect(h.findConnectedById).not.toHaveBeenCalled();
    expect(h.runWebhookUpdate).not.toHaveBeenCalled();
  });

  it("rejects a provider repository identity mismatch", async () => {
    const h = createHarness();

    await expect(
      h.service.trigger({ ...trigger, providerRepositoryId: "99999" })
    ).rejects.toBeInstanceOf(RepositoryChangeProviderIdentityMismatchError);
    expect(h.runWebhookUpdate).not.toHaveBeenCalled();
  });

  it("rejects a repository full-name identity mismatch", async () => {
    const h = createHarness();

    await expect(
      h.service.trigger({ ...trigger, repositoryFullName: "other/repository" })
    ).rejects.toBeInstanceOf(RepositoryChangeIdentityMismatchError);
    expect(h.runWebhookUpdate).not.toHaveBeenCalled();
  });

  it.each([
    { targetCommitSha: "short" },
    { deliveryId: "invalid delivery" },
    { occurredAt: new Date(Number.NaN) },
    { branch: "main\nforged-log-entry" }
  ])("rejects malformed event metadata %#", async (overrides) => {
    const h = createHarness();

    await expect(h.service.trigger({ ...trigger, ...overrides })).rejects.toBeInstanceOf(
      InvalidRepositoryChangeTriggerError
    );
    expect(h.findConnectedById).not.toHaveBeenCalled();
  });

  it("classifies a target superseded by the current remote HEAD as non-actionable", async () => {
    const h = createHarness({
      run: async () => Promise.reject(new RepositoryUpdateTargetSupersededError())
    });

    await expect(h.service.trigger(trigger)).resolves.toMatchObject({
      outcome: RepositoryChangeTriggerOutcome.IGNORED_STALE_TARGET
    });
  });

  it("maps a repeated target to the existing lifecycle no-op", async () => {
    const h = createHarness({
      run: async () => ({ ...completed, noop: true, update: null })
    });

    await expect(h.service.trigger(trigger)).resolves.toMatchObject({
      outcome: RepositoryChangeTriggerOutcome.NOOP
    });
  });

  it("uses existing update coordination for duplicate and concurrent deliveries", async () => {
    let releaseFirst!: () => void;
    let markFirstStarted!: () => void;
    const firstCanComplete = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    let callCount = 0;
    const h = createHarness({
      run: async () => {
        callCount += 1;
        if (callCount === 2) {
          throw new OperationConcurrencyError({
            operationType: "repository.update",
            lockKey: "repository:repository_1:update",
            expiresAt: null
          });
        }
        markFirstStarted();
        await firstCanComplete;
        return completed;
      }
    });

    const firstPromise = h.service.trigger(trigger);
    await firstStarted;
    const duplicate = await h.service.trigger({ ...trigger });
    releaseFirst();
    const first = await firstPromise;

    expect(first.outcome).toBe(RepositoryChangeTriggerOutcome.TRIGGERED);
    expect(duplicate.outcome).toBe(RepositoryChangeTriggerOutcome.IGNORED_UPDATE_IN_PROGRESS);
    expect(h.runWebhookUpdate).toHaveBeenCalledTimes(2);
  });
});
