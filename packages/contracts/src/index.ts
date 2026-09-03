export type { AiExportFormat, AiExportResponse } from "./ai-export.js";

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
  ProjectContextResponse
} from "./context.js";

export type {
  DocumentHistoryResponse,
  DocumentFormat,
  DocumentType,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "./documents.js";

export type RepositoryVisibility = "PUBLIC" | "PRIVATE" | "INTERNAL";

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
  maxIndividualFileSizeBytes: number;
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
