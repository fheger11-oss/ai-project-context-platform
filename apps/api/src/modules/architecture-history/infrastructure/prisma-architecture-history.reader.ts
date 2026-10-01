import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureHistoryReader,
  ArchitectureHistorySnapshotSource
} from "../domain/contracts/architecture-history-reader.contract.js";

@Injectable()
export class PrismaArchitectureHistoryReader implements ArchitectureHistoryReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(repositoryId: string): Promise<ArchitectureHistorySnapshotSource[]> {
    const records = await this.prisma.repositoryContextHistory.findMany({
      where: { repositoryId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        repositoryId: true,
        createdAt: true,
        projectContext: {
          select: {
            id: true,
            analysisId: true,
            scanId: true,
            commitSha: true,
            generatedAt: true,
            contextVersion: true,
            snapshot: true,
            analysis: { select: { analyzerVersion: true } }
          }
        }
      }
    });

    return records.map((record) => ({
      historyId: record.id,
      repositoryId: record.repositoryId,
      promotedAt: record.createdAt,
      projectContextId: record.projectContext.id,
      analysisId: record.projectContext.analysisId,
      scanId: record.projectContext.scanId,
      commitSha: record.projectContext.commitSha,
      generatedAt: record.projectContext.generatedAt,
      contextVersion: record.projectContext.contextVersion,
      analyzerVersion: record.projectContext.analysis.analyzerVersion,
      snapshot: record.projectContext.snapshot
    }));
  }
}
