import type { ContextConfidence } from "./context.js";

export type ArchitectureComparisonStatus =
  "COMPARABLE" | "INCOMPATIBLE" | "INCOMPLETE" | "NO_BASELINE";

export type ArchitectureSnapshotSummary = {
  historyId: string;
  projectContextId: string;
  analysisId: string;
  scanId: string;
  commitSha: string;
  promotedAt: string;
  generatedAt: string;
  contextVersion: string;
  analyzerVersion: string;
  hasPreviousSnapshot: boolean;
  adjacentCompatibility: ArchitectureComparisonStatus;
};

export type ArchitectureModule = {
  moduleId: string;
  name: string;
  path: string;
  confidence: Extract<ContextConfidence, "MEDIUM" | "HIGH">;
};

export type ArchitectureRelationship = {
  sourceModuleId: string;
  targetModuleId: string;
  confidence: Extract<ContextConfidence, "MEDIUM" | "HIGH">;
};

export type ModifiedArchitectureModule = {
  module: ArchitectureModule;
  addedIncomingRelationships: ArchitectureRelationship[];
  removedIncomingRelationships: ArchitectureRelationship[];
  addedOutgoingRelationships: ArchitectureRelationship[];
  removedOutgoingRelationships: ArchitectureRelationship[];
};

export type ArchitectureComparisonDiagnostic = {
  code: string;
  message: string;
};

export type SuppressedArchitectureClaim = {
  identity: string;
  reason: "LOW_CONFIDENCE";
};

export type ArchitectureHistoryResponse = {
  items: ArchitectureSnapshotSummary[];
};

type ArchitectureComparisonBase = {
  status: ArchitectureComparisonStatus;
  baseline: ArchitectureSnapshotSummary | null;
  target: ArchitectureSnapshotSummary;
};

export type ComparableArchitectureComparison = ArchitectureComparisonBase & {
  status: "COMPARABLE";
  baseline: ArchitectureSnapshotSummary;
  addedModules: ArchitectureModule[];
  removedModules: ArchitectureModule[];
  modifiedModules: ModifiedArchitectureModule[];
  unchangedModuleCount: number;
  addedRelationships: ArchitectureRelationship[];
  removedRelationships: ArchitectureRelationship[];
  unchangedRelationshipCount: number;
  suppressedClaims: SuppressedArchitectureClaim[];
};

export type NoBaselineArchitectureComparison = ArchitectureComparisonBase & {
  status: "NO_BASELINE";
  baseline: null;
};

export type IncompatibleArchitectureComparison = ArchitectureComparisonBase & {
  status: "INCOMPATIBLE";
  baseline: ArchitectureSnapshotSummary;
};

export type IncompleteArchitectureComparison = ArchitectureComparisonBase & {
  status: "INCOMPLETE";
  diagnostics: ArchitectureComparisonDiagnostic[];
  suppressedClaims: SuppressedArchitectureClaim[];
};

export type ArchitectureComparisonResponse =
  | ComparableArchitectureComparison
  | NoBaselineArchitectureComparison
  | IncompatibleArchitectureComparison
  | IncompleteArchitectureComparison;
