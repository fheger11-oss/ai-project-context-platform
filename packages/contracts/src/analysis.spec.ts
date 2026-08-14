import { describe, expectTypeOf, it } from "vitest";

import type {
  AnalysisDependencyEdge,
  AnalysisHistoryResponse,
  AnalysisIssue,
  AnalysisProjectProfile,
  AnalysisResultResponse,
  AnalysisSourceFileStructure,
  AnalysisSourceRelationship,
  CreateAnalysisRequest
} from "./analysis.js";

describe("Analysis API contracts", () => {
  it("exports the create analysis request contract", () => {
    expectTypeOf<CreateAnalysisRequest>().toEqualTypeOf<{
      scanId: string;
    }>();
  });

  it("models generatedAt as the serialized HTTP response type", () => {
    expectTypeOf<AnalysisResultResponse["generatedAt"]>().toEqualTypeOf<string>();
    expectTypeOf<AnalysisHistoryResponse["items"][number]["generatedAt"]>().toEqualTypeOf<string>();
  });

  it("models lightweight scan analysis history without full result payloads", () => {
    expectTypeOf<AnalysisHistoryResponse>().toEqualTypeOf<{
      items: readonly {
        analysisId: string;
        scanId: string;
        analyzerVersion: string;
        generatedAt: string;
        commitSha: string;
      }[];
    }>();
    expectTypeOf<AnalysisHistoryResponse["items"][number]>().not.toHaveProperty("project");
    expectTypeOf<AnalysisHistoryResponse["items"][number]>().not.toHaveProperty("files");
    expectTypeOf<AnalysisHistoryResponse["items"][number]>().not.toHaveProperty("sourceStructures");
    expectTypeOf<AnalysisHistoryResponse["items"][number]>().not.toHaveProperty("relationships");
    expectTypeOf<AnalysisHistoryResponse["items"][number]>().not.toHaveProperty("dependencies");
    expectTypeOf<AnalysisHistoryResponse["items"][number]>().not.toHaveProperty("issues");
  });

  it("models the nested public AnalysisResult response structures", () => {
    expectTypeOf<AnalysisResultResponse>().toMatchTypeOf<{
      analysisId: string;
      scanId: string;
      repositoryId: string;
      commitSha: string;
      analyzerVersion: string;
      generatedAt: string;
      project: AnalysisProjectProfile;
      files: readonly { path: string; category: string }[];
      sourceStructures: readonly AnalysisSourceFileStructure[];
      relationships: readonly AnalysisSourceRelationship[];
      dependencies: readonly AnalysisDependencyEdge[];
      issues: readonly AnalysisIssue[];
    }>();
  });
});
