import "reflect-metadata";

import { describe, expect, it, vi } from "vitest";

import type { RepositoryAccessResolver } from "../domain/contracts/repository-access-resolver.contract.js";
import type {
  RepositoryContentAccess,
  RepositoryContentFile,
  RepositoryContentProvider
} from "../domain/contracts/repository-content-provider.contract.js";
import type {
  ScanRepository,
  ScanSnapshot,
  UpdateScanStatusInput
} from "../domain/contracts/scan-repository.contract.js";
import { RepositoryAccessResolutionError } from "../domain/errors/repository-access-resolution.error.js";
import { ScanService } from "./scan.service.js";

const createdAt = new Date("2026-08-07T10:00:00.000Z");
const updatedAt = new Date("2026-08-07T10:00:01.000Z");

const access: RepositoryContentAccess = {
  locator: "repository-locator",
  reference: "main",
  authorization: {
    credential: "opaque"
  }
};

const pendingScan: ScanSnapshot = {
  id: "scan_1",
  repositoryId: "repository_1",
  status: "PENDING",
  commitSha: "commit_sha",
  startedAt: null,
  completedAt: null,
  durationMs: null,
  totalFiles: 0,
  totalSize: 0n,
  createdAt,
  updatedAt
};

const runningScan: ScanSnapshot = {
  ...pendingScan,
  status: "RUNNING"
};

const completedAt = new Date("2026-08-07T10:00:02.000Z");

const completedScan: ScanSnapshot = {
  ...runningScan,
  status: "COMPLETED",
  completedAt,
  durationMs: 2000,
  totalFiles: 0,
  totalSize: 0n
};

const failedScan: ScanSnapshot = {
  ...runningScan,
  status: "FAILED"
};

function createFile(path: string, size = 1n): RepositoryContentFile {
  return {
    path,
    extension: "ts",
    size,
    sha: `${path}_sha`,
    isBinary: false,
    isHidden: false
  };
}

async function* snapshotFiles(files: readonly RepositoryContentFile[]) {
  for (const file of files) {
    yield file;
  }
}

function createService(overrides?: {
  repositoryAccessResolver?: Partial<RepositoryAccessResolver>;
  repositoryContentProvider?: Partial<RepositoryContentProvider>;
  scanRepository?: Partial<ScanRepository>;
}) {
  const repositoryAccessResolver = {
    resolveRepositoryAccess: vi.fn().mockResolvedValue(access),
    ...overrides?.repositoryAccessResolver
  } as RepositoryAccessResolver;
  const repositoryContentProvider = {
    resolveCommit: vi.fn().mockResolvedValue({ commitSha: "commit_sha" }),
    listSnapshotFiles: vi.fn().mockReturnValue(snapshotFiles([])),
    ...overrides?.repositoryContentProvider
  } as RepositoryContentProvider;
  const updateScanStatus = vi.fn(async (input: UpdateScanStatusInput): Promise<ScanSnapshot> => {
    if (input.status === "RUNNING") {
      return runningScan;
    }

    if (input.status === "COMPLETED") {
      return {
        ...completedScan,
        completedAt: input.completedAt ?? null,
        durationMs: input.durationMs ?? null,
        totalFiles: input.totalFiles ?? 0,
        totalSize: input.totalSize ?? 0n
      };
    }

    if (input.status === "FAILED") {
      return failedScan;
    }

    return {
      ...runningScan,
      status: input.status
    };
  });
  const scanRepository = {
    createScan: vi.fn().mockResolvedValue(pendingScan),
    updateScanStatus,
    storeScanFiles: vi.fn(),
    getScan: vi.fn(),
    getLatestScan: vi.fn(),
    ...overrides?.scanRepository
  } as ScanRepository;

  return {
    repositoryAccessResolver,
    repositoryContentProvider,
    scanRepository,
    service: new ScanService(scanRepository, repositoryContentProvider, repositoryAccessResolver)
  };
}

describe("ScanService", () => {
  it("declares only contract tokens as constructor dependencies", () => {
    const dependencyTokens = Reflect.getMetadata("self:paramtypes", ScanService) as
      Array<{ index: number; param: unknown }> | undefined;

    expect(dependencyTokens?.map((dependency) => dependency.param)).toEqual([
      expect.any(Symbol),
      expect.any(Symbol),
      expect.any(Symbol)
    ]);
  });

  it("persists snapshot files and returns the completed snapshot", async () => {
    const { repositoryAccessResolver, repositoryContentProvider, scanRepository, service } =
      createService();

    const result = await service.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(result).toMatchObject({
      status: "COMPLETED",
      totalFiles: 0,
      totalSize: 0n
    });
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    expect(repositoryAccessResolver.resolveRepositoryAccess).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      reference: "main"
    });
    expect(repositoryContentProvider.resolveCommit).toHaveBeenCalledWith(access);
    expect(scanRepository.createScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      commitSha: "commit_sha",
      startedAt: expect.any(Date)
    });
    expect(scanRepository.updateScanStatus).toHaveBeenNthCalledWith(1, {
      scanId: "scan_1",
      status: "RUNNING"
    });
    expect(repositoryContentProvider.listSnapshotFiles).toHaveBeenCalledWith(access, "commit_sha");
    expect(scanRepository.storeScanFiles).not.toHaveBeenCalled();
    expect(scanRepository.updateScanStatus).toHaveBeenNthCalledWith(2, {
      scanId: "scan_1",
      status: "COMPLETED",
      completedAt: expect.any(Date),
      durationMs: expect.any(Number),
      totalFiles: 0,
      totalSize: 0n
    });
  });

  it("marks the scan completed with accumulated file totals", async () => {
    const files = [createFile("src/one.ts", 4n), createFile("src/two.ts", 9n)];
    const { scanRepository, service } = createService({
      repositoryContentProvider: {
        listSnapshotFiles: vi.fn().mockReturnValue(snapshotFiles(files))
      }
    });

    const result = await service.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(result).toMatchObject({
      status: "COMPLETED",
      totalFiles: 2,
      totalSize: 13n
    });
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(scanRepository.updateScanStatus).toHaveBeenLastCalledWith({
      scanId: "scan_1",
      status: "COMPLETED",
      completedAt: expect.any(Date),
      durationMs: expect.any(Number),
      totalFiles: 2,
      totalSize: 13n
    });
  });

  it("resolves access, commit, creates a scan, and marks it running before persistence", async () => {
    const { repositoryAccessResolver, repositoryContentProvider, scanRepository, service } =
      createService();

    await service.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(repositoryAccessResolver.resolveRepositoryAccess).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      reference: "main"
    });
    expect(repositoryContentProvider.resolveCommit).toHaveBeenCalledWith(access);
    expect(scanRepository.createScan).toHaveBeenCalledWith({
      repositoryId: "repository_1",
      commitSha: "commit_sha",
      startedAt: expect.any(Date)
    });
    expect(scanRepository.updateScanStatus).toHaveBeenNthCalledWith(1, {
      scanId: "scan_1",
      status: "RUNNING"
    });
  });

  it("propagates commit resolution failures before a scan exists", async () => {
    const { scanRepository, service } = createService({
      repositoryContentProvider: {
        resolveCommit: vi.fn().mockRejectedValue(new Error("commit unavailable"))
      }
    });

    await expect(
      service.startScan({
        repositoryId: "repository_1",
        reference: "main"
      })
    ).rejects.toThrow("commit unavailable");

    expect(scanRepository.createScan).not.toHaveBeenCalled();
    expect(scanRepository.updateScanStatus).not.toHaveBeenCalled();
  });

  it("throws a domain error when repository access cannot be resolved", async () => {
    const { repositoryContentProvider, scanRepository, service } = createService({
      repositoryAccessResolver: {
        resolveRepositoryAccess: vi.fn().mockRejectedValue(new Error("missing access"))
      }
    });

    await expect(
      service.startScan({
        repositoryId: "repository_1",
        reference: "main"
      })
    ).rejects.toBeInstanceOf(RepositoryAccessResolutionError);

    expect(repositoryContentProvider.resolveCommit).not.toHaveBeenCalled();
    expect(scanRepository.createScan).not.toHaveBeenCalled();
    expect(scanRepository.updateScanStatus).not.toHaveBeenCalled();
  });

  it("persists snapshot files in batches using the configured batch size", async () => {
    const fileBatchSize = 250;
    const files = Array.from({ length: fileBatchSize + 1 }, (_, index) =>
      createFile(`src/file-${index}.ts`)
    );
    let yieldedFiles = 0;
    const storeScanFiles = vi.fn().mockImplementation(async () => {
      if (storeScanFiles.mock.calls.length === 1) {
        expect(yieldedFiles).toBe(fileBatchSize);
      }
    });
    async function* progressiveFiles() {
      for (const file of files) {
        yieldedFiles += 1;
        yield file;
      }
    }
    const { scanRepository, service } = createService({
      repositoryContentProvider: {
        listSnapshotFiles: vi.fn().mockReturnValue(progressiveFiles())
      },
      scanRepository: {
        storeScanFiles
      }
    });

    await service.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(scanRepository.storeScanFiles).toHaveBeenCalledTimes(2);
    expect(storeScanFiles.mock.calls[0]?.[1]).toHaveLength(fileBatchSize);
    expect(storeScanFiles.mock.calls[1]?.[1]).toHaveLength(1);
  });

  it("persists nothing for an empty repository snapshot", async () => {
    const { scanRepository, service } = createService();

    await service.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(scanRepository.storeScanFiles).not.toHaveBeenCalled();
  });

  it("flushes remaining files after iteration completes", async () => {
    const files = [createFile("src/one.ts"), createFile("src/two.ts")];
    const { scanRepository, service } = createService({
      repositoryContentProvider: {
        listSnapshotFiles: vi.fn().mockReturnValue(snapshotFiles(files))
      }
    });

    await service.startScan({
      repositoryId: "repository_1",
      reference: "main"
    });

    expect(scanRepository.storeScanFiles).toHaveBeenCalledTimes(1);
    expect(scanRepository.storeScanFiles).toHaveBeenCalledWith("scan_1", files);
  });

  it("marks the scan failed and rethrows the original error when persistence fails", async () => {
    const originalError = new Error("persistence failed");
    const { scanRepository, service } = createService({
      repositoryContentProvider: {
        listSnapshotFiles: vi.fn().mockReturnValue(snapshotFiles([createFile("src/index.ts")]))
      },
      scanRepository: {
        storeScanFiles: vi.fn().mockRejectedValue(originalError)
      }
    });

    await expect(
      service.startScan({
        repositoryId: "repository_1",
        reference: "main"
      })
    ).rejects.toBe(originalError);

    expect(scanRepository.updateScanStatus).toHaveBeenNthCalledWith(1, {
      scanId: "scan_1",
      status: "RUNNING"
    });
    expect(scanRepository.updateScanStatus).toHaveBeenNthCalledWith(2, {
      scanId: "scan_1",
      status: "FAILED"
    });
  });
});
