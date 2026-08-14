import { describe, expect, it, vi } from "vitest";

import type { AnalysisRepository } from "../domain/contracts/analysis-repository.contract.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { AnalysisPersistenceError } from "../domain/errors/analysis-persistence.error.js";
import { PersistAnalysisResultService } from "./persist-analysis-result.service.js";

const result: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-4.9",
  generatedAt: new Date("2026-08-14T12:00:00.000Z"),
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
  issues: []
};

function createService(repository: Partial<AnalysisRepository> = {}) {
  const analysisRepository = {
    saveResult: vi.fn(async (analysisResult: AnalysisResult) => analysisResult),
    findResultById: vi.fn(async () => result),
    ...repository
  } as unknown as AnalysisRepository;

  return {
    analysisRepository,
    service: new PersistAnalysisResultService(analysisRepository)
  };
}

describe("PersistAnalysisResultService", () => {
  it("saves AnalysisResult through the AnalysisRepository contract", async () => {
    const { service, analysisRepository } = createService();

    await expect(service.save(result)).resolves.toEqual(result);
    expect(analysisRepository.saveResult).toHaveBeenCalledWith(result);
  });

  it("retrieves AnalysisResult through the AnalysisRepository contract", async () => {
    const { service, analysisRepository } = createService();

    await expect(service.findById("analysis_1")).resolves.toEqual(result);
    expect(analysisRepository.findResultById).toHaveBeenCalledWith("analysis_1");
  });

  it("rejects invalid persistence input before calling the repository", async () => {
    const { service, analysisRepository } = createService();

    await expect(service.save({ ...result, analysisId: "" })).rejects.toThrow(
      AnalysisPersistenceError
    );
    expect(analysisRepository.saveResult).not.toHaveBeenCalled();
  });
});
