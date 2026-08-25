import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnalysisResultResponse } from "@ai-context/contracts";

import { AnalysisResultDetails } from "./analysis-result-details";

const result: AnalysisResultResponse = {
  analysisId: "analysis_1234567890_long_value",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "fffed9f5ecab4ebb9a861f357e134b8e16bb4d92",
  analyzerVersion: "analysis-engine-4.10",
  generatedAt: "2026-08-14T12:00:00.000Z",
  project: {
    ecosystems: ["NODE_JS", "TYPESCRIPT"],
    languages: [
      { language: "TYPESCRIPT", fileCount: 2 },
      { language: "MARKDOWN", fileCount: 1 }
    ],
    packageManager: {
      status: "DETECTED",
      packageManager: "PNPM",
      evidence: ["pnpm-lock.yaml"]
    },
    frameworks: [
      { framework: "REACT", evidence: ["package.json"] },
      { framework: "NESTJS", evidence: ["apps/api/package.json"] }
    ],
    manifests: [
      { path: "package.json", type: "PACKAGE_JSON", isPrimary: true },
      { path: "apps/api/package.json", type: "PACKAGE_JSON", isPrimary: false }
    ],
    packages: [
      {
        path: "package.json",
        isPrimary: true,
        name: "ai-context",
        version: "0.1.0",
        dependencies: []
      }
    ],
    dependencies: [
      {
        manifestPath: "package.json",
        name: "react",
        version: "^19.0.0",
        type: "DEPENDENCY"
      }
    ],
    issues: [{ path: "bad/package.json", code: "MALFORMED_PACKAGE_JSON" }]
  },
  files: [
    { path: "src/main.ts", category: "SOURCE" },
    { path: "README.md", category: "DOCUMENTATION" }
  ],
  sourceStructures: [
    {
      path: "src/main.ts",
      language: "TYPESCRIPT",
      declarations: [
        {
          name: "bootstrap",
          kind: "FUNCTION",
          containerName: null,
          visibility: null,
          location: {
            start: 0,
            end: 10,
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10
          }
        }
      ],
      imports: [
        {
          moduleSpecifier: "./app",
          defaultImport: null,
          namespaceImport: null,
          namedImports: [{ name: "App", alias: null }],
          typeOnly: false,
          location: {
            start: 0,
            end: 20,
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 20
          }
        }
      ],
      exports: [
        {
          kind: "DECLARATION",
          name: "bootstrap",
          moduleSpecifier: null,
          namedExports: [],
          location: {
            start: 0,
            end: 10,
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10
          }
        }
      ],
      issues: [{ code: "PARSE_ERROR", message: "Unexpected token" }]
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
    }
  ],
  dependencies: [
    {
      sourcePath: "src/main.ts",
      kind: "IMPORTS",
      dependencyKind: "PACKAGE",
      specifier: "react",
      targetPath: null,
      packageName: "react",
      resolved: true,
      packageDependency: {
        manifestPath: "package.json",
        version: "^19.0.0",
        type: "DEPENDENCY"
      }
    },
    {
      sourcePath: "src/main.ts",
      kind: "IMPORTS",
      dependencyKind: "UNRESOLVED",
      specifier: "unknown-package",
      targetPath: null,
      packageName: null,
      resolved: false,
      packageDependency: null
    }
  ],
  issues: [
    {
      stage: "RELATIONSHIP_ANALYSIS",
      path: "src/main.ts",
      specifier: "unknown-package",
      code: "UNKNOWN_PACKAGE_DEPENDENCY"
    }
  ]
};

describe("AnalysisResultDetails", () => {
  it("renders all AnalysisResult sections from backend-owned data", () => {
    const markup = renderToStaticMarkup(<AnalysisResultDetails result={result} />);

    expect(markup).toContain("Project intelligence");
    expect(markup).toContain("Technology stack");
    expect(markup).toContain("Files");
    expect(markup).toContain("Source structures");
    expect(markup).toContain("Relationships");
    expect(markup).toContain("Dependencies");
    expect(markup).toContain("Issues");
    expect(markup).toContain("analysis_1234567890_long_value");
    expect(markup).toContain("Node Js");
    expect(markup).toContain("Pnpm");
    expect(markup).toContain("React");
    expect(markup).toContain("src/main.ts");
    expect(markup).toContain("Source");
    expect(markup).toContain("Function bootstrap L1");
    expect(markup).toContain("./app");
    expect(markup).toContain("src/app.ts");
    expect(markup).toContain("unknown-package");
    expect(markup).toContain("Unknown Package Dependency");
  });

  it("renders empty collections as empty states rather than errors", () => {
    const emptyResult: AnalysisResultResponse = {
      ...result,
      project: {
        ...result.project,
        ecosystems: [],
        languages: [],
        frameworks: [],
        manifests: [],
        packages: [],
        dependencies: [],
        issues: [],
        packageManager: {
          status: "UNKNOWN",
          evidence: []
        }
      },
      files: [],
      sourceStructures: [],
      relationships: [],
      dependencies: [],
      issues: []
    };
    const markup = renderToStaticMarkup(<AnalysisResultDetails result={emptyResult} />);

    expect(markup).toContain("No manifests detected.");
    expect(markup).toContain("No file classifications.");
    expect(markup).toContain("No source structures.");
    expect(markup).toContain("No relationships.");
    expect(markup).toContain("No dependencies.");
    expect(markup).toContain("No analysis issues.");
  });

  it("keeps long paths and specifiers visible without exposing credential-shaped values", () => {
    const longPath = "src/some/extremely/long/path/that/should/not/break/layout/main.ts";
    const markup = renderToStaticMarkup(
      <AnalysisResultDetails
        result={{
          ...result,
          files: [{ path: longPath, category: "SOURCE" }]
        }}
      />
    );

    expect(markup).toContain(longPath);
    expect(markup).not.toContain("accessToken");
    expect(markup).not.toContain("refreshToken");
    expect(markup).not.toContain("githubToken");
  });
});
