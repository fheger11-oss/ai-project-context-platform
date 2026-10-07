import { Inject, Injectable } from "@nestjs/common";

import {
  compareDependencyHistory,
  dependencyHistoricalSnapshot,
  dependencyResultsAreCompatible,
  type DependencyHistoricalSnapshot,
  type DependencyHistoryComparison
} from "../domain/dependency-history-comparison.js";
import type { DependencySnapshot } from "../domain/dependency-snapshot.js";
import {
  DEPENDENCY_HISTORY_READER,
  type DependencyHistoryReader
} from "../domain/contracts/dependency-history-reader.contract.js";
import {
  DEPENDENCY_SNAPSHOT_READER,
  type DependencySnapshotReader
} from "../domain/contracts/dependency-snapshot-reader.contract.js";

export type CurrentDependencyIntelligence = {
  snapshot: DependencySnapshot;
  previousSnapshot: DependencySnapshot | null;
  comparison: DependencyHistoryComparison;
};

@Injectable()
export class GetDependencyHistoryComparisonService {
  constructor(
    @Inject(DEPENDENCY_SNAPSHOT_READER)
    private readonly snapshots: DependencySnapshotReader,
    @Inject(DEPENDENCY_HISTORY_READER)
    private readonly history: DependencyHistoryReader
  ) {}

  async execute(repositoryId: string): Promise<CurrentDependencyIntelligence | null> {
    const currentSnapshot = await this.snapshots.readCurrent(repositoryId);
    if (!currentSnapshot) return null;

    const sequence = await this.history.listThroughCurrent(
      repositoryId,
      currentSnapshot.projectContextId
    );
    const currentIndex = sequence.length - 1;
    if (sequence[currentIndex]?.projectContextId !== currentSnapshot.projectContextId) {
      throw new Error("Current promoted dependency snapshot is inconsistent with history.");
    }
    const current = dependencyHistoricalSnapshot(currentSnapshot);
    const previousReference = sequence[currentIndex - 1];
    if (!previousReference) {
      return {
        snapshot: currentSnapshot,
        previousSnapshot: null,
        comparison: compareDependencyHistory(current, null)
      };
    }

    const previous = dependencyHistoricalSnapshot(
      await this.snapshots.readPromoted(repositoryId, previousReference.projectContextId)
    );
    if (!dependencyResultsAreCompatible(current.compatibility, previous.compatibility)) {
      return {
        snapshot: currentSnapshot,
        previousSnapshot: previous.snapshot,
        comparison: compareDependencyHistory(current, previous)
      };
    }

    const earlier: DependencyHistoricalSnapshot[] = [];
    for (let index = currentIndex - 2; index >= 0; index -= 1) {
      const reference = sequence[index];
      if (!reference) break;
      const historical = dependencyHistoricalSnapshot(
        await this.snapshots.readPromoted(repositoryId, reference.projectContextId)
      );
      if (!dependencyResultsAreCompatible(current.compatibility, historical.compatibility)) break;
      earlier.push(historical);
    }
    return {
      snapshot: currentSnapshot,
      previousSnapshot: previous.snapshot,
      comparison: compareDependencyHistory(current, previous, earlier)
    };
  }
}
