import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureIntelligenceReadRepository,
  ArchitectureIntelligenceResultSource
} from "../domain/contracts/architecture-intelligence-read-repository.contract.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";

@Injectable()
export class PrismaArchitectureIntelligenceReadRepository implements ArchitectureIntelligenceReadRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findCurrent(repositoryId: string): Promise<ArchitectureIntelligenceResultSource | null> {
    const state = await this.prisma.repositoryState.findFirst({
      where: { repositoryId },
      select: {
        currentProjectContext: {
          select: {
            id: true,
            repositoryId: true,
            commitSha: true,
            contextVersion: true,
            analysis: { select: { analyzerVersion: true } },
            repositoryContextHistory: {
              where: { repositoryId },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 1,
              select: { id: true, createdAt: true }
            },
            architectureProcessingRequests: {
              where: { repositoryId },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 1
            }
          }
        }
      }
    });
    const context = state?.currentProjectContext;
    if (!context || context.repositoryId !== repositoryId) return null;
    const history = context.repositoryContextHistory[0];
    return {
      historyId: history?.id ?? null,
      promotedAt: history?.createdAt ?? null,
      projectContextId: context.id,
      commitSha: context.commitSha,
      contextVersion: context.contextVersion,
      analyzerVersion: context.analysis.analyzerVersion,
      request: context.architectureProcessingRequests[0]
        ? toRequest(context.architectureProcessingRequests[0])
        : null
    };
  }

  async listHistory(input: { repositoryId: string; skip: number; take: number }) {
    const [total, histories] = await Promise.all([
      this.prisma.repositoryContextHistory.count({ where: { repositoryId: input.repositoryId } }),
      this.prisma.repositoryContextHistory.findMany({
        where: { repositoryId: input.repositoryId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: input.skip,
        take: input.take,
        select: {
          id: true,
          createdAt: true,
          projectContext: {
            select: {
              id: true,
              commitSha: true,
              contextVersion: true,
              analysis: { select: { analyzerVersion: true } },
              architectureProcessingRequests: {
                where: { repositoryId: input.repositoryId },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 1
              }
            }
          }
        }
      })
    ]);
    return {
      total,
      items: histories.map((history) => ({
        historyId: history.id,
        promotedAt: history.createdAt,
        projectContextId: history.projectContext.id,
        commitSha: history.projectContext.commitSha,
        contextVersion: history.projectContext.contextVersion,
        analyzerVersion: history.projectContext.analysis.analyzerVersion,
        request: history.projectContext.architectureProcessingRequests[0]
          ? toRequest(history.projectContext.architectureProcessingRequests[0])
          : null
      }))
    };
  }
}

function toRequest(
  value: ArchitectureProcessingRequestRecord
): ArchitectureProcessingRequestRecord {
  return { ...value };
}
