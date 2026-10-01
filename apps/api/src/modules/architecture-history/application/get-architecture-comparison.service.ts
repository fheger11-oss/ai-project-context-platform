import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ArchitectureComparisonResponse } from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  ARCHITECTURE_HISTORY_READER,
  type ArchitectureHistoryReader
} from "../domain/contracts/architecture-history-reader.contract.js";
import {
  adjacentComparisonStatus,
  buildArchitectureComparison
} from "./architecture-history-projection.js";

@Injectable()
export class GetArchitectureComparisonService {
  constructor(
    @Inject(ARCHITECTURE_HISTORY_READER) private readonly reader: ArchitectureHistoryReader,
    @Inject(RepositoriesService) private readonly repositories: RepositoriesService
  ) {}

  async get(input: {
    userId: string;
    repositoryId: string;
    historyId: string;
  }): Promise<ArchitectureComparisonResponse> {
    await this.repositories.getScanAccessMetadataForUser(input.userId, input.repositoryId);
    const sources = await this.reader.list(input.repositoryId);
    const targetIndex = sources.findIndex((source) => source.historyId === input.historyId);
    if (targetIndex < 0) throw new NotFoundException("Architecture history snapshot was not found");

    const baseline = targetIndex > 0 ? (sources[targetIndex - 1] ?? null) : null;
    return buildArchitectureComparison(
      baseline,
      sources[targetIndex]!,
      targetIndex > 1,
      baseline
        ? adjacentComparisonStatus(
            targetIndex > 1 ? (sources[targetIndex - 2] ?? null) : null,
            baseline
          )
        : "NO_BASELINE"
    );
  }
}
