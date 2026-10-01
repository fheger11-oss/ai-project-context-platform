import type {
  ArchitectureModule,
  ArchitectureRelationship,
  ComparableArchitectureComparison,
  ModifiedArchitectureModule,
  SuppressedArchitectureClaim
} from "@ai-context/contracts";

import {
  architectureRelationshipIdentity,
  type NormalizedArchitectureSnapshot
} from "./architecture-snapshot.js";

type StructuralComparison = Omit<
  ComparableArchitectureComparison,
  "status" | "baseline" | "target"
>;

export function compareArchitectureSnapshots(
  baseline: NormalizedArchitectureSnapshot,
  target: NormalizedArchitectureSnapshot
): StructuralComparison {
  const addedModules = difference(target.modules, baseline.modules).map(toModule);
  const removedModules = difference(baseline.modules, target.modules).map(toModule);
  const addedRelationships = difference(target.relationships, baseline.relationships).map(
    toRelationship
  );
  const removedRelationships = difference(baseline.relationships, target.relationships).map(
    toRelationship
  );
  const retainedModules = [...target.modules.keys()]
    .filter((id) => baseline.modules.has(id))
    .sort();
  const modifiedModules: ModifiedArchitectureModule[] = [];
  let unchangedModuleCount = 0;

  for (const moduleId of retainedModules) {
    const module = target.modules.get(moduleId);
    if (!module) continue;
    const changes = incidentChanges(moduleId, addedRelationships, removedRelationships);
    if (Object.values(changes).some((items) => items.length > 0)) {
      modifiedModules.push({ module: toModule(module), ...changes });
    } else {
      unchangedModuleCount += 1;
    }
  }

  return {
    addedModules,
    removedModules,
    modifiedModules,
    unchangedModuleCount,
    addedRelationships,
    removedRelationships,
    unchangedRelationshipCount: [...target.relationships.keys()].filter((id) =>
      baseline.relationships.has(id)
    ).length,
    suppressedClaims: mergeSuppressed(baseline.suppressedClaims, target.suppressedClaims)
  };
}

export function hasLowConfidenceTransition(
  baseline: NormalizedArchitectureSnapshot,
  target: NormalizedArchitectureSnapshot
): boolean {
  return (
    intersects(baseline.modules.keys(), target.lowConfidenceModuleIds) ||
    intersects(target.modules.keys(), baseline.lowConfidenceModuleIds) ||
    intersects(baseline.relationships.keys(), target.lowConfidenceRelationshipIds) ||
    intersects(target.relationships.keys(), baseline.lowConfidenceRelationshipIds)
  );
}

function incidentChanges(
  moduleId: string,
  added: ArchitectureRelationship[],
  removed: ArchitectureRelationship[]
) {
  return {
    addedIncomingRelationships: added.filter((item) => item.targetModuleId === moduleId),
    removedIncomingRelationships: removed.filter((item) => item.targetModuleId === moduleId),
    addedOutgoingRelationships: added.filter((item) => item.sourceModuleId === moduleId),
    removedOutgoingRelationships: removed.filter((item) => item.sourceModuleId === moduleId)
  };
}

function difference<T>(values: Map<string, T>, other: Map<string, T>): T[] {
  return [...values].filter(([identity]) => !other.has(identity)).map(([, value]) => value);
}

function toModule(module: {
  moduleId: string;
  name: string;
  path: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}): ArchitectureModule {
  if (module.confidence === "LOW") throw new Error("Low-confidence module was not filtered.");
  return {
    moduleId: module.moduleId,
    name: module.name,
    path: module.path,
    confidence: module.confidence
  };
}

function toRelationship(relationship: {
  sourceModuleId: string;
  targetModuleId: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}): ArchitectureRelationship {
  if (relationship.confidence === "LOW") {
    throw new Error("Low-confidence relationship was not filtered.");
  }
  return {
    sourceModuleId: relationship.sourceModuleId,
    targetModuleId: relationship.targetModuleId,
    confidence: relationship.confidence
  };
}

function intersects(values: Iterable<string>, candidates: Set<string>): boolean {
  return [...values].some((value) => candidates.has(value));
}

function mergeSuppressed(
  baseline: SuppressedArchitectureClaim[],
  target: SuppressedArchitectureClaim[]
): SuppressedArchitectureClaim[] {
  const values = new Map<string, SuppressedArchitectureClaim>();
  for (const item of [...baseline, ...target]) values.set(item.identity, item);
  return [...values.values()].sort((left, right) => left.identity.localeCompare(right.identity));
}

export function compareArchitectureRelationships(
  left: ArchitectureRelationship,
  right: ArchitectureRelationship
): number {
  return architectureRelationshipIdentity(left).localeCompare(
    architectureRelationshipIdentity(right)
  );
}
