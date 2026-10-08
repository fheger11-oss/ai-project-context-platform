import { describe, expectTypeOf, it } from "vitest";

import type {
  AnalysisHistoryResponse,
  AnalysisPackagePublicSurfaceDeclaration,
  AnalysisResultResponse,
  ArchitectureDependency,
  ArchitecturePublicSurface,
  ArchitecturePublicSurfaceDeclarationReference,
  AiExportResponse,
  CreateAnalysisRequest,
  DocumentHistoryResponse,
  DashboardProjectsResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest,
  RepositoryCurrentUpdateResponse,
  ConnectRepositoryResponse,
  RepositoryAutomationStatus,
  RepositoryStateSummary,
  RepositoryUpdateDetail,
  RepositoryUpdateHistoryResponse,
  RepositoryUpdateResponse,
  RepositoryUpdateSummary,
  RunRepositoryUpdateRequest,
  ScanLimitErrorResponse,
  ScanLimits,
  ScanSnapshot,
  ScanUsage,
  ProjectDecision,
  ProjectDecisionStatus,
  ProjectTimelineItem,
  ProjectTimelineItemType,
  ProjectTimelineResponse,
  ProjectContextArchitectureModel,
  ProjectContextSemantic
} from "./index.js";

describe("contracts package exports", () => {
  it("exports ProjectContext semantic preservation contracts", () => {
    expectTypeOf<ProjectContextSemantic>().toHaveProperty("files");
    expectTypeOf<ProjectContextSemantic>().toHaveProperty("symbols");
    expectTypeOf<ProjectContextSemantic>().toHaveProperty("relationships");
  });
  it("exports ProjectContext architecture inventory contracts", () => {
    expectTypeOf<ProjectContextArchitectureModel>().toHaveProperty("modules");
    expectTypeOf<ProjectContextArchitectureModel>().toHaveProperty("dependencies");
    expectTypeOf<ProjectContextArchitectureModel>().toHaveProperty("publicSurfaces");
    expectTypeOf<ProjectContextArchitectureModel["modules"][number]>()
      .toHaveProperty("rootPath")
      .toEqualTypeOf<string>();
    expectTypeOf<ArchitectureDependency>().toHaveProperty("relationshipIds");
    expectTypeOf<ArchitecturePublicSurface>().toHaveProperty("declarations");
    expectTypeOf<ArchitecturePublicSurfaceDeclarationReference>().toHaveProperty("sourceExportIds");
  });
  it("exports ProjectTimeline contracts from the public entrypoint", () => {
    expectTypeOf<ProjectTimelineItemType>().toEqualTypeOf<
      "REPOSITORY_CONNECTED" | "REPOSITORY_UPDATE" | "CONTEXT_PROMOTED" | "DECISION_EFFECTIVE"
    >();
    expectTypeOf<ProjectTimelineItem>().toHaveProperty("occurredAt").toEqualTypeOf<string>();
    expectTypeOf<ProjectTimelineResponse>().toHaveProperty("pagination");
  });

  it("exports ProjectDecision contracts from the public entrypoint", () => {
    expectTypeOf<ProjectDecisionStatus>().toEqualTypeOf<"ACTIVE" | "SUPERSEDED" | "ARCHIVED">();
    expectTypeOf<ProjectDecision>().toHaveProperty("repositoryId").toEqualTypeOf<string>();
  });
  it("exports Analysis API contracts from the public entrypoint", () => {
    expectTypeOf<CreateAnalysisRequest>().toMatchTypeOf<{ scanId: string }>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("analysisId").toEqualTypeOf<string>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("generatedAt").toEqualTypeOf<string>();
    expectTypeOf<AnalysisHistoryResponse["items"]>().toMatchTypeOf<readonly unknown[]>();
    expectTypeOf<AnalysisPackagePublicSurfaceDeclaration>().toHaveProperty("declaredTarget");
  });

  it("exports Document API contracts from the public entrypoint", () => {
    expectTypeOf<GenerateDocumentRequest>().toHaveProperty("contextId").toEqualTypeOf<string>();
    expectTypeOf<GenerateDocumentRequest>()
      .toHaveProperty("documentType")
      .toEqualTypeOf<
        | "PROJECT_OVERVIEW"
        | "TECHNICAL_DOCUMENTATION"
        | "ARCHITECTURE_DOCUMENT"
        | "MODULE_DOCUMENTATION"
        | "README"
      >();
    expectTypeOf<GenerateDocumentRequest>().not.toHaveProperty("generatorVersion");
    expectTypeOf<GeneratedDocumentResponse>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<GeneratedDocumentResponse>().toHaveProperty("content").toEqualTypeOf<string>();
    expectTypeOf<DocumentHistoryResponse["documents"]>().toMatchTypeOf<readonly unknown[]>();
  });

  it("exports AI Export API contracts from the public entrypoint", () => {
    expectTypeOf<AiExportResponse>().toHaveProperty("projectContextId").toEqualTypeOf<string>();
    expectTypeOf<AiExportResponse>()
      .toHaveProperty("format")
      .toEqualTypeOf<"AI_CONTEXT" | "MARKDOWN" | "TEXT">();
    expectTypeOf<AiExportResponse>().toHaveProperty("content").toEqualTypeOf<string>();
  });

  it("exports Dashboard API contracts from the public entrypoint", () => {
    expectTypeOf<DashboardProjectsResponse>().toHaveProperty("projects");
    expectTypeOf<DashboardProjectsResponse["projects"]>().toMatchTypeOf<readonly unknown[]>();
  });

  it("exports RepositoryState API contracts from the public entrypoint", () => {
    expectTypeOf<RepositoryStateSummary>().toMatchTypeOf<{
      repositoryId: string;
      freshnessStatus: "UNKNOWN" | "FRESH" | "STALE" | "UPDATE_FAILED";
      remoteHeadCommitSha: string | null;
      remoteHeadCheckedAt: string | null;
      lastScannedCommitSha: string | null;
      lastAnalyzedCommitSha: string | null;
      currentProjectContextId: string | null;
      currentContextCommitSha: string | null;
      lastUpdateStatus: string | null;
    }>();
    expectTypeOf<RepositoryStateSummary>().not.toHaveProperty("id");
  });

  it("exports repository automatic-update capability contracts", () => {
    expectTypeOf<RepositoryAutomationStatus>().toMatchTypeOf<{
      automaticUpdates: {
        capability:
          | "CAN_MANAGE_WEBHOOK"
          | "CANNOT_MANAGE_WEBHOOK"
          | "PROVIDER_ACCESS_DENIED"
          | "PROVIDER_REPOSITORY_NOT_FOUND"
          | "PROVIDER_AUTHORIZATION_REQUIRED"
          | "PROVIDER_UNAVAILABLE";
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
        lastOutcome: string | null;
        lastVerifiedAt: string | null;
      };
    }>();
    expectTypeOf<ConnectRepositoryResponse>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<ConnectRepositoryResponse>().toHaveProperty("automaticUpdates");
  });

  it("exports RepositoryUpdateResponse from the public entrypoint", () => {
    type RunRepositoryUpdateRequestHasId = RunRepositoryUpdateRequest extends { id: unknown }
      ? true
      : false;

    expectTypeOf<RunRepositoryUpdateRequestHasId>().toEqualTypeOf<false>();
    expectTypeOf<RunRepositoryUpdateRequest>().toMatchTypeOf<Record<string, never>>();
    expectTypeOf<RepositoryUpdateResponse>().toMatchTypeOf<{
      noop: boolean;
      updateId: string | null;
      status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | null;
      triggerType: "MANUAL" | "WEBHOOK" | "SYSTEM";
      baseCommitSha: string | null;
      targetCommitSha: string;
      scanId: string | null;
      analysisId: string | null;
      projectContextId: string | null;
      freshnessStatus: "UNKNOWN" | "FRESH" | "STALE" | "UPDATE_FAILED";
    }>();
  });

  it("exports RepositoryUpdate read contracts from the public entrypoint", () => {
    expectTypeOf<RepositoryUpdateSummary>().toMatchTypeOf<{
      id: string;
      repositoryId: string;
      triggerType: "MANUAL" | "WEBHOOK" | "SYSTEM";
      status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
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
    }>();
    expectTypeOf<RepositoryUpdateDetail>().toEqualTypeOf<RepositoryUpdateSummary>();
    expectTypeOf<RepositoryUpdateHistoryResponse>().toHaveProperty("items");
    expectTypeOf<RepositoryUpdateHistoryResponse["pagination"]>().toMatchTypeOf<{
      page: number;
      pageSize: number;
      total: number;
      hasNextPage: boolean;
    }>();
    expectTypeOf<RepositoryCurrentUpdateResponse>().toMatchTypeOf<{
      update: RepositoryUpdateSummary | null;
    }>();
  });

  it("exports Scan limit and usage contracts from the public entrypoint", () => {
    expectTypeOf<ScanLimits>().toHaveProperty("maxFiles").toEqualTypeOf<number>();
    expectTypeOf<ScanLimits>()
      .toHaveProperty("maxIndividualNonBinaryFileSizeBytes")
      .toEqualTypeOf<number>();
    expectTypeOf<ScanLimits>()
      .toHaveProperty("maxNonBinaryContentSizeBytes")
      .toEqualTypeOf<number>();
    expectTypeOf<ScanLimits>().toHaveProperty("binaryContentFetched").toEqualTypeOf<false>();
    expectTypeOf<ScanLimits>()
      .toHaveProperty("binaryFilesCountTowardFileLimit")
      .toEqualTypeOf<true>();
    expectTypeOf<ScanUsage>().toHaveProperty("totalBytesConsidered").toEqualTypeOf<string>();
    expectTypeOf<ScanSnapshot>().toHaveProperty("usage").toEqualTypeOf<ScanUsage>();
    expectTypeOf<ScanLimitErrorResponse>()
      .toHaveProperty("code")
      .toEqualTypeOf<"SCAN_LIMIT_REACHED">();
  });
});
