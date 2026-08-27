import { describe, expect, it, vi } from "vitest";

import { ScanHistoryAnalysisQueryService } from "./scan-history-analysis-query.service.js";
import type { ScanSnapshot } from "../domain/contracts/scan-repository.contract.js";

function scan(id: string, status: ScanSnapshot["status"] = "COMPLETED"): ScanSnapshot {
  return {
    id,
    repositoryId: "repository_1",
    status,
    commitSha: "commit_sha",
    startedAt: new Date("2026-08-14T12:00:00.000Z"),
    completedAt: new Date("2026-08-14T12:01:00.000Z"),
    durationMs: 60000,
    totalFiles: 10,
    totalSize: 100n,
    createdAt: new Date("2026-08-14T12:00:00.000Z"),
    updatedAt: new Date("2026-08-14T12:01:00.000Z")
  };
}

describe("ScanHistoryAnalysisQueryService", () => {
  it("loads latest completed analysis summaries for scan history in one query", async () => {
    const prisma = {
      analysis: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "analysis_latest",
            scanId: "scan_1",
            analyzerVersion: "analysis-engine@1",
            generatedAt: new Date("2026-08-14T12:05:00.000Z"),
            commitSha: "commit_sha"
          },
          {
            id: "analysis_older",
            scanId: "scan_1",
            analyzerVersion: "analysis-engine@1",
            generatedAt: new Date("2026-08-14T12:00:00.000Z"),
            commitSha: "commit_sha"
          }
        ])
      }
    };
    const service = new ScanHistoryAnalysisQueryService(prisma as never);

    const result = await service.getLatestCompletedByScanId([
      scan("scan_1"),
      scan("scan_2"),
      scan("scan_failed", "FAILED")
    ]);

    expect(prisma.analysis.findMany).toHaveBeenCalledWith({
      where: {
        scanId: { in: ["scan_1", "scan_2"] },
        status: "COMPLETED",
        generatedAt: { not: null }
      },
      select: {
        id: true,
        scanId: true,
        analyzerVersion: true,
        generatedAt: true,
        commitSha: true
      },
      orderBy: [{ generatedAt: "desc" }, { id: "desc" }]
    });
    expect(result.get("scan_1")).toEqual({
      analysisId: "analysis_latest",
      scanId: "scan_1",
      analyzerVersion: "analysis-engine@1",
      generatedAt: "2026-08-14T12:05:00.000Z",
      commitSha: "commit_sha"
    });
    expect(result.has("scan_2")).toBe(false);
    expect(result.has("scan_failed")).toBe(false);
  });

  it("skips the database query when scan history has no completed scans", async () => {
    const prisma = {
      analysis: {
        findMany: vi.fn()
      }
    };
    const service = new ScanHistoryAnalysisQueryService(prisma as never);

    await expect(
      service.getLatestCompletedByScanId([scan("scan_failed", "FAILED")])
    ).resolves.toEqual(new Map());
    expect(prisma.analysis.findMany).not.toHaveBeenCalled();
  });
});
