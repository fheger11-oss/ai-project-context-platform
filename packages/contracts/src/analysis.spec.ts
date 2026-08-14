import { describe, expectTypeOf, it } from "vitest";

import type {
  AnalysisDependencyEdge,
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
