import { describe, expectTypeOf, it } from "vitest";

import type {
  AnalysisHistoryResponse,
  AnalysisResultResponse,
  AiExportResponse,
  CreateAnalysisRequest,
  DocumentHistoryResponse,
  DashboardProjectsResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest,
  RepositoryStateSummary,
  RepositoryUpdateResponse,
  ScanLimitErrorResponse,
  ScanLimits,
  ScanSnapshot,
  ScanUsage
} from "./index.js";

describe("contracts package exports", () => {
  it("exports Analysis API contracts from the public entrypoint", () => {
    expectTypeOf<CreateAnalysisRequest>().toMatchTypeOf<{ scanId: string }>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("analysisId").toEqualTypeOf<string>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("generatedAt").toEqualTypeOf<string>();
    expectTypeOf<AnalysisHistoryResponse["items"]>().toMatchTypeOf<readonly unknown[]>();
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

  it("exports RepositoryUpdateResponse from the public entrypoint", () => {
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

  it("exports Scan limit and usage contracts from the public entrypoint", () => {
    expectTypeOf<ScanLimits>().toHaveProperty("maxFiles").toEqualTypeOf<number>();
    expectTypeOf<ScanUsage>().toHaveProperty("totalBytesConsidered").toEqualTypeOf<string>();
    expectTypeOf<ScanSnapshot>().toHaveProperty("usage").toEqualTypeOf<ScanUsage>();
    expectTypeOf<ScanLimitErrorResponse>()
      .toHaveProperty("code")
      .toEqualTypeOf<"SCAN_LIMIT_REACHED">();
  });
});
