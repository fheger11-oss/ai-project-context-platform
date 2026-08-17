import { describe, expect, expectTypeOf, it } from "vitest";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type {
  AnalysisContextReader,
  ReadAnalysisForContextInput
} from "./contracts/analysis-context-reader.contract.js";
import type { ContextGenerator } from "./contracts/context-generator.contract.js";
import type { ContextInput } from "./contracts/context-input.contract.js";
import type { ProjectContext } from "./project-context.js";

describe("Context contracts", () => {
  it("models ContextInput around AnalysisResult only", () => {
    expectTypeOf<ContextInput>().toEqualTypeOf<{
      analysis: AnalysisResult;
    }>();
  });

  it("does not require scan content, provider, credentials, or transport values in ContextInput", () => {
    expectTypeOf<ContextInput>().not.toHaveProperty("scan");
    expectTypeOf<ContextInput>().not.toHaveProperty("scanFile");
    expectTypeOf<ContextInput>().not.toHaveProperty("contentReader");
    expectTypeOf<ContextInput>().not.toHaveProperty("repositoryProvider");
    expectTypeOf<ContextInput>().not.toHaveProperty("authorization");
    expectTypeOf<ContextInput>().not.toHaveProperty("credential");
    expectTypeOf<ContextInput>().not.toHaveProperty("token");
    expectTypeOf<ContextInput>().not.toHaveProperty("request");
    expectTypeOf<ContextInput>().not.toHaveProperty("headers");
  });

  it("defines an Analysis-to-Context reader boundary without persistence details", () => {
    expectTypeOf<ReadAnalysisForContextInput>().toEqualTypeOf<{
      userId: string;
      analysisId: string;
    }>();
    expectTypeOf<AnalysisContextReader>().toMatchTypeOf<{
      readAnalysisForContext(input: ReadAnalysisForContextInput): Promise<ContextInput | null>;
    }>();
  });

  it("defines the future deterministic generation boundary", () => {
    expectTypeOf<ContextGenerator>().toMatchTypeOf<{
      generate(input: ContextInput): Promise<ProjectContext>;
    }>();
  });

  it("can pass an AnalysisResult through ContextInput without scan or provider objects", () => {
    const analysis = {
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      analyzerVersion: "analysis-engine@1",
      generatedAt: new Date("2026-08-17T10:00:00.000Z"),
      project: {
        ecosystems: [],
        languages: [],
        packageManager: { status: "UNKNOWN", evidence: [] },
        frameworks: [],
        manifests: [],
        packages: [],
        dependencies: [],
        issues: []
      },
      files: [],
      sourceStructures: [],
      relationships: [],
      dependencies: [],
      issues: []
    } satisfies AnalysisResult;

    const input: ContextInput = { analysis };

    expect(input.analysis.analysisId).toBe("analysis_1");
    expect(input.analysis.scanId).toBe("scan_1");
  });
});
