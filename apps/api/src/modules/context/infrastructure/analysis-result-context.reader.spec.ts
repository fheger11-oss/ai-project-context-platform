import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { GetAnalysisResultService } from "../../analysis/application/get-analysis-result.service.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import { AnalysisResultContextReader } from "./analysis-result-context.reader.js";

const generatedAt = new Date("2026-08-17T10:00:00.000Z");

const analysis: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine@4",
  generatedAt,
  project: {
    ecosystems: ["NODE_JS"],
    languages: [{ language: "TYPESCRIPT", fileCount: 2 }],
    packageManager: {
      status: "DETECTED",
      packageManager: "PNPM",
      evidence: ["pnpm-lock.yaml"]
    },
    frameworks: [{ framework: "NESTJS", evidence: ["package.json:@nestjs/core"] }],
    manifests: [{ path: "package.json", type: "PACKAGE_JSON", isPrimary: true }],
    packages: [
      {
        path: "package.json",
        isPrimary: true,
        name: "api",
        version: "0.1.0",
        dependencies: []
      }
    ],
    dependencies: [
      {
        manifestPath: "package.json",
        name: "@nestjs/core",
        version: "^11.0.0",
        type: "DEPENDENCY"
      }
    ],
    issues: []
  },
  files: [
    { path: "package.json", category: "CONFIG" },
    { path: "src/main.ts", category: "SOURCE" }
  ],
  sourceStructures: [
    {
      path: "src/main.ts",
      language: "TYPESCRIPT",
      imports: [],
      exports: [],
      declarations: [],
      issues: []
    }
  ],
  relationships: [
    {
      sourcePath: "src/main.ts",
      kind: "IMPORTS",
      specifier: "@nestjs/core",
      targetKind: "PACKAGE",
      targetPath: null,
      targetPackageName: "@nestjs/core",
      resolved: true,
      packageDependency: {
        manifestPath: "package.json",
        version: "^11.0.0",
        type: "DEPENDENCY"
      },
      evidence: []
    }
  ],
  dependencies: [
    {
      sourcePath: "src/main.ts",
      kind: "IMPORTS",
      dependencyKind: "PACKAGE",
      specifier: "@nestjs/core",
      targetPath: null,
      packageName: "@nestjs/core",
      resolved: true,
      packageDependency: {
        manifestPath: "package.json",
        version: "^11.0.0",
        type: "DEPENDENCY"
      }
    }
  ],
  issues: [
    {
      stage: "RELATIONSHIP_ANALYSIS",
      path: "src/main.ts",
      specifier: "./missing",
      code: "UNRESOLVED_LOCAL_MODULE"
    }
  ]
};

function createReader(
  getAnalysisResultService: Partial<GetAnalysisResultService> = {
    get: vi.fn(async () => analysis)
  }
) {
  return {
    getAnalysisResultService,
    reader: new AnalysisResultContextReader(getAnalysisResultService as GetAnalysisResultService)
  };
}

describe("AnalysisResultContextReader", () => {
  it("wraps an ownership-aware persisted AnalysisResult as ContextInput", async () => {
    const { reader, getAnalysisResultService } = createReader();

    await expect(
      reader.readAnalysisForContext({ userId: "user_1", analysisId: "analysis_1" })
    ).resolves.toEqual({ analysis });
    expect(getAnalysisResultService.get).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
  });

  it("preserves the canonical AnalysisResult fields across the boundary", async () => {
    const { reader } = createReader();

    const input = await reader.readAnalysisForContext({
      userId: "user_1",
      analysisId: "analysis_1"
    });

    expect(input?.analysis).toMatchObject({
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      analyzerVersion: "analysis-engine@4",
      generatedAt,
      project: analysis.project,
      files: analysis.files,
      sourceStructures: analysis.sourceStructures,
      relationships: analysis.relationships,
      dependencies: analysis.dependencies,
      issues: analysis.issues
    });
  });

  it("returns null for missing Analysis without calling scan or repository providers", async () => {
    const get = vi.fn(async () => {
      throw new NotFoundException("Analysis was not found");
    });
    const { reader } = createReader({ get } as unknown as GetAnalysisResultService);

    await expect(
      reader.readAnalysisForContext({ userId: "user_1", analysisId: "missing" })
    ).resolves.toBeNull();
    expect(get).toHaveBeenCalledOnce();
  });

  it("returns null for inaccessible Analysis while preserving non-disclosure semantics", async () => {
    const get = vi.fn(async () => {
      throw new NotFoundException("Repository was not found");
    });
    const { reader } = createReader({ get } as unknown as GetAnalysisResultService);

    await expect(
      reader.readAnalysisForContext({ userId: "user_2", analysisId: "analysis_1" })
    ).resolves.toBeNull();
  });

  it("does not add credentials or provider state to ContextInput", async () => {
    const { reader } = createReader();

    const input = await reader.readAnalysisForContext({
      userId: "user_1",
      analysisId: "analysis_1"
    });

    expect(input).not.toHaveProperty("accessToken");
    expect(input).not.toHaveProperty("refreshToken");
    expect(input).not.toHaveProperty("credential");
    expect(input).not.toHaveProperty("repositoryProvider");
    expect(input).not.toHaveProperty("scanFile");
  });
});
