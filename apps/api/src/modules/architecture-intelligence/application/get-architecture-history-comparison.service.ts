import { Inject, Injectable } from "@nestjs/common";

import {
  architectureResultsAreCompatible,
  compareArchitectureHistory,
  type ArchitectureHistoricalSnapshot,
  type ArchitectureHistoryComparison
} from "../domain/architecture-history-comparison.js";
import {
  ARCHITECTURE_HISTORICAL_RESULT_READER,
  type ArchitectureHistoricalResultReader,
  type ArchitecturePromotedResultSource
} from "../domain/contracts/architecture-historical-result-reader.contract.js";
import {
  ARCHITECTURE_PROCESSING_INPUT_READER,
  type ArchitectureProcessingInputReader
} from "../domain/contracts/architecture-processing-input-reader.contract.js";
import { projectArchitectureGraph } from "../domain/project-architecture-graph.js";
import {
  ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID,
  circularDependencyRuleVersionForProcessor
} from "../domain/architecture-rule-version.js";

@Injectable()
export class GetArchitectureHistoryComparisonService {
  constructor(
    @Inject(ARCHITECTURE_HISTORICAL_RESULT_READER)
    private readonly historyReader: ArchitectureHistoricalResultReader,
    @Inject(ARCHITECTURE_PROCESSING_INPUT_READER)
    private readonly inputReader: ArchitectureProcessingInputReader
  ) {}

  async execute(
    repositoryId: string,
    processingRequestId: string
  ): Promise<ArchitectureHistoryComparison> {
    const sequence = await this.historyReader.readThroughCurrent(repositoryId, processingRequestId);
    const currentIndex = sequence.results.length - 1;
    const currentSource = sequence.results[currentIndex];
    if (!currentSource?.request || currentSource.request.id !== sequence.currentRequest.id) {
      throw new Error("Current promoted architecture processing result is inconsistent.");
    }
    const current = await this.snapshot(currentSource);
    const previousSource = sequence.results[currentIndex - 1];
    if (!previousSource?.request) return { status: "NO_BASELINE" };
    const previous = await this.snapshot(previousSource);
    if (!architectureResultsAreCompatible(current.compatibility, previous.compatibility)) {
      return { status: "INCOMPATIBLE" };
    }

    const earlier: ArchitectureHistoricalSnapshot[] = [];
    for (let index = currentIndex - 2; index >= 0; index -= 1) {
      const source = sequence.results[index];
      if (!source?.request) break;
      const snapshot = await this.snapshot(source);
      if (!architectureResultsAreCompatible(current.compatibility, snapshot.compatibility)) break;
      earlier.push(snapshot);
    }
    return compareArchitectureHistory(current, previous, earlier);
  }

  private async snapshot(
    source: ArchitecturePromotedResultSource
  ): Promise<ArchitectureHistoricalSnapshot> {
    if (!source.request) throw new Error("Architecture processing result is missing.");
    const input = await this.inputReader.read(source.request);
    return {
      processingRequestId: source.request.id,
      projectContextId: source.projectContextId,
      compatibility: {
        analyzerVersion: input.analyzerVersion,
        contextVersion: input.contextVersion,
        processorVersion: source.request.processorVersion,
        ruleId: ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID,
        ruleVersion: ruleVersion(source)
      },
      graph: projectArchitectureGraph(input),
      occurrences: source.occurrences.filter(
        (occurrence) => occurrence.ruleId === ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID
      )
    };
  }
}

function ruleVersion(source: ArchitecturePromotedResultSource): string {
  const versions = new Set(
    source.occurrences
      .filter((occurrence) => occurrence.ruleId === ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID)
      .map((occurrence) => occurrence.ruleVersion)
  );
  if (versions.size > 1) {
    throw new Error(
      `Architecture processing request ${source.request?.id} has mixed rule versions.`
    );
  }
  return (
    [...versions][0] ??
    circularDependencyRuleVersionForProcessor(source.request?.processorVersion ?? "")
  );
}
