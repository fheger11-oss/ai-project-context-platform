import { createHash } from "node:crypto";

import type { ArchitectureConfidence } from "./architecture-confidence.js";
import type { ArchitectureGraph, ArchitectureGraphEdge } from "./architecture-graph.js";
import {
  ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID,
  LEGACY_ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION
} from "./architecture-rule-version.js";

export type CircularDependencyFinding = {
  fingerprint: string;
  ruleId: typeof ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID;
  ruleVersion: typeof LEGACY_ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION;
  confidence: Exclude<ArchitectureConfidence, "LOW">;
  moduleIds: readonly string[];
  edges: readonly ArchitectureGraphEdge[];
};

export function detectCircularDependencies(graph: ArchitectureGraph): CircularDependencyFinding[] {
  const eligibleNodes = graph.nodes.filter((node) => node.confidence !== "LOW");
  const eligibleIds = new Set(eligibleNodes.map((node) => node.moduleId));
  const eligibleEdges = graph.edges.filter(
    (edge) =>
      edge.confidence !== "LOW" &&
      eligibleIds.has(edge.sourceModuleId) &&
      eligibleIds.has(edge.targetModuleId)
  );
  const adjacency = new Map(eligibleNodes.map((node) => [node.moduleId, [] as string[]]));
  for (const edge of eligibleEdges) adjacency.get(edge.sourceModuleId)?.push(edge.targetModuleId);
  for (const targets of adjacency.values())
    targets.sort((left, right) => left.localeCompare(right));

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
    if (component.length >= 2) components.push(component.sort((a, b) => a.localeCompare(b)));
  };

  for (const moduleId of [...eligibleIds].sort((a, b) => a.localeCompare(b))) {
    if (!indexById.has(moduleId)) visit(moduleId);
  }

  const nodeById = new Map(eligibleNodes.map((node) => [node.moduleId, node]));
  return components
    .map((moduleIds): CircularDependencyFinding => {
      const membership = new Set(moduleIds);
      const edges = eligibleEdges
        .filter(
          (edge) => membership.has(edge.sourceModuleId) && membership.has(edge.targetModuleId)
        )
        .sort(compareEdges);
      const confidence: "HIGH" | "MEDIUM" =
        moduleIds.every((id) => nodeById.get(id)?.confidence === "HIGH") &&
        edges.every((edge) => edge.confidence === "HIGH")
          ? "HIGH"
          : "MEDIUM";
      return {
        fingerprint: circularDependencyFingerprint(moduleIds),
        ruleId: ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID,
        ruleVersion: LEGACY_ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_VERSION,
        confidence,
        moduleIds,
        edges
      };
    })
    .sort((left, right) => left.moduleIds.join("\0").localeCompare(right.moduleIds.join("\0")));
}

export function circularDependencyFingerprint(moduleIds: readonly string[]): string {
  const canonicalCycle = [...new Set(moduleIds)].sort((a, b) => a.localeCompare(b));
  return createHash("sha256")
    .update(`${ARCHITECTURE_CIRCULAR_DEPENDENCY_RULE_ID}\0${canonicalCycle.join("\0")}`)
    .digest("hex");
}

function compareEdges(left: ArchitectureGraphEdge, right: ArchitectureGraphEdge): number {
  return (
    left.sourceModuleId.localeCompare(right.sourceModuleId) ||
    left.targetModuleId.localeCompare(right.targetModuleId)
  );
}
