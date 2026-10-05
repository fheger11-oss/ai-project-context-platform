import type { ArchitectureGraph } from "./architecture-graph.js";
import type { ArchitectureHistoricalOccurrenceReference } from "./contracts/architecture-historical-result-reader.contract.js";

export type ArchitectureCompatibility = {
  analyzerVersion: string;
  contextVersion: string;
  processorVersion: string;
  ruleId: string;
  ruleVersion: string;
};

export type ArchitectureHistoricalSnapshot = {
  processingRequestId: string;
  projectContextId: string;
  compatibility: ArchitectureCompatibility;
  graph: ArchitectureGraph;
  occurrences: readonly ArchitectureHistoricalOccurrenceReference[];
};

export type ArchitectureFindingLifecycle = "NEW" | "PERSISTING" | "RESOLVED" | "RECURRING";

export type ArchitectureFindingLifecycleTransition = {
  lifecycle: ArchitectureFindingLifecycle;
  fingerprint: string;
  ruleId: string;
  ruleVersion: string;
  currentOccurrenceId?: string;
  previousOccurrenceId?: string;
};

export type ArchitectureRelationshipReference = {
  sourceModuleId: string;
  targetModuleId: string;
};

export type ArchitectureHistoryComparison =
  | { status: "NO_BASELINE" | "INCOMPATIBLE" }
  | {
      status: "COMPARABLE";
      currentProcessingRequestId: string;
      previousProcessingRequestId: string;
      lifecycle: readonly ArchitectureFindingLifecycleTransition[];
      addedModules: readonly string[];
      removedModules: readonly string[];
      addedRelationships: readonly ArchitectureRelationshipReference[];
      removedRelationships: readonly ArchitectureRelationshipReference[];
    };

export function architectureResultsAreCompatible(
  left: ArchitectureCompatibility,
  right: ArchitectureCompatibility
): boolean {
  return (
    left.analyzerVersion === right.analyzerVersion &&
    left.contextVersion === right.contextVersion &&
    left.processorVersion === right.processorVersion &&
    left.ruleId === right.ruleId &&
    left.ruleVersion === right.ruleVersion
  );
}

/** Earlier snapshots must be the contiguous compatible sequence, newest first. */
export function compareArchitectureHistory(
  current: ArchitectureHistoricalSnapshot,
  previous: ArchitectureHistoricalSnapshot | null,
  earlier: readonly ArchitectureHistoricalSnapshot[] = []
): ArchitectureHistoryComparison {
  if (!previous) return { status: "NO_BASELINE" };
  if (!architectureResultsAreCompatible(current.compatibility, previous.compatibility)) {
    return { status: "INCOMPATIBLE" };
  }

  const compatibleEarlier: ArchitectureHistoricalSnapshot[] = [];
  for (const snapshot of earlier) {
    if (!architectureResultsAreCompatible(current.compatibility, snapshot.compatibility)) break;
    compatibleEarlier.push(snapshot);
  }

  const currentOccurrences = occurrenceMap(current.occurrences);
  const previousOccurrences = occurrenceMap(previous.occurrences);
  const fingerprints = [
    ...new Set([...currentOccurrences.keys(), ...previousOccurrences.keys()])
  ].sort((left, right) => left.localeCompare(right));
  const lifecycle: ArchitectureFindingLifecycleTransition[] = [];

  for (const fingerprint of fingerprints) {
    const currentOccurrence = currentOccurrences.get(fingerprint);
    const previousOccurrence = previousOccurrences.get(fingerprint);
    if (currentOccurrence && previousOccurrence) {
      lifecycle.push(transition("PERSISTING", currentOccurrence, previousOccurrence));
    } else if (currentOccurrence) {
      const recurred = compatibleEarlier.some((snapshot) =>
        snapshot.occurrences.some((occurrence) => occurrence.fingerprint === fingerprint)
      );
      lifecycle.push(transition(recurred ? "RECURRING" : "NEW", currentOccurrence));
    } else if (previousOccurrence) {
      lifecycle.push(transition("RESOLVED", previousOccurrence, previousOccurrence, false));
    }
  }

  const currentStructure = comparableStructure(current.graph);
  const previousStructure = comparableStructure(previous.graph);
  return {
    status: "COMPARABLE",
    currentProcessingRequestId: current.processingRequestId,
    previousProcessingRequestId: previous.processingRequestId,
    lifecycle,
    addedModules: difference(currentStructure.modules, previousStructure.modules),
    removedModules: difference(previousStructure.modules, currentStructure.modules),
    addedRelationships: relationshipDifference(
      currentStructure.relationships,
      previousStructure.relationships
    ),
    removedRelationships: relationshipDifference(
      previousStructure.relationships,
      currentStructure.relationships
    )
  };
}

function transition(
  lifecycle: ArchitectureFindingLifecycle,
  occurrence: ArchitectureHistoricalOccurrenceReference,
  previous?: ArchitectureHistoricalOccurrenceReference,
  hasCurrent = true
): ArchitectureFindingLifecycleTransition {
  return {
    lifecycle,
    fingerprint: occurrence.fingerprint,
    ruleId: occurrence.ruleId,
    ruleVersion: occurrence.ruleVersion,
    ...(hasCurrent ? { currentOccurrenceId: occurrence.id } : {}),
    ...(previous ? { previousOccurrenceId: previous.id } : {})
  };
}

function occurrenceMap(values: readonly ArchitectureHistoricalOccurrenceReference[]) {
  return new Map(values.map((value) => [value.fingerprint, value]));
}

function comparableStructure(graph: ArchitectureGraph) {
  const modules = new Set(
    graph.nodes.filter((node) => node.confidence !== "LOW").map((node) => node.moduleId)
  );
  const relationships = new Map<string, ArchitectureRelationshipReference>();
  for (const edge of graph.edges) {
    if (
      edge.confidence === "LOW" ||
      !modules.has(edge.sourceModuleId) ||
      !modules.has(edge.targetModuleId)
    )
      continue;
    const reference = {
      sourceModuleId: edge.sourceModuleId,
      targetModuleId: edge.targetModuleId
    };
    relationships.set(relationshipIdentity(reference), reference);
  }
  return { modules, relationships };
}

function difference(values: ReadonlySet<string>, other: ReadonlySet<string>): string[] {
  return [...values].filter((value) => !other.has(value)).sort((a, b) => a.localeCompare(b));
}

function relationshipDifference(
  values: ReadonlyMap<string, ArchitectureRelationshipReference>,
  other: ReadonlyMap<string, ArchitectureRelationshipReference>
): ArchitectureRelationshipReference[] {
  return [...values]
    .filter(([identity]) => !other.has(identity))
    .map(([, value]) => value)
    .sort((left, right) => relationshipIdentity(left).localeCompare(relationshipIdentity(right)));
}

function relationshipIdentity(value: ArchitectureRelationshipReference): string {
  return `${value.sourceModuleId}\0${value.targetModuleId}`;
}
