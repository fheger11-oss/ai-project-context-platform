import { Inject, Injectable } from "@nestjs/common";
import type {
  ArchitectureIntelligenceCompatibility,
  ArchitectureIntelligenceHistoryResponse
} from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY,
  type ArchitectureIntelligenceReadRepository
} from "../domain/contracts/architecture-intelligence-read-repository.contract.js";
import { ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION } from "../domain/architecture-rule-version.js";
import { GetArchitectureHistoryComparisonService } from "./get-architecture-history-comparison.service.js";
import { processingSummary } from "./get-current-architecture-intelligence.service.js";

@Injectable()
export class ListArchitectureIntelligenceHistoryService {
  constructor(
    @Inject(ARCHITECTURE_INTELLIGENCE_READ_REPOSITORY)
    private readonly reader: ArchitectureIntelligenceReadRepository,
    @Inject(GetArchitectureHistoryComparisonService)
    private readonly history: GetArchitectureHistoryComparisonService,
    @Inject(RepositoriesService) private readonly repositories: RepositoriesService
  ) {}

  async execute(input: {
    userId: string;
    repositoryId: string;
    page: number;
    pageSize: number;
  }): Promise<ArchitectureIntelligenceHistoryResponse> {
    await this.repositories.getScanAccessMetadataForUser(input.userId, input.repositoryId);
    const result = await this.reader.listHistory({
      repositoryId: input.repositoryId,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize
    });
    const items = await Promise.all(
      result.items.map(async (source) => {
        const comparison =
          source.request?.status === "COMPLETED"
            ? await this.history.execute(input.repositoryId, source.request.id)
            : null;
        const compatibility: ArchitectureIntelligenceCompatibility | null = comparison
          ? comparison.status
          : source.request?.status === "INCOMPATIBLE"
            ? "INCOMPATIBLE"
            : null;
        const lifecycle = comparison?.status === "COMPARABLE" ? comparison.lifecycle : [];
        const changes =
          comparison?.status === "COMPARABLE"
            ? comparison
            : {
                addedModules: [],
                removedModules: [],
                addedRelationships: [],
                removedRelationships: []
              };
        return {
          historyId: source.historyId!,
          promotedAt: source.promotedAt!.toISOString(),
          projectContextId: source.projectContextId,
          commitSha: source.commitSha,
          processing: source.request ? processingSummary(source) : null,
          ruleVersion: source.request ? ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION : null,
          compatibility,
          transitions: {
            new: lifecycle.filter((item) => item.lifecycle === "NEW").length,
            persisting: lifecycle.filter((item) => item.lifecycle === "PERSISTING").length,
            resolved: lifecycle.filter((item) => item.lifecycle === "RESOLVED").length,
            recurring: lifecycle.filter((item) => item.lifecycle === "RECURRING").length
          },
          changes: {
            addedModules: changes.addedModules.length,
            removedModules: changes.removedModules.length,
            addedRelationships: changes.addedRelationships.length,
            removedRelationships: changes.removedRelationships.length
          }
        };
      })
    );
    return {
      items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        hasNextPage: input.page * input.pageSize < result.total
      }
    };
  }
}
