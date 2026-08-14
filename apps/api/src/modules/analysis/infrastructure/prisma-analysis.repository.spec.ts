import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import type { AnalysisResult } from "../domain/contracts/analysis-result.contract.js";
import { AnalysisPersistenceError } from "../domain/errors/analysis-persistence.error.js";
import { InvalidPersistedAnalysisResultError } from "../domain/errors/invalid-persisted-analysis-result.error.js";
import { PrismaAnalysisRepository } from "./prisma-analysis.repository.js";

const generatedAt = new Date("2026-08-14T12:00:00.000Z");
const createdAt = new Date("2026-08-14T12:00:01.000Z");
const updatedAt = new Date("2026-08-14T12:00:02.000Z");

const analysisResult: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-4.9",
  generatedAt,
  project: {
    ecosystems: ["NODE_JS", "TYPESCRIPT"],
    languages: [{ language: "TYPESCRIPT", fileCount: 1 }],
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
        dependencies: [
          {
            manifestPath: "package.json",
            name: "@nestjs/core",
            version: "^11.0.0",
            type: "DEPENDENCY"
          }
        ]
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
    { path: "README.md", category: "DOCUMENTATION" },
    { path: "src/main.ts", category: "SOURCE" }
  ],
  sourceStructures: [
    {
      path: "src/main.ts",
      language: "TYPESCRIPT",
      imports: [
        {
          moduleSpecifier: "./app",
          defaultImport: null,
          namespaceImport: null,
          namedImports: [{ name: "app", alias: null }],
          typeOnly: false,
          location: {
            start: 0,
            end: 24,
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 25
          }
        }
      ],
      exports: [
        {
          kind: "DECLARATION",
          name: "main",
          moduleSpecifier: null,
          namedExports: [],
          location: {
            start: 25,
            end: 48,
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 24
          }
        }
      ],
      declarations: [
        {
          name: "main",
          kind: "FUNCTION",
          containerName: null,
          visibility: null,
          location: {
            start: 32,
            end: 36,
            startLine: 2,
            startColumn: 8,
            endLine: 2,
            endColumn: 12
          }
        }
      ],
      issues: [
        {
          code: "PARSE_ERROR",
          message: "Identifier expected."
        }
      ]
    }
  ],
  relationships: [
    {
      sourcePath: "src/main.ts",
      kind: "IMPORTS",
      specifier: "./app",
      targetKind: "LOCAL_FILE",
      targetPath: "src/app.ts",
      targetPackageName: null,
      resolved: true,
      packageDependency: null,
      evidence: []
    },
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
      dependencyKind: "LOCAL_FILE",
      specifier: "./app",
      targetPath: "src/app.ts",
      packageName: null,
      resolved: true,
      packageDependency: null
    }
  ],
  issues: [
    {
      stage: "SOURCE_STRUCTURE",
      path: "src/main.ts",
      code: "PARSE_ERROR",
      message: "Identifier expected."
    }
  ]
};

function stored(result = analysisResult) {
  return {
    id: result.analysisId,
    scanId: result.scanId,
    repositoryId: result.repositoryId,
    status: "COMPLETED",
    analyzerVersion: result.analyzerVersion,
    commitSha: result.commitSha,
    generatedAt: result.generatedAt,
    project: result.project,
    files: result.files,
    sourceStructures: result.sourceStructures,
    relationships: result.relationships,
    dependencies: result.dependencies,
    issues: result.issues,
    startedAt: null,
    completedAt: result.generatedAt,
    createdAt,
    updatedAt
  };
}

function createRepository(
  options: {
    findUniqueResult?: unknown;
    scan?: { repositoryId: string; commitSha: string } | null;
  } = {}
) {
  const upsert = vi.fn(async (query) => ({
    ...stored(),
    ...query.create,
    ...query.update
  }));
  const findUnique = vi.fn(async () =>
    Object.hasOwn(options, "findUniqueResult") ? options.findUniqueResult : stored()
  );
  const findFirst = vi.fn(async () => stored());
  const findMany = vi.fn(async () => [
    {
      id: "analysis_new",
      scanId: "scan_1",
      analyzerVersion: "analysis-4.9",
      generatedAt: new Date("2026-08-14T12:05:00.000Z"),
      commitSha: "abc123"
    },
    {
      id: "analysis_old",
      scanId: "scan_1",
      analyzerVersion: "analysis-4.9",
      generatedAt,
      commitSha: "abc123"
    }
  ]);
  const scanFindUnique = vi.fn(
    async () =>
      options.scan ?? {
        repositoryId: "repository_1",
        commitSha: "abc123"
      }
  );
  const analysisDelegate = {
    upsert,
    findUnique,
    findFirst,
    findMany
  };
  const scanDelegate = {
    findUnique: scanFindUnique
  };
  const prisma = {
    analysis: analysisDelegate,
    scan: scanDelegate
  } as unknown as PrismaService;

  return {
    analysis: analysisDelegate,
    scan: scanDelegate,
    repository: new PrismaAnalysisRepository(prisma)
  };
}

describe("PrismaAnalysisRepository", () => {
  it("persists and reconstructs a complete AnalysisResult", async () => {
    const { repository, analysis, scan } = createRepository();

    await expect(repository.saveResult(analysisResult)).resolves.toEqual(analysisResult);
    expect(scan.findUnique).toHaveBeenCalledWith({
      where: { id: "scan_1" },
      select: {
        repositoryId: true,
        commitSha: true
      }
    });
    expect(analysis.upsert).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      create: expect.objectContaining({
        id: "analysis_1",
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        analyzerVersion: "analysis-4.9",
        generatedAt,
        project: analysisResult.project,
        files: analysisResult.files,
        sourceStructures: analysisResult.sourceStructures,
        relationships: analysisResult.relationships,
        dependencies: analysisResult.dependencies,
        issues: analysisResult.issues
      }),
      update: expect.objectContaining({
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        analyzerVersion: "analysis-4.9",
        generatedAt
      })
    });
  });

  it("returns null for a missing analysis result", async () => {
    const { repository } = createRepository({ findUniqueResult: null });

    await expect(repository.findResultById("missing")).resolves.toBeNull();
  });

  it("lists lightweight scan analysis history without loading full result JSON", async () => {
    const { repository, analysis } = createRepository();

    await expect(repository.findHistoryByScanId("scan_1")).resolves.toEqual([
      {
        analysisId: "analysis_new",
        scanId: "scan_1",
        analyzerVersion: "analysis-4.9",
        generatedAt: new Date("2026-08-14T12:05:00.000Z"),
        commitSha: "abc123"
      },
      {
        analysisId: "analysis_old",
        scanId: "scan_1",
        analyzerVersion: "analysis-4.9",
        generatedAt,
        commitSha: "abc123"
      }
    ]);
    expect(analysis.findMany).toHaveBeenCalledWith({
      where: {
        scanId: "scan_1",
        status: "COMPLETED",
        generatedAt: { not: null }
      },
      select: {
        id: true,
        scanId: true,
        analyzerVersion: true,
        generatedAt: true,
        commitSha: true
      },
      orderBy: [{ generatedAt: "desc" }, { id: "desc" }]
    });
    expect(JSON.stringify(analysis.findMany.mock.calls)).not.toMatch(
      /project|files|sourceStructures|relationships|dependencies|issues/
    );
  });

  it("preserves identity, version, timestamp, nested data, and deterministic ordering", async () => {
    const { repository } = createRepository();

    await expect(repository.findResultById("analysis_1")).resolves.toEqual(analysisResult);
  });

  it("is idempotent for the same analysis identity", async () => {
    const { repository, analysis } = createRepository();

    await repository.saveResult(analysisResult);
    await repository.saveResult(analysisResult);

    expect(analysis.upsert).toHaveBeenCalledTimes(2);
    expect(analysis.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: "analysis_1" } })
    );
    expect(analysis.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: "analysis_1" } })
    );
  });

  it("keeps multiple scans isolated by analysis identity", async () => {
    const scanTwoResult: AnalysisResult = {
      ...analysisResult,
      analysisId: "analysis_2",
      scanId: "scan_2",
      repositoryId: "repository_2",
      commitSha: "def456"
    };
    const first = createRepository();
    const second = createRepository({
      scan: {
        repositoryId: "repository_2",
        commitSha: "def456"
      }
    });

    await first.repository.saveResult(analysisResult);
    await second.repository.saveResult(scanTwoResult);

    expect(first.analysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "analysis_1" } })
    );
    expect(second.analysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "analysis_2" } })
    );
  });

  it("rejects persistence when the referenced scan identity does not match the result", async () => {
    const { repository } = createRepository({
      scan: {
        repositoryId: "repository_2",
        commitSha: "abc123"
      }
    });

    await expect(repository.saveResult(analysisResult)).rejects.toThrow(AnalysisPersistenceError);
  });

  it("rejects malformed persisted JSON-backed sections explicitly", async () => {
    const { repository } = createRepository({
      findUniqueResult: {
        ...stored(),
        files: null
      }
    });

    await expect(repository.findResultById("analysis_1")).rejects.toThrow(
      InvalidPersistedAnalysisResultError
    );
  });

  it("does not persist credential-shaped fields in the analysis result payload", async () => {
    const { repository, analysis } = createRepository();

    await repository.saveResult(analysisResult);

    expect(JSON.stringify(analysis.upsert.mock.calls)).not.toMatch(
      /accessToken|refreshToken|githubToken|authorization|credential/i
    );
  });
});
