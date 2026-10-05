import type { ArchitectureGraph } from "./architecture-graph.js";

export type ArchitectureModuleMeasurementValue = {
  moduleId: string;
  path: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourceFileCount: number;
  declarationCount: number;
  fanIn: number;
  fanOut: number;
  totalDegree: number;
  relationshipCount: number;
};

export function measureArchitectureModules(
  graph: ArchitectureGraph
): ArchitectureModuleMeasurementValue[] {
  return graph.nodes.map((node) => {
    const fanIn = graph.edges.filter((edge) => edge.targetModuleId === node.moduleId).length;
    const fanOut = graph.edges.filter((edge) => edge.sourceModuleId === node.moduleId).length;
    return {
      moduleId: node.moduleId,
      path: node.path,
      confidence: node.confidence,
      sourceFileCount: node.sourceFileCount,
      declarationCount: node.declarationCount,
      fanIn,
      fanOut,
      totalDegree: fanIn + fanOut,
      relationshipCount:
        node.internalRelationshipCount +
        node.incomingRelationshipCount +
        node.outgoingRelationshipCount
    };
  });
}
