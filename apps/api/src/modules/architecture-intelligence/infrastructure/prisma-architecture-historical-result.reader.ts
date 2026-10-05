import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  ArchitectureHistoricalResultReader,
  ArchitectureHistoricalResultSequence,
  ArchitecturePromotedResultSource
} from "../domain/contracts/architecture-historical-result-reader.contract.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";

@Injectable()
export class PrismaArchitectureHistoricalResultReader implements ArchitectureHistoricalResultReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async readThroughCurrent(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureHistoricalResultSequence> {
    const current = await this.prisma.architectureProcessingRequest.findFirst({
      where: { id: processingRequestId, repositoryId, status: "COMPLETED" },
      include: {
        findingOccurrences: {
          select: { id: true, fingerprint: true, ruleId: true, ruleVersion: true },
          orderBy: [{ fingerprint: "asc" }, { id: "asc" }]
        }
      }
    });
    if (!current) {
      throw new Error(
        `Completed architecture processing request ${processingRequestId} was not found for repository ${repositoryId}.`
      );
    }

    const histories = await this.prisma.repositoryContextHistory.findMany({
      where: { repositoryId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        createdAt: true,
        projectContextId: true,
        projectContext: {
          select: {
            architectureProcessingRequests: {
              where: { status: "COMPLETED" },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 1,
              include: {
                findingOccurrences: {
                  select: { id: true, fingerprint: true, ruleId: true, ruleVersion: true },
                  orderBy: [{ fingerprint: "asc" }, { id: "asc" }]
                }
              }
            }
          }
        }
      }
    });
    const currentIndex = histories.findIndex(
      (history) => history.projectContextId === current.projectContextId
    );
    if (currentIndex < 0) {
      throw new Error(
        `Architecture processing request ${processingRequestId} does not belong to a promoted context.`
      );
    }

    const results = histories
      .slice(0, currentIndex + 1)
      .map((history): ArchitecturePromotedResultSource => {
        const stored =
          history.projectContextId === current.projectContextId
            ? current
            : history.projectContext.architectureProcessingRequests[0];
        return {
          historyId: history.id,
          promotedAt: history.createdAt,
          projectContextId: history.projectContextId,
          request: stored ? toRequest(stored) : null,
          occurrences: stored ? stored.findingOccurrences : []
        };
      });
    return { currentRequest: toRequest(current), results };
  }
}

function toRequest(
  stored: ArchitectureProcessingRequestRecord
): ArchitectureProcessingRequestRecord {
  return {
    id: stored.id,
    repositoryId: stored.repositoryId,
    projectContextId: stored.projectContextId,
    processorVersion: stored.processorVersion,
    status: stored.status,
    attemptCount: stored.attemptCount,
    nextAttemptAt: stored.nextAttemptAt,
    claimedBy: stored.claimedBy,
    leaseUntil: stored.leaseUntil,
    startedAt: stored.startedAt,
    completedAt: stored.completedAt,
    lastFailureCategory: stored.lastFailureCategory,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt
  };
}
