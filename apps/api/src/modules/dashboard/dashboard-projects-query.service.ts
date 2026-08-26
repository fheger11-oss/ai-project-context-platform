import { Inject, Injectable } from "@nestjs/common";
import type { DashboardProjectSummary, DashboardProjectsResponse } from "@ai-context/contracts";

import { PrismaService } from "../prisma/prisma.service.js";

type DashboardRepositoryRecord = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  visibility: DashboardProjectSummary["repository"]["visibility"];
  language: string | null;
  isArchived: boolean;
  lastSyncedAt: Date;
  scans: {
    id: string;
    status: DashboardProjectSummary["latestScan"] extends infer T
      ? T extends { status: infer S }
        ? S
        : never
      : never;
    commitSha: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    totalFiles: number;
    totalSize: bigint;
  }[];
  analyses: {
    id: string;
    scanId: string;
    analyzerVersion: string;
    commitSha: string;
    generatedAt: Date | null;
    projectContexts: {
      id: string;
      contextId: string;
      contextVersion: string;
      generatedAt: Date;
      createdAt: Date;
      _count: {
        documents: number;
      };
    }[];
  }[];
};

@Injectable()
export class DashboardProjectsQueryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listProjects(userId: string): Promise<DashboardProjectsResponse> {
    const repositories = (await this.prisma.repository.findMany({
      where: { userId },
      orderBy: [{ lastSyncedAt: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        name: true,
        fullName: true,
        owner: true,
        description: true,
        defaultBranch: true,
        visibility: true,
        language: true,
        isArchived: true,
        lastSyncedAt: true,
        scans: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            status: true,
            commitSha: true,
            createdAt: true,
            updatedAt: true,
            completedAt: true,
            totalFiles: true,
            totalSize: true
          }
        },
        analyses: {
          where: {
            status: "COMPLETED",
            generatedAt: { not: null }
          },
          orderBy: [{ generatedAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            scanId: true,
            analyzerVersion: true,
            commitSha: true,
            generatedAt: true,
            projectContexts: {
              orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
              take: 1,
              select: {
                id: true,
                contextId: true,
                contextVersion: true,
                generatedAt: true,
                createdAt: true,
                _count: {
                  select: {
                    documents: true
                  }
                }
              }
            }
          }
        }
      }
    })) as DashboardRepositoryRecord[];

    return {
      projects: repositories.map((repository) => toProjectSummary(repository))
    };
  }
}

function toProjectSummary(repository: DashboardRepositoryRecord): DashboardProjectSummary {
  const latestScan = repository.scans[0] ?? null;
  const latestAnalysis = repository.analyses[0] ?? null;
  const latestContext = latestAnalysis?.projectContexts[0] ?? null;
  const documentCount = latestContext?._count.documents ?? 0;

  return {
    repository: {
      id: repository.id,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      description: repository.description,
      defaultBranch: repository.defaultBranch,
      visibility: repository.visibility,
      language: repository.language,
      isArchived: repository.isArchived,
      lastSyncedAt: repository.lastSyncedAt.toISOString()
    },
    latestScan: latestScan
      ? {
          id: latestScan.id,
          status: latestScan.status,
          commitSha: latestScan.commitSha,
          createdAt: latestScan.createdAt.toISOString(),
          updatedAt: latestScan.updatedAt.toISOString(),
          completedAt: latestScan.completedAt?.toISOString() ?? null,
          totalFiles: latestScan.totalFiles,
          totalSize: latestScan.totalSize.toString()
        }
      : null,
    latestAnalysis:
      latestAnalysis && latestAnalysis.generatedAt
        ? {
            analysisId: latestAnalysis.id,
            scanId: latestAnalysis.scanId,
            analyzerVersion: latestAnalysis.analyzerVersion,
            commitSha: latestAnalysis.commitSha,
            generatedAt: latestAnalysis.generatedAt.toISOString()
          }
        : null,
    latestContext: latestContext
      ? {
          id: latestContext.id,
          contextId: latestContext.contextId,
          contextVersion: latestContext.contextVersion,
          generatedAt: latestContext.generatedAt.toISOString(),
          createdAt: latestContext.createdAt.toISOString()
        }
      : null,
    documents: {
      available: documentCount > 0,
      count: documentCount
    },
    aiExport: {
      available: Boolean(latestContext)
    }
  };
}
