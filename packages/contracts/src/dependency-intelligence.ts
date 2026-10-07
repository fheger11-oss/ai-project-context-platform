export type DependencyType =
  "DEPENDENCY" | "DEV_DEPENDENCY" | "PEER_DEPENDENCY" | "OPTIONAL_DEPENDENCY";

export type DependencyFindingLifecycle = "NEW" | "PERSISTING" | "RESOLVED" | "RECURRING";
export type DependencyComparisonStatus = "NO_BASELINE" | "COMPARABLE" | "INCOMPATIBLE";
export type DependencyDeclarationChangeType =
  "ADDED" | "REMOVED" | "VERSION_CHANGED" | "DEPENDENCY_TYPE_CHANGED";

export type DependencyPagination = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

export type DependencyProvenance = {
  repositoryId: string;
  projectContextId: string;
  analysisId: string;
  commitSha: string;
  analyzerVersion: string;
  contextVersion: string;
  dependencyProcessorVersion: string;
};

export type DependencyDeclarationItem = {
  packageName: string;
  declaredVersion: string;
  dependencyType: DependencyType;
  manifestPath: string;
};

export type DependencyFindingEvidenceItem = DependencyDeclarationItem & {
  projectContextId: string;
  analysisId: string;
  commitSha: string;
};

export type DependencyFindingItem = {
  ruleId: "dependency.declaration-divergence";
  ruleVersion: "1.0";
  fingerprint: string;
  packageName: string;
  lifecycle: DependencyFindingLifecycle;
  projectContextId: string;
  analysisId: string;
  commitSha: string;
  evidence: DependencyFindingEvidenceItem[];
};

export type DependencyDeclarationChangeItem = {
  type: DependencyDeclarationChangeType;
  manifestPath: string;
  packageName: string;
  previousVersion?: string;
  currentVersion?: string;
  previousDependencyType?: DependencyType;
  currentDependencyType?: DependencyType;
};

export type DependencyIntelligenceResponse = {
  available: boolean;
  provenance: DependencyProvenance | null;
  compatibility: DependencyComparisonStatus | null;
  summary: null | {
    declarationCount: number;
    distinctPackageCount: number;
    divergenceFindingCount: number;
  };
  declarations: { items: DependencyDeclarationItem[]; pagination: DependencyPagination };
  findings: { items: DependencyFindingItem[]; pagination: DependencyPagination };
};

export type DependencyIntelligenceHistoryResponse = {
  available: boolean;
  compatibility: DependencyComparisonStatus | null;
  current: DependencyProvenance | null;
  previous: DependencyProvenance | null;
  lifecycleCounts: { new: number; persisting: number; resolved: number; recurring: number };
  changeCounts: {
    added: number;
    removed: number;
    versionChanged: number;
    dependencyTypeChanged: number;
  };
  findings: { items: DependencyFindingItem[]; pagination: DependencyPagination };
  changes: { items: DependencyDeclarationChangeItem[]; pagination: DependencyPagination };
};
