import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { ANALYSIS_ENGINE_VERSION } from "./analysis-engine-version.js";
import type { AnalysisInputService } from "./analysis-input.service.js";
import type { AnalysisPipelineService } from "./analysis-pipeline.service.js";
import type { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import { RunAnalysisService } from "./run-analysis.service.js";
import type { RepositoryOwnershipVerifier } from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";
import type {
  ScanRepository,
  ScanSnapshot
} from "../../scan/domain/contracts/scan-repository.contract.js";

const now = new Date("2026-08-14T12:00:00.000Z");
const analysisInput: AnalysisInput = {
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contentReader: {
    listFiles: vi.fn(),
    readFile: vi.fn()
  }
};

function scan(status: ScanSnapshot["status"] = "COMPLETED"): ScanSnapshot {
  return {
    id: "scan_1",
    repositoryId: "repository_1",
    status,
    commitSha: "abc123",
    startedAt: now,
    completedAt: status === "COMPLETED" ? now : null,
    durationMs: null,
    totalFiles: 1,
    totalSize: 10n,
    createdAt: now,
    updatedAt: now
  };
}

function result(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    analyzerVersion: ANALYSIS_ENGINE_VERSION,
    generatedAt: now,
    project: {
      ecosystems: [],
      languages: [],
      packageManager: { status: "UNKNOWN", evidence: [] },
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

function createService(
  options: { scan?: ScanSnapshot | null; pipelineResult?: AnalysisResult } = {}
) {
  const scanRepository = {
    getScan: vi.fn(async () => (Object.hasOwn(options, "scan") ? options.scan : scan()))
  } as unknown as ScanRepository;
  const ownershipVerifier = {
    verifyRepositoryOwnership: vi.fn(async () => undefined)
  } as unknown as RepositoryOwnershipVerifier;
  const analysisInputService = {
    prepareAnalysisInput: vi.fn(async () => analysisInput)
  } as unknown as AnalysisInputService;
  const analysisPipelineService = {
    analyze: vi.fn(
      async (input) =>
        options.pipelineResult ??
        result({
          analysisId: input.analysis.id,
          analyzerVersion: input.analysis.analyzerVersion,
          generatedAt: input.generatedAt
        })
    )
  } as unknown as AnalysisPipelineService;
  const persistAnalysisResultService = {
    save: vi.fn(async (analysisResult: AnalysisResult) => analysisResult)
  } as unknown as PersistAnalysisResultService;

  return {
    service: new RunAnalysisService(
      scanRepository,
      ownershipVerifier,
      analysisInputService,
      analysisPipelineService,
      persistAnalysisResultService
    ),
    scanRepository,
    ownershipVerifier,
    analysisInputService,
    analysisPipelineService,
    persistAnalysisResultService
  };
}

describe("RunAnalysisService", () => {
  it("runs the existing pipeline for an owned completed scan and persists the result", async () => {
    const {
      service,
      ownershipVerifier,
      analysisInputService,
      analysisPipelineService,
      persistAnalysisResultService
    } = createService();

    const response = await service.run({
      userId: "user_1",
      scanId: "scan_1"
    });

    expect(ownershipVerifier.verifyRepositoryOwnership).toHaveBeenCalledWith({
      userId: "user_1",
      repositoryId: "repository_1"
    });
    expect(analysisInputService.prepareAnalysisInput).toHaveBeenCalledWith({ scanId: "scan_1" });
    expect(analysisPipelineService.analyze).toHaveBeenCalledWith({
      analysis: expect.objectContaining({
        scanId: "scan_1",
        analyzerVersion: ANALYSIS_ENGINE_VERSION
      }),
      input: analysisInput,
      generatedAt: expect.any(Date)
    });
    expect(persistAnalysisResultService.save).toHaveBeenCalledWith(response);
    expect(response.analysisId).toEqual(expect.any(String));
    expect(response.analyzerVersion).toBe(ANALYSIS_ENGINE_VERSION);
  });

  it.each(["PENDING", "RUNNING", "FAILED", "CANCELLED"] as const)(
    "rejects %s scans without running analysis",
    async (status) => {
      const { service, analysisPipelineService, persistAnalysisResultService } = createService({
        scan: scan(status)
      });

      await expect(service.run({ userId: "user_1", scanId: "scan_1" })).rejects.toThrow(
        BadRequestException
      );
      expect(analysisPipelineService.analyze).not.toHaveBeenCalled();
      expect(persistAnalysisResultService.save).not.toHaveBeenCalled();
    }
  );

  it("returns not found for missing scans", async () => {
    const { service } = createService({ scan: null });

    await expect(service.run({ userId: "user_1", scanId: "missing" })).rejects.toThrow(
      NotFoundException
    );
  });

  it("does not accept client-controlled metadata", async () => {
    const { service, analysisPipelineService } = createService();

    await service.run({
      userId: "user_1",
      scanId: "scan_1"
    });

    expect(analysisPipelineService.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        analysis: expect.objectContaining({
          analyzerVersion: ANALYSIS_ENGINE_VERSION
        }),
        generatedAt: expect.any(Date)
      })
    );
  });
});
