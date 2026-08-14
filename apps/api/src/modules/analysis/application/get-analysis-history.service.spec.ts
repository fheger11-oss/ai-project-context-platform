import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { PersistAnalysisResultService } from "./persist-analysis-result.service.js";
import { GetAnalysisHistoryService } from "./get-analysis-history.service.js";
import type { RepositoryOwnershipVerifier } from "../../scan/domain/contracts/repository-ownership-verifier.contract.js";
import type {
  ScanRepository,
  ScanSnapshot
} from "../../scan/domain/contracts/scan-repository.contract.js";

const scan: ScanSnapshot = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "abc123",
  startedAt: new Date("2026-08-14T11:59:00.000Z"),
  completedAt: new Date("2026-08-14T12:00:00.000Z"),
  durationMs: 1_000,
  totalFiles: 2,
  totalSize: 42n,
  createdAt: new Date("2026-08-14T11:59:00.000Z"),
  updatedAt: new Date("2026-08-14T12:00:00.000Z")
};

const history = [
  {
    analysisId: "analysis_new",
    scanId: "scan_1",
    analyzerVersion: "analysis-engine-4.13",
    generatedAt: new Date("2026-08-14T12:05:00.000Z"),
    commitSha: "abc123"
  },
  {
    analysisId: "analysis_old",
    scanId: "scan_1",
    analyzerVersion: "analysis-engine-4.13",
    generatedAt: new Date("2026-08-14T12:00:00.000Z"),
    commitSha: "abc123"
  }
];

function createService(foundScan: ScanSnapshot | null = scan) {
  const scanRepository = {
    getScan: vi.fn(async () => foundScan)
  } as unknown as ScanRepository;
  const ownershipVerifier = {
    verifyRepositoryOwnership: vi.fn(async () => undefined)
  } as unknown as RepositoryOwnershipVerifier;
  const persistAnalysisResultService = {
    findHistoryByScanId: vi.fn(async () => history)
  } as unknown as PersistAnalysisResultService;

  return {
    service: new GetAnalysisHistoryService(
      scanRepository,
      ownershipVerifier,
      persistAnalysisResultService
    ),
    scanRepository,
    ownershipVerifier,
    persistAnalysisResultService
  };
}

describe("GetAnalysisHistoryService", () => {
  it("verifies scan ownership before returning lightweight analysis history", async () => {
    const { service, scanRepository, ownershipVerifier, persistAnalysisResultService } =
      createService();

    await expect(service.getByScan({ userId: "user_1", scanId: "scan_1" })).resolves.toEqual(
      history
    );

    expect(scanRepository.getScan).toHaveBeenCalledWith("scan_1");
    expect(ownershipVerifier.verifyRepositoryOwnership).toHaveBeenCalledWith({
      userId: "user_1",
      repositoryId: "repository_1"
    });
    expect(persistAnalysisResultService.findHistoryByScanId).toHaveBeenCalledWith("scan_1");
  });

  it("returns not found for unknown scans without revealing analysis existence", async () => {
    const { service, ownershipVerifier, persistAnalysisResultService } = createService(null);

    await expect(service.getByScan({ userId: "user_1", scanId: "missing" })).rejects.toThrow(
      NotFoundException
    );
    expect(ownershipVerifier.verifyRepositoryOwnership).not.toHaveBeenCalled();
    expect(persistAnalysisResultService.findHistoryByScanId).not.toHaveBeenCalled();
  });

  it("surfaces ownership failures and does not query history afterward", async () => {
    const { service, ownershipVerifier, persistAnalysisResultService } = createService();
    vi.mocked(ownershipVerifier.verifyRepositoryOwnership).mockRejectedValueOnce(
      new NotFoundException("Repository was not found")
    );

    await expect(service.getByScan({ userId: "user_2", scanId: "scan_1" })).rejects.toThrow(
      NotFoundException
    );
    expect(persistAnalysisResultService.findHistoryByScanId).not.toHaveBeenCalled();
  });
});
