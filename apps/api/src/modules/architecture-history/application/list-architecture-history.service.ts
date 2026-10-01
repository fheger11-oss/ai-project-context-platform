import { Inject, Injectable } from "@nestjs/common";
import type { ArchitectureHistoryResponse } from "@ai-context/contracts";

import { RepositoriesService } from "../../repositories/repositories.service.js";
import {
  ARCHITECTURE_HISTORY_READER,
  type ArchitectureHistoryReader
} from "../domain/contracts/architecture-history-reader.contract.js";
import {
  adjacentComparisonStatus,
  toArchitectureSnapshotSummary
} from "./architecture-history-projection.js";

@Injectable()
export class ListArchitectureHistoryService {
  constructor(
    @Inject(ARCHITECTURE_HISTORY_READER) private readonly reader: ArchitectureHistoryReader,
    @Inject(RepositoriesService) private readonly repositories: RepositoriesService
  ) {}

  async list(input: {
    userId: string;
    repositoryId: string;
  }): Promise<ArchitectureHistoryResponse> {
    await this.repositories.getScanAccessMetadataForUser(input.userId, input.repositoryId);
    const sources = await this.reader.list(input.repositoryId);
    const summaries = sources.map((target, index) => {
      const baseline = index > 0 ? (sources[index - 1] ?? null) : null;
      return toArchitectureSnapshotSummary(
        target,
        baseline !== null,
        adjacentComparisonStatus(baseline, target)
      );
    });

    return { items: summaries.reverse() };
  }
}
