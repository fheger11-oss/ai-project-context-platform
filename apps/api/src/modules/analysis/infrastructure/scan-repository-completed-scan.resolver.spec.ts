import { describe, expect, it, vi } from "vitest";

import type {
  ScanRepository,
  ScanSnapshot,
  ScanStatus
} from "../../scan/domain/contracts/scan-repository.contract.js";
import { ScanRepositoryCompletedScanResolver } from "./scan-repository-completed-scan.resolver.js";

const scan = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "COMPLETED",
  commitSha: "abc123",
  startedAt: new Date("2026-08-14T10:00:00.000Z"),
  completedAt: new Date("2026-08-14T10:00:01.000Z"),
  durationMs: 1000,
  totalFiles: 1,
  totalSize: 42n,
  createdAt: new Date("2026-08-14T10:00:00.000Z"),
  updatedAt: new Date("2026-08-14T10:00:01.000Z")
} satisfies ScanSnapshot;

function createResolver(snapshot: ScanSnapshot | null) {
  const repository = {
    getScan: vi.fn().mockResolvedValue(snapshot)
  } as unknown as ScanRepository;

  return {
    repository,
    resolver: new ScanRepositoryCompletedScanResolver(repository)
  };
}

describe("ScanRepositoryCompletedScanResolver", () => {
  it("resolves only the completed scan fields required for AnalysisInput", async () => {
    const { repository, resolver } = createResolver(scan);

    await expect(resolver.resolveCompletedScan("scan_1")).resolves.toEqual({
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123"
    });
    expect(repository.getScan).toHaveBeenCalledWith("scan_1");
  });

  it.each<ScanStatus>(["PENDING", "RUNNING", "FAILED", "CANCELLED"])(
    "rejects %s scans",
    async (status) => {
      const { resolver } = createResolver({ ...scan, status });

      await expect(
        resolver.resolveCompletedScan(`${status.toLowerCase()}_scan`)
      ).resolves.toBeNull();
    }
  );

  it("returns null when the scan does not exist", async () => {
    const { resolver } = createResolver(null);

    await expect(resolver.resolveCompletedScan("missing_scan")).resolves.toBeNull();
  });
});
