import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  RepositoryFreshnessStatus,
  RepositoryUpdateStatus,
  RepositoryUpdateTriggerType
} from "../../../generated/prisma/enums.js";
import type { RunAnalysisService } from "../../analysis/application/run-analysis.service.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { ChangeSetService } from "../../change-sets/application/change-set.service.js";
import { IncrementalProcessingEligibilityService } from "../../change-sets/application/incremental-processing-eligibility.service.js";
import { ChangeSetCompleteness, ComparisonStatus } from "../../change-sets/domain/change-set.js";
import type { GenerateAndPersistProjectContextService } from "../../context/application/generate-and-persist-project-context.service.js";
import type { PersistedProjectContext } from "../../context/domain/contracts/project-context-repository.contract.js";
import type { ProjectContext } from "../../context/domain/project-context.js";
import type {
  RepositoryStateService,
  RepositoryStateSnapshot
} from "../../repositories/repository-state.service.js";
import type { ScanService } from "../../scan/application/scan.service.js";
import type { ScanSnapshot } from "../../scan/domain/contracts/scan-repository.contract.js";
import type { RepositoryUpdateSnapshot } from "../domain/contracts/repository-update-repository.contract.js";
import type { RepositoryUpdateService } from "./repository-update.service.js";
import { RunRepositoryUpdateService } from "./run-repository-update.service.js";
import { RepositoryProcessingStrategySelector } from "./repository-processing-strategy.selector.js";
import {
  IncrementalFallbackReason,
  type IncrementalProcessingResult
} from "./contracts/repository-incremental-processor.contract.js";

const now = new Date("2026-09-23T12:00:00.000Z");

function createState(overrides: Partial<RepositoryStateSnapshot> = {}): RepositoryStateSnapshot {
  return {
    id: "state_1",
    repositoryId: "repository_1",
    remoteHeadCommitSha: null,
    remoteHeadCheckedAt: null,
    lastScannedCommitSha: null,
    lastAnalyzedCommitSha: null,
    currentProjectContextId: null,
    currentContextCommitSha: null,
    freshnessStatus: RepositoryFreshnessStatus.UNKNOWN,
    lastUpdateStatus: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createUpdate(overrides: Partial<RepositoryUpdateSnapshot> = {}): RepositoryUpdateSnapshot {
  return {
    id: "update_1",
    repositoryId: "repository_1",
    triggerType: RepositoryUpdateTriggerType.MANUAL,
    baseCommitSha: "commit_a",
    targetCommitSha: "commit_b",
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

function createScan(overrides: Partial<ScanSnapshot> = {}): ScanSnapshot {
  return {
    id: "scan_b",
    repositoryId: "repository_1",
    status: "COMPLETED",
    commitSha: "commit_b",
    startedAt: now,
    completedAt: now,
    durationMs: 1,
    totalFiles: 1,
    totalSize: 10n,
    filesProcessed: 1,
    totalBytesConsidered: 10n,
    scanLimitReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: "analysis_b",
    scanId: "scan_b",
    repositoryId: "repository_1",
    commitSha: "commit_b",
    analyzerVersion: "analysis-engine@1.0.0",
    generatedAt: now,
    project: {
      ecosystems: [],
      languages: [],
      packageManager: {
        status: "UNKNOWN",
        evidence: []
      },
      frameworks: [],
      manifests: [],
      packages: [],
      dependencies: [],
      issues: []
    },
    files: [],
    sourceStructures: [],
    relationships: [],
    dependencies: [],
    issues: [],
    ...overrides
  };
}

function createContext(overrides: Partial<PersistedProjectContext> = {}): PersistedProjectContext {
  return {
    id: "context_b",
    contextId: "ctx_b",
    analysisId: "analysis_b",
    scanId: "scan_b",
    repositoryId: "repository_1",
    commitSha: "commit_b",
    contextVersion: "context-engine@5.7.1",
    generatedAt: now,
    createdAt: now,
    context: {
      toSnapshot: () => ({})
    } as unknown as ProjectContext,
    ...overrides
  };
}

function createHarness(
  options: {
    initialState?: RepositoryStateSnapshot;
    refreshedState?: RepositoryStateSnapshot;
    scanError?: Error;
    analysisError?: Error;
    contextError?: Error;
    changeSetError?: Error;
    incrementalProcessorError?: Error;
    changeSetCompleteness?: ChangeSetCompleteness;
    stateUpdateError?: Error;
    ownershipError?: Error;
  } = {}
) {
  let lockActive = false;
  const withRepositoryUpdateLock = vi.fn(async (_repositoryId, _userId, operation) => {
    if (options.ownershipError) {
      throw options.ownershipError;
    }

    lockActive = true;

    try {
      return await operation();
    } finally {
      lockActive = false;
    }
  });
  const createPendingUpdate = vi.fn(async () => createUpdate());
  const startOwnedWithinLock = vi.fn(async () =>
    createUpdate({
      status: RepositoryUpdateStatus.RUNNING,
      startedAt: now
    })
  );
  const completeOwnedWithinLock = vi.fn(async () =>
    createUpdate({
      status: RepositoryUpdateStatus.COMPLETED,
      startedAt: now,
      completedAt: now,
      scanId: "scan_b",
      analysisId: "analysis_b",
      projectContextId: "context_b"
    })
  );
  const failOwnedWithinLock = vi.fn(async (_updateId, _userId, failureReason) =>
    createUpdate({
      status: RepositoryUpdateStatus.FAILED,
      startedAt: now,
      failedAt: now,
      failureReason
    })
  );
  const recordArtifactsOwned = vi.fn(async (_updateId, _userId, artifacts) =>
    createUpdate({
      status: RepositoryUpdateStatus.RUNNING,
      startedAt: now,
      scanId: artifacts.scanId ?? null,
      analysisId: artifacts.analysisId ?? null,
      projectContextId: artifacts.projectContextId ?? null
    })
  );
  const repositoryUpdateService = {
    withRepositoryUpdateLock,
    createPendingUpdate,
    startOwnedWithinLock,
    completeOwnedWithinLock,
    failOwnedWithinLock,
    recordArtifactsOwned
  } as unknown as RepositoryUpdateService;

  const getOrInitialize = vi.fn(async () =>
    createState({
      currentProjectContextId: "context_a",
      currentContextCommitSha: "commit_a",
      ...(options.initialState ?? {})
    })
  );
  const refreshRemoteHead = vi.fn(async () =>
    createState({
      currentProjectContextId: "context_a",
      currentContextCommitSha: "commit_a",
      remoteHeadCommitSha: "commit_b",
      freshnessStatus: RepositoryFreshnessStatus.STALE,
      ...(options.refreshedState ?? {})
    })
  );
  const markCurrentProjectContext = vi.fn(async () => {
    if (options.stateUpdateError) {
      throw options.stateUpdateError;
    }

    return createState({
      currentProjectContextId: "context_b",
      currentContextCommitSha: "commit_b",
      lastScannedCommitSha: "commit_b",
      lastAnalyzedCommitSha: "commit_b",
      remoteHeadCommitSha: "commit_b",
      freshnessStatus: RepositoryFreshnessStatus.FRESH
    });
  });
  const markRemoteHeadObserved = vi.fn(async () =>
    createState({
      currentProjectContextId: "context_a",
      currentContextCommitSha: "commit_a",
      remoteHeadCommitSha: "commit_b",
      freshnessStatus: RepositoryFreshnessStatus.STALE
    })
  );
  const repositoryStateService = {
    getOrInitialize,
    refreshRemoteHead,
    markCurrentProjectContext,
    markRemoteHeadObserved
  } as unknown as RepositoryStateService;

  const compare = vi.fn(async () => {
    if (options.changeSetError) {
      throw options.changeSetError;
    }

    return {
      baseCommitSha: "commit_a",
      targetCommitSha: "commit_b",
      comparisonStatus: ComparisonStatus.AHEAD,
      completeness: options.changeSetCompleteness ?? ChangeSetCompleteness.COMPLETE,
      aheadBy: 1,
      behindBy: 0,
      changedFileCount: 0,
      additions: 0,
      deletions: 0,
      files: []
    };
  });
  const changeSetService = { compare } as unknown as ChangeSetService;
  const incrementalProcessingEligibilityService = new IncrementalProcessingEligibilityService();
  const evaluateEligibility = vi.spyOn(incrementalProcessingEligibilityService, "evaluate");
  const processingStrategySelector = new RepositoryProcessingStrategySelector();
  const selectProcessingStrategy = vi.spyOn(processingStrategySelector, "select");
  const processIncrementally = vi.fn(async (): Promise<IncrementalProcessingResult> => ({
    outcome: "FALLBACK_REQUIRED",
    reason: IncrementalFallbackReason.MISSING_BASE_ARTIFACTS
  }));
  const incrementalProcessor = { process: processIncrementally };

  if (options.incrementalProcessorError) {
    processIncrementally.mockRejectedValue(options.incrementalProcessorError);
  }

  const startScan = vi.fn(async () => {
    if (options.scanError) {
      throw options.scanError;
    }

    return createScan();
  });
  const scanService = { startScan } as unknown as ScanService;
  const run = vi.fn(async () => {
    if (options.analysisError) {
      throw options.analysisError;
    }

    return createAnalysis();
  });
  const runAnalysisService = { run } as unknown as RunAnalysisService;
  const generate = vi.fn(async () => {
    if (options.contextError) {
      throw options.contextError;
    }

    return createContext();
  });
  const generateAndPersistProjectContextService = {
    generate
  } as unknown as GenerateAndPersistProjectContextService;

  return {
    service: new RunRepositoryUpdateService(
      repositoryUpdateService,
      repositoryStateService,
      changeSetService,
      incrementalProcessingEligibilityService,
      processingStrategySelector,
      incrementalProcessor,
      scanService,
      runAnalysisService,
      generateAndPersistProjectContextService
    ),
    withRepositoryUpdateLock,
    createPendingUpdate,
    startOwnedWithinLock,
    completeOwnedWithinLock,
    failOwnedWithinLock,
    recordArtifactsOwned,
    getOrInitialize,
    refreshRemoteHead,
    markCurrentProjectContext,
    markRemoteHeadObserved,
    compare,
    evaluateEligibility,
    selectProcessingStrategy,
    processIncrementally,
    isLockActive: () => lockActive,
    startScan,
    run,
    generate
  };
}

describe("RunRepositoryUpdateService", () => {
  it("promotes completed incremental artifacts without executing full processing", async () => {
    const h = createHarness();
    h.processIncrementally.mockImplementation(async () => {
      expect(h.isLockActive()).toBe(true);
      expect(h.markCurrentProjectContext).not.toHaveBeenCalled();
      return {
        outcome: "COMPLETED",
        targetCommitSha: "commit_b",
        scan: createScan(),
        analysis: createAnalysis(),
        projectContext: createContext()
      };
    });
    await expect(h.service.runManualUpdate("repository_1", "user_1")).resolves.toMatchObject({
      update: expect.objectContaining({ status: RepositoryUpdateStatus.COMPLETED }),
      projectContextId: "context_b"
    });
    expect(h.startScan).not.toHaveBeenCalled();
    expect(h.run).not.toHaveBeenCalled();
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.createPendingUpdate).toHaveBeenCalledTimes(1);
    expect(h.markCurrentProjectContext).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      projectContextId: "context_b",
      commitSha: "commit_b"
    });
  });

  it.each(["envelope", "scan", "analysis", "context"])(
    "does not promote a wrong target in %s",
    async (part) => {
      const h = createHarness();
      h.processIncrementally.mockResolvedValue({
        outcome: "COMPLETED",
        targetCommitSha: part === "envelope" ? "wrong" : "commit_b",
        scan: createScan({ commitSha: part === "scan" ? "wrong" : "commit_b" }),
        analysis: createAnalysis({ commitSha: part === "analysis" ? "wrong" : "commit_b" }),
        projectContext: createContext({ commitSha: part === "context" ? "wrong" : "commit_b" })
      });
      await expect(h.service.runManualUpdate("repository_1", "user_1")).rejects.toThrow();
      expect(h.markCurrentProjectContext).not.toHaveBeenCalled();
      expect(h.startScan).not.toHaveBeenCalled();
      expect(h.failOwnedWithinLock).toHaveBeenCalledWith(
        "update_1",
        "user_1",
        "INCREMENTAL_PROCESSING_FAILED"
      );
    }
  );

  it("runs HEAD to scan to analysis to context and promotes the new current context", async () => {
    const harness = createHarness();

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).resolves.toMatchObject({
      noop: false,
      targetCommitSha: "commit_b",
      baseCommitSha: "commit_a",
      scanId: "scan_b",
      analysisId: "analysis_b",
      projectContextId: "context_b",
      freshnessStatus: RepositoryFreshnessStatus.FRESH,
      update: expect.objectContaining({ status: RepositoryUpdateStatus.COMPLETED })
    });
    expect(harness.withRepositoryUpdateLock).toHaveBeenCalledTimes(1);
    expect(harness.compare).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      baseCommitSha: "commit_a",
      targetCommitSha: "commit_b"
    });
    expect(harness.compare.mock.invocationCallOrder[0]!).toBeLessThan(
      harness.startScan.mock.invocationCallOrder[0]!
    );
    expect(harness.evaluateEligibility).toHaveBeenCalledWith(
      expect.objectContaining({ completeness: ChangeSetCompleteness.COMPLETE })
    );
    expect(harness.evaluateEligibility).toHaveReturnedWith({
      eligible: true,
      reason: "COMPLETE_CHANGE_SET"
    });
    expect(harness.selectProcessingStrategy).toHaveReturnedWith("INCREMENTAL");
    expect(harness.processIncrementally).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      baseCommitSha: "commit_a",
      targetCommitSha: "commit_b",
      changeSet: expect.objectContaining({
        completeness: ChangeSetCompleteness.COMPLETE
      })
    });
    expect(harness.startScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      reference: "commit_b"
    });
    expect(harness.run).toHaveBeenCalledWith({ userId: "user_1", scanId: "scan_b" });
    expect(harness.generate).toHaveBeenCalledWith({ userId: "user_1", analysisId: "analysis_b" });
    expect(harness.markCurrentProjectContext).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      projectContextId: "context_b",
      commitSha: "commit_b"
    });
  });

  it("supports first update when no current context exists", async () => {
    const harness = createHarness({
      initialState: createState(),
      refreshedState: createState({
        remoteHeadCommitSha: "commit_b",
        freshnessStatus: RepositoryFreshnessStatus.UNKNOWN
      })
    });

    await harness.service.runManualUpdate("repository_1", "user_1");

    expect(harness.createPendingUpdate).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      triggerType: RepositoryUpdateTriggerType.MANUAL,
      baseCommitSha: null,
      targetCommitSha: "commit_b"
    });
    expect(harness.compare).not.toHaveBeenCalled();
    expect(harness.evaluateEligibility).toHaveBeenCalledWith(null);
    expect(harness.evaluateEligibility).toHaveReturnedWith({
      eligible: false,
      reason: "NO_CHANGE_SET"
    });
    expect(harness.selectProcessingStrategy).toHaveReturnedWith("FULL");
    expect(harness.processIncrementally).not.toHaveBeenCalled();
    expect(harness.startScan).toHaveBeenCalled();
    expect(harness.run).toHaveBeenCalled();
    expect(harness.generate).toHaveBeenCalled();
    expect(harness.markCurrentProjectContext).toHaveBeenCalled();
  });

  it("returns a no-op and avoids pipeline work when current context already matches HEAD", async () => {
    const harness = createHarness({
      initialState: createState({
        currentProjectContextId: "context_b",
        currentContextCommitSha: "commit_b"
      }),
      refreshedState: createState({
        currentProjectContextId: "context_b",
        currentContextCommitSha: "commit_b",
        remoteHeadCommitSha: "commit_b",
        freshnessStatus: RepositoryFreshnessStatus.FRESH
      })
    });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).resolves.toMatchObject({
      noop: true,
      update: null,
      targetCommitSha: "commit_b",
      projectContextId: "context_b",
      freshnessStatus: RepositoryFreshnessStatus.FRESH
    });
    expect(harness.createPendingUpdate).not.toHaveBeenCalled();
    expect(harness.compare).not.toHaveBeenCalled();
    expect(harness.evaluateEligibility).not.toHaveBeenCalled();
    expect(harness.selectProcessingStrategy).not.toHaveBeenCalled();
    expect(harness.processIncrementally).not.toHaveBeenCalled();
    expect(harness.startScan).not.toHaveBeenCalled();
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it("fails before pipeline work when ChangeSet comparison fails", async () => {
    const harness = createHarness({ changeSetError: new Error("compare failed") });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).rejects.toThrow(
      "compare failed"
    );
    expect(harness.createPendingUpdate).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      triggerType: RepositoryUpdateTriggerType.MANUAL,
      baseCommitSha: "commit_a",
      targetCommitSha: "commit_b"
    });
    expect(harness.startOwnedWithinLock).toHaveBeenCalled();
    expect(harness.evaluateEligibility).not.toHaveBeenCalled();
    expect(harness.selectProcessingStrategy).not.toHaveBeenCalled();
    expect(harness.processIncrementally).not.toHaveBeenCalled();
    expect(harness.failOwnedWithinLock).toHaveBeenCalledWith(
      "update_1",
      "user_1",
      "CHANGESET_COMPARISON_FAILED"
    );
    expect(harness.startScan).not.toHaveBeenCalled();
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.markCurrentProjectContext).not.toHaveBeenCalled();
    expect(harness.markRemoteHeadObserved).not.toHaveBeenCalled();
  });

  it("continues the full update when the ChangeSet is incomplete", async () => {
    const harness = createHarness({
      changeSetCompleteness: ChangeSetCompleteness.INCOMPLETE
    });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).resolves.toMatchObject({
      noop: false,
      update: expect.objectContaining({ status: RepositoryUpdateStatus.COMPLETED }),
      targetCommitSha: "commit_b"
    });
    expect(harness.compare).toHaveBeenCalledTimes(1);
    expect(harness.evaluateEligibility).toHaveReturnedWith({
      eligible: false,
      reason: "INCOMPLETE_CHANGE_SET"
    });
    expect(harness.selectProcessingStrategy).toHaveReturnedWith("FULL");
    expect(harness.processIncrementally).not.toHaveBeenCalled();
    expect(harness.startScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      reference: "commit_b"
    });
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.generate).toHaveBeenCalledTimes(1);
    expect(harness.markCurrentProjectContext).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      projectContextId: "context_b",
      commitSha: "commit_b"
    });
    expect(harness.failOwnedWithinLock).not.toHaveBeenCalled();
  });

  it("does not convert arbitrary incremental processor failures into full fallback", async () => {
    const processorError = new Error("incremental processor programming failure");
    const harness = createHarness({ incrementalProcessorError: processorError });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).rejects.toBe(
      processorError
    );
    expect(harness.processIncrementally).toHaveBeenCalledTimes(1);
    expect(harness.startScan).not.toHaveBeenCalled();
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.generate).not.toHaveBeenCalled();
    expect(harness.failOwnedWithinLock).toHaveBeenCalledWith(
      "update_1",
      "user_1",
      "INCREMENTAL_PROCESSING_FAILED"
    );
  });

  it("runs ChangeSet comparison inside the existing repository update lock", async () => {
    const harness = createHarness();
    harness.compare.mockImplementation(async () => {
      expect(harness.isLockActive()).toBe(true);
      return {
        baseCommitSha: "commit_a",
        targetCommitSha: "commit_b",
        comparisonStatus: ComparisonStatus.AHEAD,
        completeness: ChangeSetCompleteness.COMPLETE,
        aheadBy: 1,
        behindBy: 0,
        changedFileCount: 0,
        additions: 0,
        deletions: 0,
        files: []
      };
    });

    await harness.service.runManualUpdate("repository_1", "user_1");

    expect(harness.withRepositoryUpdateLock).toHaveBeenCalledTimes(1);
    expect(harness.compare).toHaveBeenCalledTimes(1);
  });

  it("fails the update and preserves current context when scan fails", async () => {
    const harness = createHarness({ scanError: new Error("scan failed") });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).rejects.toThrow(
      "scan failed"
    );
    expect(harness.failOwnedWithinLock).toHaveBeenCalledWith("update_1", "user_1", "SCAN_FAILED");
    expect(harness.markCurrentProjectContext).not.toHaveBeenCalled();
    expect(harness.markRemoteHeadObserved).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      userId: "user_1",
      remoteHeadCommitSha: "commit_b"
    });
  });

  it("records scan provenance and fails when analysis fails", async () => {
    const harness = createHarness({ analysisError: new Error("analysis failed") });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).rejects.toThrow(
      "analysis failed"
    );
    expect(harness.recordArtifactsOwned).toHaveBeenCalledWith("update_1", "user_1", {
      scanId: "scan_b"
    });
    expect(harness.failOwnedWithinLock).toHaveBeenCalledWith(
      "update_1",
      "user_1",
      "ANALYSIS_FAILED"
    );
    expect(harness.markCurrentProjectContext).not.toHaveBeenCalled();
  });

  it("records scan and analysis provenance and fails when context generation fails", async () => {
    const harness = createHarness({ contextError: new Error("context failed") });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).rejects.toThrow(
      "context failed"
    );
    expect(harness.recordArtifactsOwned).toHaveBeenCalledWith("update_1", "user_1", {
      scanId: "scan_b"
    });
    expect(harness.recordArtifactsOwned).toHaveBeenCalledWith("update_1", "user_1", {
      analysisId: "analysis_b"
    });
    expect(harness.failOwnedWithinLock).toHaveBeenCalledWith(
      "update_1",
      "user_1",
      "CONTEXT_GENERATION_FAILED"
    );
    expect(harness.markCurrentProjectContext).not.toHaveBeenCalled();
  });

  it("records context provenance and fails when current-context promotion fails", async () => {
    const harness = createHarness({ stateUpdateError: new Error("state failed") });

    await expect(harness.service.runManualUpdate("repository_1", "user_1")).rejects.toThrow(
      "state failed"
    );
    expect(harness.recordArtifactsOwned).toHaveBeenCalledWith("update_1", "user_1", {
      projectContextId: "context_b"
    });
    expect(harness.failOwnedWithinLock).toHaveBeenCalledWith(
      "update_1",
      "user_1",
      "CURRENT_CONTEXT_UPDATE_FAILED"
    );
  });

  it("enforces ownership through the repository update lock boundary", async () => {
    const harness = createHarness({
      ownershipError: new NotFoundException("Repository not found")
    });

    await expect(harness.service.runManualUpdate("repository_1", "user_2")).rejects.toThrow(
      NotFoundException
    );
    expect(harness.refreshRemoteHead).not.toHaveBeenCalled();
    expect(harness.createPendingUpdate).not.toHaveBeenCalled();
  });
});
