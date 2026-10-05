import type { ArchitectureConfidence } from "./architecture-confidence.js";
import type { ArchitectureSourceLocation } from "./architecture-finding-evidence.js";

export type ArchitectureGraphNode = {
  moduleId: string;
  path: string;
  confidence: ArchitectureConfidence;
  sourceFileCount: number;
  declarationCount: number;
  internalRelationshipCount: number;
  incomingRelationshipCount: number;
  outgoingRelationshipCount: number;
};

export type ArchitectureGraphRelationshipEvidence = {
  sourcePath: string;
  targetPath: string;
  relationshipKind: "IMPORTS" | "RE_EXPORTS";
  specifier: string;
  location?: ArchitectureSourceLocation;
};

export type ArchitectureGraphEdge = {
  sourceModuleId: string;
  targetModuleId: string;
  relationshipCount: number;
  confidence: ArchitectureConfidence;
  evidence: readonly ArchitectureGraphRelationshipEvidence[];
};

export type ArchitectureGraph = {
  nodes: readonly ArchitectureGraphNode[];
  edges: readonly ArchitectureGraphEdge[];
};
