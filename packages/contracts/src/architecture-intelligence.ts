import type { AnalysisSourceLocation } from "./analysis.js";

export type ArchitectureIntelligenceProcessingStatus =
  "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "INCOMPATIBLE";
export type ArchitectureIntelligenceConfidence = "LOW" | "MEDIUM" | "HIGH";
export type ArchitectureFindingLifecycle = "NEW" | "PERSISTING" | "RESOLVED" | "RECURRING";
export type ArchitectureIntelligenceCompatibility = "COMPARABLE" | "INCOMPATIBLE" | "NO_BASELINE";

export type ArchitectureFindingSubject =
  | { kind: "MODULE"; moduleId: string }
  | { kind: "RELATIONSHIP"; sourceModuleId: string; targetModuleId: string }
  | { kind: "CYCLE"; moduleIds: string[] };

export type ArchitectureFindingEvidence =
  | { kind: "MODULE"; moduleId: string; confidence: ArchitectureIntelligenceConfidence }
  | {
      kind: "MODULE_RELATIONSHIP";
      sourceModuleId: string;
      targetModuleId: string;
      relationshipCount: number;
      confidence: ArchitectureIntelligenceConfidence;
    }
  | {
      kind: "ANALYSIS_RELATIONSHIP";
      sourceModuleId: string;
      targetModuleId: string;
      sourcePath: string;
      targetPath: string;
      relationshipKind: "IMPORTS" | "RE_EXPORTS";
      specifier: string;
      location?: AnalysisSourceLocation;
    };

export type ArchitectureFindingItem = {
  occurrenceId: string;
  projectContextId: string;
  fingerprint: string;
  ruleId: string;
  ruleVersion: string;
  confidence: ArchitectureIntelligenceConfidence;
  lifecycle: ArchitectureFindingLifecycle | null;
  subject: ArchitectureFindingSubject;
  evidence: ArchitectureFindingEvidence[];
  createdAt: string;
};

export type ArchitectureModuleMeasurement = {
  moduleId: string;
  path: string;
  confidence: ArchitectureIntelligenceConfidence;
  sourceFileCount: number;
  declarationCount: number;
  fanIn: number;
  fanOut: number;
  totalDegree: number;
  relationshipCount: number;
};

export type ArchitectureProcessingSummary = {
  status: ArchitectureIntelligenceProcessingStatus;
  projectContextId: string;
  commitSha: string;
  processorVersion: string;
  analyzerVersion: string;
  contextVersion: string;
  startedAt: string | null;
  completedAt: string | null;
  failureCategory: string | null;
  attemptCount: number;
  nextAttemptAt: string;
};

export type Pagination = { page: number; pageSize: number; total: number; hasNextPage: boolean };

export type ArchitectureIntelligenceResponse = {
  processing: ArchitectureProcessingSummary | null;
  intelligence: null | {
    compatibility: ArchitectureIntelligenceCompatibility;
    summary: {
      moduleCount: number;
      relationshipCount: number;
      circularDependencyFindingCount: number;
      addedModuleCount: number;
      removedModuleCount: number;
      addedRelationshipCount: number;
      removedRelationshipCount: number;
    };
    findings: { items: ArchitectureFindingItem[]; pagination: Pagination };
    modules: { items: ArchitectureModuleMeasurement[]; pagination: Pagination };
    changes: {
      addedModules: string[];
      removedModules: string[];
      addedRelationships: { sourceModuleId: string; targetModuleId: string }[];
      removedRelationships: { sourceModuleId: string; targetModuleId: string }[];
    };
  };
};

export type ArchitectureIntelligenceHistoryItem = {
  historyId: string;
  promotedAt: string;
  projectContextId: string;
  commitSha: string;
  processing: ArchitectureProcessingSummary | null;
  ruleVersion: string | null;
  compatibility: ArchitectureIntelligenceCompatibility | null;
  transitions: { new: number; persisting: number; resolved: number; recurring: number };
  changes: {
    addedModules: number;
    removedModules: number;
    addedRelationships: number;
    removedRelationships: number;
  };
};

export type ArchitectureIntelligenceHistoryResponse = {
  items: ArchitectureIntelligenceHistoryItem[];
  pagination: Pagination;
};
