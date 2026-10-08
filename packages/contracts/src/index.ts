export type { AiExportFormat, AiExportResponse } from "./ai-export.js";

export type {
  DependencyComparisonStatus,
  DependencyDeclarationChangeItem,
  DependencyDeclarationChangeType,
  DependencyDeclarationItem,
  DependencyFindingEvidenceItem,
  DependencyFindingItem,
  DependencyFindingLifecycle,
  DependencyIntelligenceHistoryResponse,
  DependencyIntelligenceResponse,
  DependencyPagination,
  DependencyProvenance,
  DependencyType
} from "./dependency-intelligence.js";

export type {
  ArchitectureFindingEvidence,
  ArchitectureFindingItem,
  ArchitectureFindingLifecycle,
  ArchitectureFindingSubject,
  ArchitectureIntelligenceCompatibility,
  ArchitectureIntelligenceConfidence,
  ArchitectureIntelligenceHistoryItem,
  ArchitectureIntelligenceHistoryResponse,
  ArchitectureIntelligenceProcessingStatus,
  ArchitectureIntelligenceResponse,
  ArchitectureModuleMeasurement,
  ArchitectureProcessingSummary
} from "./architecture-intelligence.js";

export type {
  ArchitectureComparisonDiagnostic,
  ArchitectureComparisonResponse,
  ArchitectureComparisonStatus,
  ArchitectureHistoryResponse,
  ArchitectureModule,
  ArchitectureRelationship,
  ArchitectureSnapshotSummary,
  ComparableArchitectureComparison,
  IncompatibleArchitectureComparison,
  IncompleteArchitectureComparison,
  ModifiedArchitectureModule,
  NoBaselineArchitectureComparison,
  SuppressedArchitectureClaim
} from "./architecture-history.js";

export type {
  CreateProjectDecisionRequest,
  ProjectDecision,
  ProjectDecisionListResponse,
  ProjectDecisionStatus,
  UpdateProjectDecisionRequest
} from "./project-decisions.js";
export type {
  CreateProjectKnowledgeRequest,
  ProjectKnowledge,
  ProjectKnowledgeConfidence,
  ProjectKnowledgeKind,
  ProjectKnowledgeListResponse,
  ProjectKnowledgeOrigin,
  ProjectKnowledgeSourceType,
  ProjectKnowledgeStatus,
  UpdateProjectKnowledgeRequest
} from "./project-knowledge.js";

export type {
  ContextPromotedTimelineItem,
  DecisionEffectiveTimelineItem,
  ProjectTimelineItem,
  ProjectTimelineItemType,
  ProjectTimelineResponse,
  RepositoryConnectedTimelineItem,
  RepositoryUpdateTimelineItem
} from "./project-timeline.js";

export type {
  DashboardProjectAiExportSummary,
  DashboardProjectDocumentsSummary,
  DashboardProjectLatestAnalysisSummary,
  DashboardProjectLatestContextSummary,
  DashboardProjectLatestScanSummary,
  DashboardProjectRepositorySummary,
  DashboardProjectsResponse,
  DashboardProjectSummary
} from "./dashboard.js";

export type {
  AnalysisDependencyEdge,
  AnalysisDependencyEdgeKind,
  AnalysisDetectedFramework,
  AnalysisDetectedLanguage,
  AnalysisFileCategory,
  AnalysisFileClassification,
  AnalysisHistoryItem,
  AnalysisHistoryResponse,
  AnalysisIssue,
  AnalysisManifestType,
  AnalysisPackageDependency,
  AnalysisPackageDependencyEvidence,
  AnalysisPackageDependencyType,
  AnalysisPackageJsonPackage,
  AnalysisPackageManager,
  AnalysisPackageManagerCandidate,
  AnalysisPackageManagerDetection,
  AnalysisPackageScript,
  AnalysisProjectDetectionIssue,
  AnalysisProjectEcosystem,
  AnalysisProjectFramework,
  AnalysisProjectLanguage,
  AnalysisProjectManifest,
  AnalysisProjectProfile,
  AnalysisRelationshipEvidence,
  AnalysisRelationshipEvidenceKind,
  AnalysisRelationshipKind,
  AnalysisRelationshipTargetKind,
  AnalysisResultResponse,
  AnalysisSourceDeclaration,
  AnalysisSourceDeclarationKind,
  AnalysisSourceExport,
  AnalysisSourceExportKind,
  AnalysisSourceFileStructure,
  AnalysisSourceImport,
  AnalysisSourceLanguage,
  AnalysisSourceLocation,
  AnalysisSourceNamedExport,
  AnalysisSourceNamedImport,
  AnalysisSourceParseIssue,
  AnalysisSourceRelationship,
  AnalysisSourceVisibility,
  CreateAnalysisRequest
} from "./analysis.js";

export type {
  ArchitecturalModule,
  ArchitectureFrameworkSignal,
  ArchitectureLayerKind,
  ArchitectureModuleConfidence,
  ArchitectureModuleEvidence,
  ArchitectureModuleInference,
  ArchitectureModuleKind,
  ArchitectureModuleLayer,
  ArchitectureSourceExportReference,
  ContextClaim,
  ContextClaimKind,
  ContextConfidence,
  ContextEvidence,
  ContextEvidenceKind,
  ContextEvidenceReference,
  ContextSection,
  GenerateProjectContextResponse,
  ProjectContextHistoryItem,
  ProjectContextHistoryResponse,
  ProjectContextArchitectureModel,
  ProjectContextResponse,
  ProjectContextSemantic,
  SemanticExport,
  SemanticFile,
  SemanticImport,
  SemanticPackage,
  SemanticRelationship,
  SemanticRelationshipEvidence,
  SemanticSourceLocation,
  SemanticSymbol
} from "./context.js";

export type {
  DocumentHistoryResponse,
  DocumentFormat,
  DocumentType,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "./documents.js";

export type RepositoryVisibility = "PUBLIC" | "PRIVATE" | "INTERNAL";

export type RepositoryAutomationCapability =
  | "CAN_MANAGE_WEBHOOK"
  | "CANNOT_MANAGE_WEBHOOK"
  | "PROVIDER_ACCESS_DENIED"
  | "PROVIDER_REPOSITORY_NOT_FOUND"
  | "PROVIDER_AUTHORIZATION_REQUIRED"
  | "PROVIDER_UNAVAILABLE";

export type RepositoryAutomationStatus = {
  automaticUpdates: {
    capability: RepositoryAutomationCapability;
    configuration:
      | "NOT_CONFIGURED"
      | "PROVISIONING"
      | "ENABLED"
      | "REQUIRES_ADMIN"
      | "REQUIRES_AUTHORIZATION"
      | "UNAVAILABLE"
      | "FAILED"
      | "CLEANUP_PENDING";
    enabled: boolean;
    lastOutcome:
      | "WEBHOOK_CREATED"
      | "WEBHOOK_ALREADY_CONFIGURED"
      | "WEBHOOK_UPDATED"
      | "WEBHOOK_NOT_AUTHORIZED"
      | "WEBHOOK_PROVIDER_UNAVAILABLE"
      | "WEBHOOK_CONFIGURATION_INVALID"
      | "WEBHOOK_NOT_FOUND"
      | "WEBHOOK_UNKNOWN_FAILURE"
      | "WEBHOOK_DELETED"
      | "WEBHOOK_ALREADY_DELETED"
      | "WEBHOOK_CLEANUP_PENDING"
      | null;
    lastVerifiedAt: string | null;
  };
};

export type RepositoryFreshnessStatus = "UNKNOWN" | "FRESH" | "STALE" | "UPDATE_FAILED";

export type RepositoryUpdateStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type RepositoryUpdateTriggerType = "MANUAL" | "WEBHOOK" | "SYSTEM";

export type RunRepositoryUpdateRequest = Record<string, never>;

export type RepositoryStateSummary = {
  repositoryId: string;
  freshnessStatus: RepositoryFreshnessStatus;
  remoteHeadCommitSha: string | null;
  remoteHeadCheckedAt: string | null;
  lastScannedCommitSha: string | null;
  lastAnalyzedCommitSha: string | null;
  currentProjectContextId: string | null;
  currentContextCommitSha: string | null;
  lastUpdateStatus: string | null;
};

export type RepositoryUpdateResponse = {
  noop: boolean;
  updateId: string | null;
  status: RepositoryUpdateStatus | null;
  triggerType: RepositoryUpdateTriggerType;
  baseCommitSha: string | null;
  targetCommitSha: string;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
  freshnessStatus: RepositoryFreshnessStatus;
};

export type RepositoryUpdateSummary = {
  id: string;
  repositoryId: string;
  triggerType: RepositoryUpdateTriggerType;
  status: RepositoryUpdateStatus;
  baseCommitSha: string | null;
  targetCommitSha: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  scanId: string | null;
  analysisId: string | null;
  projectContextId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RepositoryUpdateDetail = RepositoryUpdateSummary;

export type RepositoryUpdateHistoryResponse = {
  items: RepositoryUpdateSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type RepositoryCurrentUpdateResponse = {
  update: RepositoryUpdateSummary | null;
};

export type RepositorySummary = {
  id: string;
  githubId: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  language: string | null;
  stars: number;
  forks: number;
  isArchived: boolean;
  cloneUrl: string;
  htmlUrl: string;
  githubUpdatedAt: string;
  lastSyncedAt: string;
};

export type ConnectRepositoryResponse = RepositorySummary & RepositoryAutomationStatus;

export type AvailableGitHubRepository = Omit<RepositorySummary, "id" | "lastSyncedAt"> & {
  connectedRepositoryId: string | null;
  isConnected: boolean;
};

export type ListRepositoriesResponse = {
  repositories: RepositorySummary[];
};

export type ListAvailableGitHubRepositoriesResponse = {
  repositories: AvailableGitHubRepository[];
};

export type GitHubIdentity = {
  avatarUrl: string | null;
  displayName: string | null;
  username: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  github: GitHubIdentity | null;
  role: "USER" | "ADMIN";
  tenantId: string | null;
  createdAt: string;
};

export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type ScanLimitFailureReason =
  "FILE_COUNT_LIMIT" | "INDIVIDUAL_FILE_SIZE_LIMIT" | "TOTAL_SIZE_LIMIT";

export type StartScanRequest = {
  repositoryId: string;
  reference?: string;
};

export type ScanLimits = {
  maxFiles: number;
  maxIndividualNonBinaryFileSizeBytes: number;
  maxNonBinaryContentSizeBytes: number;
  binaryContentFetched: false;
  binaryFilesCountTowardFileLimit: true;
  /** @deprecated Use maxIndividualNonBinaryFileSizeBytes. */
  maxIndividualFileSizeBytes: number;
  /** @deprecated Use maxNonBinaryContentSizeBytes. */
  maxTotalSizeBytes: number;
};

export type ScanUsage = {
  filesProcessed: number;
  totalBytesConsidered: string;
};

export type ScanLimitState = {
  reached: boolean;
  reason: ScanLimitFailureReason | null;
};

export type ScanSnapshot = {
  id: string;
  repositoryId: string;
  status: ScanStatus;
  commitSha: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  totalFiles: number;
  totalSize: string;
  usage: ScanUsage;
  limit: ScanLimitState;
  createdAt: string;
  updatedAt: string;
};

export type ScanLimitErrorResponse = {
  statusCode: number;
  message: string;
  error: "Scan Limit Reached";
  code: "SCAN_LIMIT_REACHED";
  limit: ScanLimitState;
  usage: ScanUsage;
  limits: ScanLimits;
  filePath?: string;
};

export type ScanLatestAnalysisSummary = {
  analysisId: string;
  scanId: string;
  analyzerVersion: string;
  generatedAt: string;
  commitSha: string;
};

export type ScanHistoryItem = ScanSnapshot & {
  latestAnalysis: ScanLatestAnalysisSummary | null;
};

export type ScanHistoryPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ScanHistoryResponse = {
  items: ScanHistoryItem[];
  pagination: ScanHistoryPagination;
};
