import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  DependencyHistoryReader,
  DependencyPromotedContextReference
} from "../domain/contracts/dependency-history-reader.contract.js";
import { InvalidDependencySnapshotInputError } from "../domain/errors/invalid-dependency-snapshot-input.error.js";

@Injectable()
export class PrismaDependencyHistoryReader implements DependencyHistoryReader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listThroughCurrent(
    repositoryId: string,
    currentProjectContextId: string
  ): Promise<readonly DependencyPromotedContextReference[]> {
    const histories = await this.prisma.repositoryContextHistory.findMany({
      where: { repositoryId },
      select: { id: true, projectContextId: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }]
    });
    const currentIndex = histories.findIndex(
      (history) => history.projectContextId === currentProjectContextId
    );
    if (currentIndex < 0) {
      throw new InvalidDependencySnapshotInputError(
        `Current ProjectContext ${currentProjectContextId} is not promoted for repository ${repositoryId}.`
      );
    }
    return histories.slice(0, currentIndex + 1).map((history) => ({
      historyId: history.id,
      projectContextId: history.projectContextId,
      promotedAt: history.createdAt
    }));
  }
}
