import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../../generated/prisma/client.js";
import type { AnalysisModel } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Analysis as AnalysisEntity, type Analysis } from "../domain/analysis.js";
import type {
  AnalysisHistoryItem,
  AnalysisRepository
} from "../domain/contracts/analysis-repository.contract.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { AnalysisPersistenceError } from "../domain/errors/analysis-persistence.error.js";
import { InvalidPersistedAnalysisResultError } from "../domain/errors/invalid-persisted-analysis-result.error.js";

@Injectable()
export class PrismaAnalysisRepository implements AnalysisRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(analysis: Analysis): Promise<Analysis> {
    const snapshot = analysis.toSnapshot();
    const scan = await this.scanIdentity(snapshot.scanId);
    const stored = await this.prisma.analysis.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        scanId: snapshot.scanId,
        repositoryId: scan.repositoryId,
        commitSha: scan.commitSha,
        analyzerVersion: snapshot.analyzerVersion,
        status: snapshot.status,
        startedAt: snapshot.startedAt,
        completedAt: snapshot.completedAt,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt
      },
      update: {
        analyzerVersion: snapshot.analyzerVersion,
        status: snapshot.status,
        startedAt: snapshot.startedAt,
        completedAt: snapshot.completedAt
      }
    });

    return this.toAnalysis(stored);
  }

  async saveResult(result: AnalysisResult): Promise<AnalysisResult> {
    await this.assertScanMatchesResult(result);

    const stored = await this.prisma.analysis.upsert({
      where: { id: result.analysisId },
      create: {
        id: result.analysisId,
        scanId: result.scanId,
        repositoryId: result.repositoryId,
        commitSha: result.commitSha,
        analyzerVersion: result.analyzerVersion,
        status: "COMPLETED",
        generatedAt: result.generatedAt,
        completedAt: result.generatedAt,
        project: toJson(result.project),
        files: toJson(result.files),
        sourceStructures: toJson(result.sourceStructures),
        relationships: toJson(result.relationships),
        dependencies: toJson(result.dependencies),
        issues: toJson(result.issues)
      },
      update: {
        scanId: result.scanId,
        repositoryId: result.repositoryId,
        commitSha: result.commitSha,
        analyzerVersion: result.analyzerVersion,
        status: "COMPLETED",
        generatedAt: result.generatedAt,
        completedAt: result.generatedAt,
        project: toJson(result.project),
        files: toJson(result.files),
        sourceStructures: toJson(result.sourceStructures),
        relationships: toJson(result.relationships),
        dependencies: toJson(result.dependencies),
        issues: toJson(result.issues)
      }
    });

    return this.toAnalysisResult(stored);
  }

  async findById(analysisId: string): Promise<Analysis | null> {
    const stored = await this.prisma.analysis.findUnique({
      where: { id: analysisId }
    });

    return stored ? this.toAnalysis(stored) : null;
  }

  async findResultById(analysisId: string): Promise<AnalysisResult | null> {
    const stored = await this.prisma.analysis.findUnique({
      where: { id: analysisId }
    });

    return stored ? this.toAnalysisResult(stored) : null;
  }

  async findByScanId(scanId: string): Promise<Analysis | null> {
    const stored = await this.prisma.analysis.findFirst({
      where: { scanId },
      orderBy: { updatedAt: "desc" }
    });

    return stored ? this.toAnalysis(stored) : null;
  }

  async findHistoryByScanId(scanId: string): Promise<AnalysisHistoryItem[]> {
    const stored = await this.prisma.analysis.findMany({
      where: {
        scanId,
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

    return stored.map((item) => {
      if (!item.generatedAt) {
        throw new InvalidPersistedAnalysisResultError(item.id, "generatedAt is missing.");
      }

      return {
        analysisId: item.id,
        scanId: item.scanId,
        analyzerVersion: item.analyzerVersion,
        generatedAt: item.generatedAt,
        commitSha: item.commitSha
      };
    });
  }

  private async assertScanMatchesResult(result: AnalysisResult): Promise<void> {
    const scan = await this.scanIdentity(result.scanId);

    if (scan.repositoryId !== result.repositoryId || scan.commitSha !== result.commitSha) {
      throw new AnalysisPersistenceError(
        `AnalysisResult ${result.analysisId} does not match scan ${result.scanId}.`
      );
    }
  }

  private async scanIdentity(scanId: string): Promise<{ repositoryId: string; commitSha: string }> {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        repositoryId: true,
        commitSha: true
      }
    });

    if (!scan) {
      throw new AnalysisPersistenceError(`Scan ${scanId} does not exist.`);
    }

    return scan;
  }

  private toAnalysis(stored: AnalysisModel): Analysis {
    return AnalysisEntity.fromSnapshot({
      id: stored.id,
      scanId: stored.scanId,
      status: stored.status,
      analyzerVersion: stored.analyzerVersion,
      startedAt: stored.startedAt,
      completedAt: stored.completedAt,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt
    });
  }

  private toAnalysisResult(stored: AnalysisModel): AnalysisResult {
    if (!stored.generatedAt) {
      throw new InvalidPersistedAnalysisResultError(stored.id, "generatedAt is missing.");
    }

    return {
      analysisId: stored.id,
      scanId: stored.scanId,
      repositoryId: stored.repositoryId,
      commitSha: stored.commitSha,
      analyzerVersion: stored.analyzerVersion,
      generatedAt: stored.generatedAt,
      project: readObject(stored.id, "project", stored.project),
      files: readArray(stored.id, "files", stored.files),
      sourceStructures: readArray(stored.id, "sourceStructures", stored.sourceStructures),
      relationships: readArray(stored.id, "relationships", stored.relationships),
      dependencies: readArray(stored.id, "dependencies", stored.dependencies),
      issues: readArray(stored.id, "issues", stored.issues)
    };
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function readObject<T>(analysisId: string, field: string, value: unknown): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidPersistedAnalysisResultError(analysisId, `${field} must be an object.`);
  }

  return value as T;
}

function readArray<T>(analysisId: string, field: string, value: unknown): T[] {
  if (!Array.isArray(value)) {
    throw new InvalidPersistedAnalysisResultError(analysisId, `${field} must be an array.`);
  }

  return value as T[];
}
