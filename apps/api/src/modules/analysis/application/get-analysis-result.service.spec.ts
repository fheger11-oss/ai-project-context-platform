import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import type { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import { GetAnalysisResultService } from "./get-analysis-result.service.js";
import type { RepositoryOwnershipVerifier } from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";

const result: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine-4.10",
  generatedAt: new Date("2026-08-14T12:00:00.000Z"),
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
  issues: []
};

function createService(found: AnalysisResult | null = result) {
  const persistAnalysisResultService = {
    findById: vi.fn(async () => found)
  } as unknown as PersistAnalysisResultService;
  const ownershipVerifier = {
    verifyRepositoryOwnership: vi.fn(async () => undefined)
  } as unknown as RepositoryOwnershipVerifier;

  return {
    service: new GetAnalysisResultService(persistAnalysisResultService, ownershipVerifier),
    persistAnalysisResultService,
    ownershipVerifier
  };
}

describe("GetAnalysisResultService", () => {
  it("retrieves a persisted AnalysisResult after verifying ownership", async () => {
    const { service, persistAnalysisResultService, ownershipVerifier } = createService();

    await expect(service.get({ userId: "user_1", analysisId: "analysis_1" })).resolves.toEqual(
      result
    );
    expect(persistAnalysisResultService.findById).toHaveBeenCalledWith("analysis_1");
    expect(ownershipVerifier.verifyRepositoryOwnership).toHaveBeenCalledWith({
      userId: "user_1",
      repositoryId: "repository_1"
    });
  });

  it("returns not found for unknown analysis ids", async () => {
    const { service, ownershipVerifier } = createService(null);

    await expect(service.get({ userId: "user_1", analysisId: "missing" })).rejects.toThrow(
      NotFoundException
    );
    expect(ownershipVerifier.verifyRepositoryOwnership).not.toHaveBeenCalled();
  });
});
