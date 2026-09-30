import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ContextPromotedTimelineItem,
  DecisionEffectiveTimelineItem,
  ProjectTimelineItem,
  ProjectTimelineResponse,
  RepositoryConnectedTimelineItem,
  RepositoryUpdateTimelineItem
} from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  PROJECT_TIMELINE_READER,
  type ProjectTimelineReader,
  type TimelineContextPromotionSource,
  type TimelineDecisionSource,
  type TimelineRepositorySource,
  type TimelineRepositoryUpdateSource
} from "../domain/contracts/project-timeline-reader.contract.js";

@Injectable()
export class GetProjectTimelineService {
  constructor(
    @Inject(PROJECT_TIMELINE_READER)
    private readonly timelineReader: ProjectTimelineReader,
    @Inject(RepositoriesService)
    private readonly repositories: RepositoriesService
  ) {}

  async get(input: {
    userId: string;
    repositoryId: string;
    page: number;
    pageSize: number;
  }): Promise<ProjectTimelineResponse> {
    await this.repositories.getScanAccessMetadataForUser(input.userId, input.repositoryId);

    const candidateLimit = input.page * input.pageSize;
    const sources = await this.timelineReader.readCandidates({
      repositoryId: input.repositoryId,
      take: candidateLimit
    });

    if (!sources.repository) {
      throw new NotFoundException("Repository was not found");
    }

    // The reader's repository-scoped relational predicate is authoritative for
    // pagination totals. This guard also prevents a duplicate if an adapter ever
    // returns a promotion for a ProjectContext represented by a candidate update.
    const representedProjectContextIds = new Set(
      sources.updates
        .map((update) => update.projectContextId)
        .filter((id): id is string => id !== null)
    );
    const standaloneContextPromotions = sources.contextPromotions.filter(
      (promotion) => !representedProjectContextIds.has(promotion.projectContext.id)
    );
    const items = [
      toRepositoryConnectedItem(sources.repository),
      ...sources.updates.map(toRepositoryUpdateItem),
      ...standaloneContextPromotions.map(toContextPromotedItem),
      ...sources.decisions.map(toDecisionEffectiveItem)
    ].sort(compareTimelineItems);
    const total =
      1 + sources.totals.updates + sources.totals.contextPromotions + sources.totals.decisions;
    const totalPages = Math.ceil(total / input.pageSize);
    const offset = (input.page - 1) * input.pageSize;

    return {
      items: items.slice(offset, offset + input.pageSize),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages,
        hasNextPage: input.page < totalPages,
        hasPreviousPage: input.page > 1
      }
    };
  }
}

function toRepositoryConnectedItem(
  source: TimelineRepositorySource
): RepositoryConnectedTimelineItem {
  return {
    type: "REPOSITORY_CONNECTED",
    sourceId: source.id,
    repositoryId: source.id,
    occurredAt: source.createdAt.toISOString(),
    repositoryName: source.name,
    repositoryFullName: source.fullName
  };
}

function toRepositoryUpdateItem(
  source: TimelineRepositoryUpdateSource
): RepositoryUpdateTimelineItem {
  return {
    type: "REPOSITORY_UPDATE",
    sourceId: source.id,
    repositoryId: source.repositoryId,
    occurredAt: source.createdAt.toISOString(),
    triggerType: source.triggerType,
    status: source.status,
    baseCommitSha: source.baseCommitSha,
    targetCommitSha: source.targetCommitSha,
    startedAt: source.startedAt?.toISOString() ?? null,
    completedAt: source.completedAt?.toISOString() ?? null,
    failedAt: source.failedAt?.toISOString() ?? null,
    scanId: source.scanId,
    analysisId: source.analysisId,
    projectContextId: source.projectContextId
  };
}

function toContextPromotedItem(
  source: TimelineContextPromotionSource
): ContextPromotedTimelineItem {
  return {
    type: "CONTEXT_PROMOTED",
    sourceId: source.id,
    repositoryId: source.repositoryId,
    occurredAt: source.createdAt.toISOString(),
    projectContextId: source.projectContext.id,
    contextId: source.projectContext.contextId,
    contextVersion: source.projectContext.contextVersion,
    generatedAt: source.projectContext.generatedAt.toISOString(),
    commitSha: source.projectContext.commitSha,
    scanId: source.projectContext.scanId,
    analysisId: source.projectContext.analysisId
  };
}

function toDecisionEffectiveItem(source: TimelineDecisionSource): DecisionEffectiveTimelineItem {
  const decidedAt = source.decidedAt.toISOString();
  return {
    type: "DECISION_EFFECTIVE",
    sourceId: source.id,
    repositoryId: source.repositoryId,
    occurredAt: decidedAt,
    decisionId: source.id,
    title: source.title,
    affectedArea: source.affectedArea,
    status: source.status,
    decidedAt,
    sourceProjectContextId: source.sourceProjectContextId,
    sourceRepositoryUpdateId: source.sourceRepositoryUpdateId,
    sourceCommitSha: source.sourceCommitSha
  };
}

function compareTimelineItems(left: ProjectTimelineItem, right: ProjectTimelineItem): number {
  if (left.occurredAt !== right.occurredAt) {
    return left.occurredAt > right.occurredAt ? -1 : 1;
  }
  if (left.type !== right.type) {
    return left.type < right.type ? -1 : 1;
  }
  if (left.sourceId === right.sourceId) return 0;
  return left.sourceId > right.sourceId ? -1 : 1;
}
