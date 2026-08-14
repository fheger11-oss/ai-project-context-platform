import { describe, expect, it } from "vitest";

import type {
  AnalysisComponentResult,
  AnalysisResultContext
} from "../contracts/analysis-result.contract.js";
import { InconsistentAnalysisResultContextError } from "../errors/inconsistent-analysis-result-context.error.js";
import type { ProjectProfile } from "../project-detection/project-profile.js";
import type {
  DependencyEdge,
  RelationshipAnalysisResult,
  SourceRelationship
} from "../relationships/source-relationship.js";
import type { SourceFileStructure } from "../source-structure/source-file-structure.js";
import type { SourceLocation } from "../source-structure/source-location.js";
import { AnalysisResultAggregator } from "./analysis-result-aggregator.js";

const context: AnalysisResultContext = {
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123"
};
const generatedAt = new Date("2026-08-14T12:00:00.000Z");
const location: SourceLocation = {
  start: 0,
  end: 10,
  startLine: 1,
  startColumn: 1,
  endLine: 1,
  endColumn: 11
};

const project: ProjectProfile = {
  ecosystems: ["TYPESCRIPT", "NODE_JS"],
  languages: [
    { language: "TYPESCRIPT", fileCount: 3 },
    { language: "MARKDOWN", fileCount: 1 }
  ],
  packageManager: {
    status: "DETECTED",
    packageManager: "PNPM",
    evidence: ["pnpm-lock.yaml"]
  },
  frameworks: [{ framework: "NESTJS", evidence: ["package.json:@nestjs/core"] }],
  manifests: [
    { path: "package.json", type: "PACKAGE_JSON", isPrimary: true },
    { path: "pnpm-lock.yaml", type: "PNPM_LOCK", isPrimary: false }
  ],
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
  issues: [{ path: "package.json", code: "MALFORMED_PACKAGE_JSON" }]
};

function component<T>(
  result: T,
  overrides: Partial<AnalysisResultContext> = {}
): AnalysisComponentResult<T> {
  return {
    ...context,
    ...overrides,
    result
  };
}

function source(path: string, issue = false): SourceFileStructure {
  return {
    path,
    language: "TYPESCRIPT",
    imports: [],
    exports: [],
    declarations: [],
    issues: issue
      ? [
          {
            code: "PARSE_ERROR",
            message: "Identifier expected."
          }
        ]
      : []
  };
}

function relationship(input: {
  sourcePath: string;
  specifier: string;
  targetPath: string | null;
  resolved?: boolean;
  targetPackageName?: string | null;
}): SourceRelationship {
  return {
    sourcePath: input.sourcePath,
    kind: "IMPORTS",
    specifier: input.specifier,
    targetKind: input.targetPath
      ? "LOCAL_FILE"
      : input.targetPackageName
        ? "PACKAGE"
        : "UNRESOLVED",
    targetPath: input.targetPath,
    targetPackageName: input.targetPackageName ?? null,
    resolved: input.resolved ?? input.targetPath !== null,
    packageDependency: input.targetPackageName
      ? {
          manifestPath: "package.json",
          version: "^11.0.0",
          type: "DEPENDENCY"
        }
      : null,
    evidence: [
      {
        kind: "IMPORT_DECLARATION",
        location,
        names: [],
        typeOnly: false
      }
    ]
  };
}

function dependency(input: {
  sourcePath: string;
  specifier: string;
  targetPath: string | null;
  packageName?: string | null;
  resolved?: boolean;
}): DependencyEdge {
  return {
    sourcePath: input.sourcePath,
    kind: "IMPORTS",
    dependencyKind: input.targetPath ? "LOCAL_FILE" : input.packageName ? "PACKAGE" : "UNRESOLVED",
    specifier: input.specifier,
    targetPath: input.targetPath,
    packageName: input.packageName ?? null,
    resolved: input.resolved ?? input.targetPath !== null,
    packageDependency: input.packageName
      ? {
          manifestPath: "package.json",
          version: "^11.0.0",
          type: "DEPENDENCY"
        }
      : null
  };
}

function relationships(
  options: Partial<RelationshipAnalysisResult> = {}
): RelationshipAnalysisResult {
  return {
    relationships: options.relationships ?? [],
    dependencies: options.dependencies ?? [],
    issues: options.issues ?? []
  };
}

function aggregate(overrides: Partial<Parameters<AnalysisResultAggregator["aggregate"]>[0]> = {}) {
  return new AnalysisResultAggregator().aggregate({
    ...context,
    analysisId: "analysis_1",
    analyzerVersion: "analysis-4.7",
    generatedAt,
    project: component(project),
    files: component([
      { path: "src/z.ts", category: "SOURCE" },
      { path: "README.md", category: "DOCUMENTATION" },
      { path: "src/a.ts", category: "SOURCE" }
    ]),
    sourceStructures: component([source("src/z.ts"), source("src/a.ts", true)]),
    relationships: component(
      relationships({
        relationships: [
          relationship({ sourcePath: "src/z.ts", specifier: "./a", targetPath: "src/a.ts" }),
          relationship({
            sourcePath: "src/a.ts",
            specifier: "@nestjs/core",
            targetPath: null,
            targetPackageName: "@nestjs/core",
            resolved: true
          }),
          relationship({
            sourcePath: "src/a.ts",
            specifier: "./missing",
            targetPath: null,
            resolved: false
          })
        ],
        dependencies: [
          dependency({ sourcePath: "src/z.ts", specifier: "./a", targetPath: "src/a.ts" }),
          dependency({
            sourcePath: "src/a.ts",
            specifier: "@nestjs/core",
            targetPath: null,
            packageName: "@nestjs/core",
            resolved: true
          }),
          dependency({
            sourcePath: "src/a.ts",
            specifier: "./missing",
            targetPath: null,
            resolved: false
          })
        ],
        issues: [
          {
            sourcePath: "src/a.ts",
            specifier: "./missing",
            code: "UNRESOLVED_LOCAL_MODULE"
          }
        ]
      })
    ),
    ...overrides
  });
}

describe("AnalysisResultAggregator", () => {
  it("produces one complete AnalysisResult while preserving scan identity and metadata", () => {
    const result = aggregate();

    expect(result).toMatchObject({
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      analyzerVersion: "analysis-4.7",
      generatedAt,
      project: expect.objectContaining({
        packageManager: {
          status: "DETECTED",
          packageManager: "PNPM",
          evidence: ["pnpm-lock.yaml"]
        }
      })
    });
    expect(result.files.map((file) => file.path)).toEqual(["README.md", "src/a.ts", "src/z.ts"]);
    expect(result.sourceStructures.map((structure) => structure.path)).toEqual([
      "src/a.ts",
      "src/z.ts"
    ]);
    expect(result.relationships).toHaveLength(3);
    expect(result.dependencies).toHaveLength(3);
  });

  it("orders files, source structures, relationships, dependencies, and issues deterministically", () => {
    const result = aggregate();

    expect(result.relationships.map((item) => `${item.sourcePath}:${item.specifier}`)).toEqual([
      "src/a.ts:./missing",
      "src/a.ts:@nestjs/core",
      "src/z.ts:./a"
    ]);
    expect(result.dependencies.map((item) => `${item.sourcePath}:${item.specifier}`)).toEqual([
      "src/a.ts:./missing",
      "src/a.ts:@nestjs/core",
      "src/z.ts:./a"
    ]);
    expect(result.issues).toEqual([
      {
        stage: "PROJECT_DETECTION",
        path: "package.json",
        code: "MALFORMED_PACKAGE_JSON"
      },
      {
        stage: "RELATIONSHIP_ANALYSIS",
        path: "src/a.ts",
        specifier: "./missing",
        code: "UNRESOLVED_LOCAL_MODULE"
      },
      {
        stage: "SOURCE_STRUCTURE",
        path: "src/a.ts",
        code: "PARSE_ERROR",
        message: "Identifier expected."
      }
    ]);
  });

  it("rejects mismatched component contexts deterministically", () => {
    expect(() =>
      aggregate({
        project: component(project, { scanId: "scan_2" })
      })
    ).toThrow(InconsistentAnalysisResultContextError);
    expect(() =>
      aggregate({
        files: component([], { repositoryId: "repository_2" })
      })
    ).toThrow(InconsistentAnalysisResultContextError);
    expect(() =>
      aggregate({
        sourceStructures: component([], { commitSha: "def456" })
      })
    ).toThrow(InconsistentAnalysisResultContextError);
  });

  it("allows empty valid component results", () => {
    expect(
      aggregate({
        project: component({ ...project, issues: [], dependencies: [], packages: [] }),
        files: component([]),
        sourceStructures: component([]),
        relationships: component(relationships())
      })
    ).toMatchObject({
      files: [],
      sourceStructures: [],
      relationships: [],
      dependencies: [],
      issues: []
    });
  });

  it("preserves unresolved relationships and removes duplicate aggregate entries by domain identity", () => {
    const unresolved = relationship({
      sourcePath: "src/a.ts",
      specifier: "./missing",
      targetPath: null,
      resolved: false
    });
    const unresolvedDependency = dependency({
      sourcePath: "src/a.ts",
      specifier: "./missing",
      targetPath: null,
      resolved: false
    });

    const result = aggregate({
      files: component([
        { path: "src/a.ts", category: "SOURCE" },
        { path: "src/a.ts", category: "SOURCE" }
      ]),
      sourceStructures: component([source("src/a.ts"), source("src/a.ts")]),
      relationships: component(
        relationships({
          relationships: [unresolved, unresolved],
          dependencies: [unresolvedDependency, unresolvedDependency],
          issues: [
            {
              sourcePath: "src/a.ts",
              specifier: "./missing",
              code: "UNRESOLVED_LOCAL_MODULE"
            },
            {
              sourcePath: "src/a.ts",
              specifier: "./missing",
              code: "UNRESOLVED_LOCAL_MODULE"
            }
          ]
        })
      )
    });

    expect(result.files).toHaveLength(1);
    expect(result.sourceStructures).toHaveLength(1);
    expect(result.relationships).toEqual([unresolved]);
    expect(result.dependencies).toEqual([unresolvedDependency]);
    expect(result.issues).toEqual([
      {
        stage: "PROJECT_DETECTION",
        path: "package.json",
        code: "MALFORMED_PACKAGE_JSON"
      },
      {
        stage: "RELATIONSHIP_ANALYSIS",
        path: "src/a.ts",
        specifier: "./missing",
        code: "UNRESOLVED_LOCAL_MODULE"
      }
    ]);
  });

  it("is deterministic for identical aggregation input", () => {
    expect(aggregate()).toEqual(aggregate());
  });
});
