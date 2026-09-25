import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryChangeTriggerOutcome } from "../repository-updates/application/repository-change-trigger.service.js";
import { InvalidRepositoryChangeTriggerError } from "../repository-updates/domain/errors/repository-change-trigger.errors.js";
import { RepositoryUpdateDispatchWorker } from "./repository-update-dispatch.worker.js";

const config = {
  repositoryUpdateWorkerEnabled: false,
  repositoryUpdateWorkerPollIntervalMilliseconds: 2_000,
  repositoryUpdateWorkerLeaseMilliseconds: 90_000,
  repositoryUpdateWorkerMaxAttempts: 3,
  repositoryUpdateWorkerBackoffBaseMilliseconds: 30_000
};
const job = {
  id: "dispatch_1",
  repositoryId: "repo_1",
  attemptCount: 1,
  webhookDelivery: {
    providerRepositoryId: "123",
    repositoryFullName: "ctxaro/api",
    branch: "main",
    targetCommitSha: "a".repeat(40),
    deliveryId: "delivery-1",
    occurredAt: null
  }
};
function harness(
  result: unknown = {
    outcome: RepositoryChangeTriggerOutcome.TRIGGERED,
    updateResult: { update: { id: "update_1" } }
  }
) {
  const dispatches = {
    claim: vi.fn(async () => job),
    renew: vi.fn(async () => ({ count: 1 })),
    finish: vi.fn(async () => ({ count: 1 })),
    retry: vi.fn(async () => ({ count: 1 })),
    fail: vi.fn(async () => ({ count: 1 }))
  };
  const trigger = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return {
    worker: new RepositoryUpdateDispatchWorker(
      config as never,
      dispatches as never,
      { trigger } as never
    ),
    dispatches,
    trigger
  };
}

describe("RepositoryUpdateDispatchWorker", () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  it("claims and delegates a dispatch to RepositoryChangeTriggerService", async () => {
    const h = harness();
    await expect(h.worker.processOne()).resolves.toBe(true);
    expect(h.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryId: "repo_1", deliveryId: "delivery-1" })
    );
    expect(h.dispatches.finish).toHaveBeenCalledWith(
      "dispatch_1",
      expect.any(String),
      "COMPLETED",
      "update_1"
    );
  });
  it("retries transient failures on the same dispatch", async () => {
    const h = harness(new Error("database unavailable"));
    await h.worker.processOne();
    expect(h.dispatches.retry).toHaveBeenCalledWith(
      "dispatch_1",
      expect.any(String),
      expect.any(Date),
      "TRANSIENT_PROCESSING_FAILURE"
    );
    expect(h.dispatches.fail).not.toHaveBeenCalled();
  });
  it("terminally fails permanent trigger validation", async () => {
    const h = harness(new InvalidRepositoryChangeTriggerError("bad"));
    await h.worker.processOne();
    expect(h.dispatches.fail).toHaveBeenCalledWith(
      "dispatch_1",
      expect.any(String),
      "INVALID_TRIGGER"
    );
  });
  it("retries an existing repository update lock conflict", async () => {
    const h = harness({ outcome: RepositoryChangeTriggerOutcome.IGNORED_UPDATE_IN_PROGRESS });
    await h.worker.processOne();
    expect(h.dispatches.retry).toHaveBeenCalledWith(
      "dispatch_1",
      expect.any(String),
      expect.any(Date),
      "UPDATE_IN_PROGRESS"
    );
  });
  it("returns false when no eligible dispatch exists", async () => {
    const h = harness();
    h.dispatches.claim.mockResolvedValue(null as never);
    await expect(h.worker.processOne()).resolves.toBe(false);
    expect(h.trigger).not.toHaveBeenCalled();
  });
});
