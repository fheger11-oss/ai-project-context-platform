import { createHash } from "node:crypto";

import type {
  ArchitectureDependency,
  ArchitecturalModule
} from "../../context/domain/project-context-architecture.js";
import type { ArchitectureConfidence } from "./architecture-confidence.js";
import type { ArchitectureFindingApplicability } from "./contracts/architecture-finding-occurrence-repository.contract.js";
import { ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE } from "./architecture-rule-version.js";
import type {
  ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID,
  ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION
} from "./architecture-rule-version.js";

export type CanonicalCircularDependencyFinding = {
  fingerprint: string;
  ruleId: typeof ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID;
  ruleVersion: typeof ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION;
  applicability: ArchitectureFindingApplicability;
  confidence: ArchitectureConfidence;
  moduleIds: readonly string[];
  dependencyIds: readonly string[];
  relationshipIds: readonly string[];
};

export function detectCanonicalCircularDependencies(input: {
  modules: readonly ArchitecturalModule[];
  dependencies: readonly ArchitectureDependency[];
  unresolvedSemanticRelationshipCount: number;
}): CanonicalCircularDependencyFinding[] {
  const modules = [...input.modules].sort((left, right) => left.id.localeCompare(right.id));
  const moduleById = uniqueById(modules, "architecture module");
  const dependencies = [...input.dependencies].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
  uniqueById(dependencies, "architecture dependency");

  const adjacency = new Map(modules.map((module) => [module.id, [] as string[]]));
  for (const dependency of dependencies) {
    if (!moduleById.has(dependency.sourceModuleId) || !moduleById.has(dependency.targetModuleId)) {
      throw new Error(
        `Canonical architecture dependency ${dependency.id} references an unknown module.`
      );
    }
    adjacency.get(dependency.sourceModuleId)!.push(dependency.targetModuleId);
  }
  for (const targets of adjacency.values())
    targets.sort((left, right) => left.localeCompare(right));

  const components = stronglyConnectedComponents(adjacency);
  const applicability: ArchitectureFindingApplicability =
    input.unresolvedSemanticRelationshipCount === 0 ? "APPLICABLE" : "PARTIALLY_APPLICABLE";

  return components
    .filter((moduleIds) => moduleIds.length >= 2)
    .map((moduleIds): CanonicalCircularDependencyFinding => {
      const membership = new Set(moduleIds);
      const cycleDependencies = dependencies.filter(
        (dependency) =>
          membership.has(dependency.sourceModuleId) && membership.has(dependency.targetModuleId)
      );
      const dependencyIds = cycleDependencies.map((dependency) => dependency.id).sort();
      const relationshipIds = [
        ...new Set(cycleDependencies.flatMap((dependency) => dependency.relationshipIds))
      ].sort();
      return {
        fingerprint: canonicalCircularDependencyFingerprint(moduleIds),
        ruleId: ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE.id,
        ruleVersion: ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE.version,
        applicability,
        confidence: lowestConfidence(
          moduleIds.map((moduleId) => moduleById.get(moduleId)!.confidence)
        ),
        moduleIds,
        dependencyIds,
        relationshipIds
      };
    })
    .sort((left, right) => left.moduleIds.join("\0").localeCompare(right.moduleIds.join("\0")));
}

export function canonicalCircularDependencyFingerprint(moduleIds: readonly string[]): string {
  const canonicalCycle = [...new Set(moduleIds)].sort((left, right) => left.localeCompare(right));
  return createHash("sha256")
    .update(`${ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE.id}\0${canonicalCycle.join("\0")}`)
    .digest("hex");
}

function stronglyConnectedComponents(
  adjacency: ReadonlyMap<string, readonly string[]>
): string[][] {
  const indexById = new Map<string, number>();
  const lowLinkById = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let nextIndex = 0;

  const visit = (moduleId: string) => {
    indexById.set(moduleId, nextIndex);
    lowLinkById.set(moduleId, nextIndex);
    nextIndex += 1;
    stack.push(moduleId);
    onStack.add(moduleId);

    for (const targetId of adjacency.get(moduleId) ?? []) {
      if (!indexById.has(targetId)) {
        visit(targetId);
        lowLinkById.set(moduleId, Math.min(lowLinkById.get(moduleId)!, lowLinkById.get(targetId)!));
      } else if (onStack.has(targetId)) {
        lowLinkById.set(moduleId, Math.min(lowLinkById.get(moduleId)!, indexById.get(targetId)!));
      }
    }

    if (lowLinkById.get(moduleId) !== indexById.get(moduleId)) return;
    const component: string[] = [];
    let current: string;
    do {
      current = stack.pop()!;
      onStack.delete(current);
      component.push(current);
    } while (current !== moduleId);
    components.push(component.sort((left, right) => left.localeCompare(right)));
  };

  for (const moduleId of [...adjacency.keys()].sort()) {
    if (!indexById.has(moduleId)) visit(moduleId);
  }
  return components;
}

function uniqueById<T extends { id: string }>(values: readonly T[], label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (result.has(value.id)) throw new Error(`Canonical ${label} ID ${value.id} is duplicated.`);
    result.set(value.id, value);
  }
  return result;
}

function lowestConfidence(values: readonly ArchitectureConfidence[]): ArchitectureConfidence {
  if (values.includes("LOW")) return "LOW";
  if (values.includes("MEDIUM")) return "MEDIUM";
  return "HIGH";
}
