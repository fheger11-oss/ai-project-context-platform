import { Inject, Injectable } from "@nestjs/common";

import type { ScanModel, ScanFileCreateManyInput } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreateScanInput,
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
        ...(input.totalSize !== undefined ? { totalSize: input.totalSize } : {})
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
        isBinary: file.isBinary,
        isHidden: file.isHidden
      }))
    });
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
      createdAt: scan.createdAt,
      updatedAt: scan.updatedAt
    };
  }
}
