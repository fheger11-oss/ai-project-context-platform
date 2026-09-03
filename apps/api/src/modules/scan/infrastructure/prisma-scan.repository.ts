import { Inject, Injectable } from "@nestjs/common";

import type { ScanModel, ScanFileCreateManyInput } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreateScanInput,
  ScanHistoryQuery,
  ScanHistoryQueryResult,
  ScanRepository,
  ScanSnapshot,
  StoreScanFileInput,
  UpdateScanStatusInput
} from "../domain/contracts/scan-repository.contract.js";

@Injectable()
export class PrismaScanRepository implements ScanRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createScan(input: CreateScanInput): Promise<ScanSnapshot> {
    const scan = await this.prisma.scan.create({
      data: {
        repositoryId: input.repositoryId,
        commitSha: input.commitSha,
        ...(input.status ? { status: input.status } : {}),
        ...(input.startedAt ? { startedAt: input.startedAt } : {})
      }
    });

    return this.toDomainScan(scan);
  }

  async updateScanStatus(input: UpdateScanStatusInput): Promise<ScanSnapshot> {
    const scan = await this.prisma.scan.update({
      where: { id: input.scanId },
      data: {
        status: input.status,
        ...(input.completedAt ? { completedAt: input.completedAt } : {}),
        ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
        ...(input.totalFiles !== undefined ? { totalFiles: input.totalFiles } : {}),
        ...(input.totalSize !== undefined ? { totalSize: input.totalSize } : {}),
        ...(input.filesProcessed !== undefined ? { filesProcessed: input.filesProcessed } : {}),
        ...(input.totalBytesConsidered !== undefined
          ? { totalBytesConsidered: input.totalBytesConsidered }
          : {}),
        ...(input.scanLimitReason !== undefined ? { scanLimitReason: input.scanLimitReason } : {})
      }
    });

    return this.toDomainScan(scan);
  }

  async storeScanFiles(scanId: string, files: readonly StoreScanFileInput[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    await this.prisma.scanFile.createMany({
      data: files.map((file): ScanFileCreateManyInput => ({
        scanId,
        path: file.path,
        extension: file.extension,
        size: file.size,
        sha: file.sha,
        content: file.content,
        isBinary: file.isBinary,
        isHidden: file.isHidden
      }))
    });
  }

  async findCompletedScanByRepositoryAndCommit(
    repositoryId: string,
    commitSha: string
  ): Promise<ScanSnapshot | null> {
    const scan = await this.prisma.scan.findFirst({
      where: {
        repositoryId,
        commitSha,
        status: "COMPLETED"
      },
      orderBy: { createdAt: "desc" }
    });

    return scan ? this.toDomainScan(scan) : null;
  }

  async getScan(scanId: string): Promise<ScanSnapshot | null> {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId }
    });

    return scan ? this.toDomainScan(scan) : null;
  }

  async getLatestScan(repositoryId: string): Promise<ScanSnapshot | null> {
    const scan = await this.prisma.scan.findFirst({
      where: { repositoryId },
      orderBy: { createdAt: "desc" }
    });

    return scan ? this.toDomainScan(scan) : null;
  }

  async listScanHistory(input: ScanHistoryQuery): Promise<ScanHistoryQueryResult> {
    const skip = (input.page - 1) * input.pageSize;
    const [scans, totalItems] = await this.prisma.$transaction([
      this.prisma.scan.findMany({
        where: { repositoryId: input.repositoryId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: input.pageSize
      }),
      this.prisma.scan.count({
        where: { repositoryId: input.repositoryId }
      })
    ]);

    return {
      items: scans.map((scan) => this.toDomainScan(scan)),
      totalItems
    };
  }

  private toDomainScan(scan: ScanModel): ScanSnapshot {
    return {
      id: scan.id,
      repositoryId: scan.repositoryId,
      status: scan.status,
      commitSha: scan.commitSha,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
      durationMs: scan.durationMs,
      totalFiles: scan.totalFiles,
      totalSize: scan.totalSize,
      filesProcessed: scan.filesProcessed,
      totalBytesConsidered: scan.totalBytesConsidered,
      scanLimitReason: scan.scanLimitReason,
      createdAt: scan.createdAt,
      updatedAt: scan.updatedAt
    };
  }
}
