import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type { ScanSnapshot } from "../domain/contracts/scan-repository.contract.js";

export type ScanLatestAnalysisSummary = {
  analysisId: string;
  scanId: string;
  analyzerVersion: string;
  generatedAt: string;
  commitSha: string;
};

@Injectable()
export class ScanHistoryAnalysisQueryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getLatestCompletedByScanId(
    scans: readonly ScanSnapshot[]
  ): Promise<Map<string, ScanLatestAnalysisSummary>> {
    const scanIds = scans.filter((scan) => scan.status === "COMPLETED").map((scan) => scan.id);

    if (scanIds.length === 0) {
      return new Map();
    }

    const analyses = await this.prisma.analysis.findMany({
      where: {
        scanId: { in: scanIds },
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
    const latestByScanId = new Map<string, ScanLatestAnalysisSummary>();

    for (const analysis of analyses) {
      if (!analysis.generatedAt || latestByScanId.has(analysis.scanId)) {
        continue;
      }

      latestByScanId.set(analysis.scanId, {
        analysisId: analysis.id,
        scanId: analysis.scanId,
        analyzerVersion: analysis.analyzerVersion,
        generatedAt: analysis.generatedAt.toISOString(),
        commitSha: analysis.commitSha
      });
    }

    return latestByScanId;
  }
}
