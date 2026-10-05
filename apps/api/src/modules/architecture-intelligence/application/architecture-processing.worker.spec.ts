import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppConfigService } from "../../config/app-config.service.js";
import type { ArchitectureProcessingRequestRepository } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import type { ArchitectureProcessingRequestProcessor } from "./architecture-processing-request-processor.contract.js";
import { ArchitectureProcessingWorker } from "./architecture-processing.worker.js";

const now = new Date("2026-10-05T12:00:00.000Z");
const request = {
  id: "request-1",
  repositoryId: "repository-1",
  projectContextId: "context-1",
  processorVersion: "architecture-processor-1.0",
  status: "PROCESSING" as const,
  attemptCount: 1,
  nextAttemptAt: now,
  claimedBy: "worker",
  leaseUntil: new Date(now.getTime() + 90_000),
  startedAt: now,
  completedAt: null,
  lastFailureCategory: null,
  createdAt: now,
  updatedAt: now
};

const config = {
  architectureProcessingWorkerEnabled: false,
  architectureProcessingWorkerPollIntervalMilliseconds: 2_000,
  architectureProcessingWorkerLeaseMilliseconds: 90_000,
  architectureProcessingWorkerMaxAttempts: 3,
  architectureProcessingWorkerBackoffBaseMilliseconds: 30_000
} as AppConfigService;

describe("ArchitectureProcessingWorker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("claims and completes a valid architecture request", async () => {
    const h = createHarness();

    await expect(h.worker.processOne()).resolves.toBe(true);

    expect(h.requests.claim).toHaveBeenCalledWith(
      expect.any(String),
      now,
      new Date(now.getTime() + 90_000)
    );
    expect(h.processor.process).toHaveBeenCalledWith(request);
    expect(h.requests.complete).toHaveBeenCalledWith({
      id: "request-1",
      repositoryId: "repository-1",
      workerId: expect.any(String),
      now
    });
  });

  it("schedules retry with exponential backoff after a retryable failure", async () => {
    const h = createHarness({ processorError: new Error("transient") });

    await h.worker.processOne();

    expect(h.requests.retry).toHaveBeenCalledWith({
      id: "request-1",
      repositoryId: "repository-1",
      workerId: expect.any(String),
      now,
      nextAttemptAt: new Date(now.getTime() + 30_000),
      failureCategory: "ARCHITECTURE_PROCESSING_FAILURE"
    });
    expect(h.requests.fail).not.toHaveBeenCalled();
  });

  it("marks terminal failure when the maximum attempt is exhausted", async () => {
    const h = createHarness({
      claimedRequest: { ...request, attemptCount: 3 },
      processorError: new Error("still failing")
    });

    await h.worker.processOne();

    expect(h.requests.fail).toHaveBeenCalledWith({
      id: "request-1",
      repositoryId: "repository-1",
      workerId: expect.any(String),
      now,
      failureCategory: "ARCHITECTURE_PROCESSING_FAILURE"
    });
    expect(h.requests.retry).not.toHaveBeenCalled();
  });

  it("supports an architecture-specific incompatible terminal outcome", async () => {
    const h = createHarness({ outcome: "INCOMPATIBLE" });

    await h.worker.processOne();

    expect(h.requests.markIncompatible).toHaveBeenCalledWith({
      id: "request-1",
      repositoryId: "repository-1",
      workerId: expect.any(String),
      now
    });
    expect(h.requests.complete).not.toHaveBeenCalled();
  });

  it("renews the lease while processing and tolerates stale heartbeat rejection", async () => {
    let finishProcessing: (outcome: "COMPLETED") => void = () => undefined;
    const process = vi.fn(
      () =>
        new Promise<"COMPLETED">((resolve) => {
          finishProcessing = resolve;
        })
    );
    const h = createHarness({ process, renewResult: false });

    const processing = h.worker.processOne();
    await vi.advanceTimersByTimeAsync(30_000);
    finishProcessing("COMPLETED");
    await processing;

    expect(h.requests.renewLease).toHaveBeenCalledWith(
      {
        id: "request-1",
        repositoryId: "repository-1",
        workerId: expect.any(String),
        now: new Date(now.getTime() + 30_000)
      },
      new Date(now.getTime() + 120_000)
    );
  });

  it("lets only one worker process a request when concurrent claims race", async () => {
    const h = createHarness();
    h.requests.claim.mockResolvedValueOnce(request).mockResolvedValueOnce(null);
    const secondWorker = new ArchitectureProcessingWorker(config, h.requests, h.processor);

    await expect(Promise.all([h.worker.processOne(), secondWorker.processOne()])).resolves.toEqual([
      true,
      false
    ]);
    expect(h.processor.process).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a reclaimed request when completion ownership is rejected", async () => {
    const h = createHarness({ completeResult: false });

    await expect(h.worker.processOne()).resolves.toBe(true);

    expect(h.requests.complete).toHaveBeenCalledTimes(1);
    expect(h.requests.retry).not.toHaveBeenCalled();
    expect(h.requests.fail).not.toHaveBeenCalled();
  });
});

function createHarness(
  options: {
    claimedRequest?: typeof request;
    processorError?: Error;
    outcome?: "COMPLETED" | "INCOMPATIBLE";
    process?: ReturnType<typeof vi.fn>;
    renewResult?: boolean;
    completeResult?: boolean;
  } = {}
) {
  const requests = {
    claim: vi.fn(async () => options.claimedRequest ?? request),
    renewLease: vi.fn(async () => options.renewResult ?? true),
    complete: vi.fn(async () => options.completeResult ?? true),
    retry: vi.fn(async () => true),
    fail: vi.fn(async () => true),
    markIncompatible: vi.fn(async () => true)
  } as unknown as ArchitectureProcessingRequestRepository & {
    claim: ReturnType<typeof vi.fn>;
    renewLease: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    retry: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;
    markIncompatible: ReturnType<typeof vi.fn>;
  };
  const process =
    options.process ??
    vi.fn(async () => {
      if (options.processorError) throw options.processorError;
      return options.outcome ?? "COMPLETED";
    });
  const processor = { process } as ArchitectureProcessingRequestProcessor & {
    process: ReturnType<typeof vi.fn>;
  };

  return {
    worker: new ArchitectureProcessingWorker(config, requests, processor),
    requests,
    processor
  };
}
