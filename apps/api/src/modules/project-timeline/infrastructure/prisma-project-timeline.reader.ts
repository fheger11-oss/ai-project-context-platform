import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client.js";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ProjectTimelineReader,
  ProjectTimelineSources
} from "../domain/contracts/project-timeline-reader.contract.js";

@Injectable()
export class PrismaProjectTimelineReader implements ProjectTimelineReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async readCandidates(input: {
    repositoryId: string;
    take: number;
  }): Promise<ProjectTimelineSources> {
    // A promoted context is represented by its RepositoryUpdate when that exact
    // ProjectContext ID is referenced by a same-repository update. Commit or time
    // equality is deliberately insufficient for this deduplication rule.
    const standaloneContextWhere: Prisma.RepositoryContextHistoryWhereInput = {
      repositoryId: input.repositoryId,
      projectContext: {
        repositoryUpdates: {
          none: { repositoryId: input.repositoryId }
        }
      }
    };

    const [
      repository,
      updates,
      contextPromotions,
      decisions,
      updateTotal,
      contextPromotionTotal,
      decisionTotal
    ] = await this.prisma.$transaction([
      this.prisma.repository.findFirst({
        where: { id: input.repositoryId },
        select: { id: true, name: true, fullName: true, createdAt: true }
      }),
      this.prisma.repositoryUpdate.findMany({
        where: { repositoryId: input.repositoryId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.take,
        select: {
          id: true,
          repositoryId: true,
          triggerType: true,
          status: true,
          baseCommitSha: true,
          targetCommitSha: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          scanId: true,
          analysisId: true,
          projectContextId: true,
          createdAt: true
        }
      }),
      this.prisma.repositoryContextHistory.findMany({
        where: standaloneContextWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.take,
        select: {
          id: true,
          repositoryId: true,
          createdAt: true,
          projectContext: {
            select: {
              id: true,
              contextId: true,
              contextVersion: true,
              generatedAt: true,
              commitSha: true,
              scanId: true,
              analysisId: true
            }
          }
        }
      }),
      this.prisma.projectDecision.findMany({
        where: { repositoryId: input.repositoryId },
        orderBy: [{ decidedAt: "desc" }, { id: "desc" }],
        take: input.take,
        select: {
          id: true,
          repositoryId: true,
          title: true,
          affectedArea: true,
          status: true,
          decidedAt: true,
          sourceProjectContextId: true,
          sourceRepositoryUpdateId: true,
          sourceCommitSha: true
        }
      }),
      this.prisma.repositoryUpdate.count({ where: { repositoryId: input.repositoryId } }),
      this.prisma.repositoryContextHistory.count({ where: standaloneContextWhere }),
      this.prisma.projectDecision.count({ where: { repositoryId: input.repositoryId } })
    ]);

    return {
      repository,
      updates,
      contextPromotions,
      decisions,
      totals: {
        updates: updateTotal,
        contextPromotions: contextPromotionTotal,
        decisions: decisionTotal
      }
    };
  }
}
