import { Inject, Injectable } from "@nestjs/common";

import {
  REPOSITORY_ACCESS_RESOLVER,
  type RepositoryAccessResolver
} from "../domain/contracts/repository-access-resolver.contract.js";
import {
  REPOSITORY_CONTENT_PROVIDER,
  type RepositoryContentProvider
} from "../domain/contracts/repository-content-provider.contract.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository,
  type ScanSnapshot,
  type StoreScanFileInput
} from "../domain/contracts/scan-repository.contract.js";
import { InvalidScanStateTransitionError } from "../domain/errors/invalid-scan-state-transition.error.js";
import { RepositoryAccessResolutionError } from "../domain/errors/repository-access-resolution.error.js";
import { assertValidScanStatusTransition } from "../domain/scan-state-machine.js";

export type StartScanInput = {
  repositoryId: string;
  reference: string;
};

type SnapshotPersistenceStats = {
  totalFiles: number;
  totalSize: bigint;
};

@Injectable()
export class ScanService {
  private static readonly FILE_BATCH_SIZE = 250;

  constructor(
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository: ScanRepository,
    @Inject(REPOSITORY_CONTENT_PROVIDER)
    private readonly repositoryContentProvider: RepositoryContentProvider,
    @Inject(REPOSITORY_ACCESS_RESOLVER)
    private readonly repositoryAccessResolver: RepositoryAccessResolver
  ) {}

  /**
   * Snapshot orchestration boundary:
   * resolve access, resolve commit, create immutable scan, mark it running,
   * persist repository snapshot metadata, then complete the snapshot.
   */
  async startScan(input: StartScanInput): Promise<ScanSnapshot> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs);
    const access = await this.resolveRepositoryAccess(input);
    const commit = await this.repositoryContentProvider.resolveCommit(access);
    const existingCompletedScan = await this.scanRepository.findCompletedScanByRepositoryAndCommit(
      input.repositoryId,
      commit.commitSha
    );

    if (existingCompletedScan) {
      return existingCompletedScan;
    }

    const scan = await this.scanRepository.createScan({
      repositoryId: input.repositoryId,
      commitSha: commit.commitSha,
      startedAt
    });

    assertValidScanStatusTransition(scan.status, "RUNNING");
    const runningScan = await this.scanRepository.updateScanStatus({
      scanId: scan.id,
      status: "RUNNING"
    });

    try {
      const stats = await this.persistSnapshotFiles(scan.id, access, commit.commitSha);

      return this.completeScan(runningScan, stats, startedAtMs);
    } catch (error) {
      if (error instanceof InvalidScanStateTransitionError) {
        throw error;
      }

      await this.failScan(runningScan);
      throw error;
    }
  }

  private async resolveRepositoryAccess(input: StartScanInput) {
    try {
      return await this.repositoryAccessResolver.resolveRepositoryAccess(input);
    } catch (error) {
      throw new RepositoryAccessResolutionError(input.repositoryId, { cause: error });
    }
  }

  private async persistSnapshotFiles(
    scanId: string,
    access: Awaited<ReturnType<RepositoryAccessResolver["resolveRepositoryAccess"]>>,
    commitSha: string
  ): Promise<SnapshotPersistenceStats> {
    let batch: StoreScanFileInput[] = [];
    const stats: SnapshotPersistenceStats = {
      totalFiles: 0,
      totalSize: 0n
    };

    for await (const file of this.repositoryContentProvider.listSnapshotFiles(access, commitSha)) {
      batch.push(file);
      stats.totalFiles += 1;
      stats.totalSize += file.size;

      if (batch.length === ScanService.FILE_BATCH_SIZE) {
        await this.flushFileBatch(scanId, batch);
        batch = [];
      }
    }

    await this.flushFileBatch(scanId, batch);

    return stats;
  }

  private async flushFileBatch(
    scanId: string,
    batch: readonly StoreScanFileInput[]
  ): Promise<void> {
    if (batch.length === 0) {
      return;
    }

    await this.scanRepository.storeScanFiles(scanId, batch);
  }

  private completeScan(
    scan: ScanSnapshot,
    stats: SnapshotPersistenceStats,
    startedAtMs: number
  ): Promise<ScanSnapshot> {
    const completedAt = new Date();

    assertValidScanStatusTransition(scan.status, "COMPLETED");
    return this.scanRepository.updateScanStatus({
      scanId: scan.id,
      status: "COMPLETED",
      completedAt,
      durationMs: Math.max(0, completedAt.getTime() - startedAtMs),
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize
    });
  }

  private async failScan(scan: ScanSnapshot): Promise<void> {
    assertValidScanStatusTransition(scan.status, "FAILED");
    await this.scanRepository.updateScanStatus({
      scanId: scan.id,
      status: "FAILED"
    });
  }
}
