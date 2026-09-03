import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  REPOSITORY_ACCESS_RESOLVER,
  type RepositoryAccessResolver
} from "../domain/contracts/repository-access-resolver.contract.js";
import {
  REPOSITORY_OWNERSHIP_VERIFIER,
  type RepositoryOwnershipVerifier
} from "../domain/contracts/repository-ownership-verifier.contract.js";
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
import { ScanLimitExceededError } from "../domain/errors/scan-limit-exceeded.error.js";
import { assertValidScanStatusTransition } from "../domain/scan-state-machine.js";

export type StartScanInput = {
  repositoryId: string;
  reference?: string;
  userId: string;
};

export type GetScanHistoryInput = {
  repositoryId: string;
  userId: string;
  page: number;
  pageSize: number;
};

export type ScanHistoryResult = {
  items: ScanSnapshot[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type SnapshotPersistenceStats = {
  filesProcessed: number;
  totalBytesConsidered: bigint;
};

type ScanFailureStage = "FILE_STREAM" | "BATCH_PERSISTENCE" | "COMPLETION_PERSISTENCE";

@Injectable()
export class ScanService {
  private static readonly FILE_BATCH_SIZE = 250;
  private readonly logger = new Logger(ScanService.name);

  constructor(
    @Inject(SCAN_REPOSITORY)
    private readonly scanRepository: ScanRepository,
    @Inject(REPOSITORY_CONTENT_PROVIDER)
    private readonly repositoryContentProvider: RepositoryContentProvider,
    @Inject(REPOSITORY_ACCESS_RESOLVER)
    private readonly repositoryAccessResolver: RepositoryAccessResolver,
    @Inject(REPOSITORY_OWNERSHIP_VERIFIER)
    private readonly repositoryOwnershipVerifier: RepositoryOwnershipVerifier
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

    let failureStage: ScanFailureStage = "FILE_STREAM";
    let stats: SnapshotPersistenceStats;

    try {
      stats = await this.persistSnapshotFiles(scan.id, access, commit.commitSha, (stage) => {
        failureStage = stage;
      });
    } catch (error) {
      await this.handleRunningScanFailure(runningScan, failureStage, error);
      throw error;
    }

    try {
      return await this.completeScan(runningScan, stats, startedAtMs);
    } catch (error) {
      if (!(error instanceof InvalidScanStateTransitionError)) {
        await this.handleRunningScanFailure(runningScan, "COMPLETION_PERSISTENCE", error);
      }
      throw error;
    }
  }

  async getScanHistory(input: GetScanHistoryInput): Promise<ScanHistoryResult> {
    await this.repositoryOwnershipVerifier.verifyRepositoryOwnership({
      userId: input.userId,
      repositoryId: input.repositoryId
    });

    const history = await this.scanRepository.listScanHistory({
      repositoryId: input.repositoryId,
      page: input.page,
      pageSize: input.pageSize
    });

    return {
      items: history.items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalItems: history.totalItems,
        totalPages: Math.ceil(history.totalItems / input.pageSize)
      }
    };
  }

  private async resolveRepositoryAccess(input: StartScanInput) {
    return this.repositoryAccessResolver.resolveRepositoryAccess(input);
  }

  private async persistSnapshotFiles(
    scanId: string,
    access: Awaited<ReturnType<RepositoryAccessResolver["resolveRepositoryAccess"]>>,
    commitSha: string,
    setFailureStage: (stage: ScanFailureStage) => void
  ): Promise<SnapshotPersistenceStats> {
    let batch: StoreScanFileInput[] = [];
    const stats: SnapshotPersistenceStats = {
      filesProcessed: 0,
      totalBytesConsidered: 0n
    };

    try {
      for await (const file of this.repositoryContentProvider.listSnapshotFiles(
        access,
        commitSha
      )) {
        setFailureStage("FILE_STREAM");
        batch.push(file);
        stats.filesProcessed += 1;
        stats.totalBytesConsidered += file.size;

        if (batch.length === ScanService.FILE_BATCH_SIZE) {
          setFailureStage("BATCH_PERSISTENCE");
          await this.flushFileBatch(scanId, batch);
          batch = [];
          setFailureStage("FILE_STREAM");
        }
      }
    } catch (error) {
      if (error instanceof ScanLimitExceededError) {
        setFailureStage("BATCH_PERSISTENCE");
        await this.flushFileBatch(scanId, batch);
      }

      throw error;
    }

    setFailureStage("BATCH_PERSISTENCE");
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
      totalFiles: stats.filesProcessed,
      totalSize: stats.totalBytesConsidered,
      filesProcessed: stats.filesProcessed,
      totalBytesConsidered: stats.totalBytesConsidered,
      scanLimitReason: null
    });
  }

  private async failScan(scan: ScanSnapshot, error?: unknown): Promise<void> {
    assertValidScanStatusTransition(scan.status, "FAILED");
    const limitFailure = error instanceof ScanLimitExceededError ? error : null;
    await this.scanRepository.updateScanStatus({
      scanId: scan.id,
      status: "FAILED",
      ...(limitFailure
        ? {
            totalFiles: limitFailure.usage.filesProcessed,
            totalSize: limitFailure.usage.totalBytesConsidered,
            filesProcessed: limitFailure.usage.filesProcessed,
            totalBytesConsidered: limitFailure.usage.totalBytesConsidered,
            scanLimitReason: limitFailure.reason
          }
        : {})
    });
  }

  private async handleRunningScanFailure(
    scan: ScanSnapshot,
    stage: ScanFailureStage,
    error: unknown
  ): Promise<void> {
    this.logScanFailure(scan, stage, error);

    try {
      await this.failScan(scan, error);
    } catch (failurePersistenceError) {
      this.logFailedTransitionPersistence(scan, failurePersistenceError);
    }
  }

  private logScanFailure(scan: ScanSnapshot, stage: ScanFailureStage, error: unknown): void {
    this.logger.error(
      `Scan failed scanId=${scan.id} repositoryId=${scan.repositoryId} stage=${stage} errorName=${this.errorName(error)}`
    );
  }

  private logFailedTransitionPersistence(scan: ScanSnapshot, error: unknown): void {
    this.logger.error(
      `Scan failure status persistence failed scanId=${scan.id} repositoryId=${scan.repositoryId} errorName=${this.errorName(error)}`
    );
  }

  private errorName(error: unknown): string {
    return error instanceof Error ? error.name : typeof error;
  }
}
