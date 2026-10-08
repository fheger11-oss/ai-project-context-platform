import { describe, expect, it } from "vitest";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import { projectContextSemantic } from "./project-context-semantic.projector.js";

const firstLocation = location(0, 20, 1);
const secondLocation = location(21, 44, 2);

const analysis: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine-4.10",
  generatedAt: new Date("2026-10-07T10:00:00.000Z"),
  project: {
    ecosystems: ["NODE_JS", "TYPESCRIPT"],
    languages: [{ language: "TYPESCRIPT", fileCount: 2 }],
    packageManager: { status: "DETECTED", packageManager: "PNPM", evidence: ["pnpm-lock.yaml"] },
    frameworks: [],
    manifests: [{ path: "package.json", type: "PACKAGE_JSON", isPrimary: true }],
    packages: [
      {
        path: "package.json",
        isPrimary: true,
        name: "semantic-test",
        version: "1.0.0",
        dependencies: [
          { manifestPath: "package.json", name: "pkg", version: "^1.0.0", type: "DEPENDENCY" }
        ],
        scripts: [{ manifestPath: "package.json", name: "test", command: "vitest" }],
        publicSurfaceDeclarations: [
          {
            manifestPath: "package.json",
            sourceField: "EXPORTS",
            subpath: ".",
            selectorPath: [{ kind: "CONDITION", value: "default" }],
            disposition: "TARGET",
            declaredTarget: "./dist/index.js"
          }
        ]
      }
    ],
    dependencies: [
      { manifestPath: "package.json", name: "pkg", version: "^1.0.0", type: "DEPENDENCY" }
    ],
    issues: []
  },
  files: [
    { path: "src/a:[special].ts", category: "SOURCE" },
    { path: "src/b.ts", category: "SOURCE" }
  ],
  sourceStructures: [
    {
      path: "src/a:[special].ts",
      language: "TYPESCRIPT",
      declarations: [
        {
          name: "duplicate",
          kind: "FUNCTION",
          location: firstLocation,
          containerName: null,
          visibility: null
        },
        {
          name: "duplicate",
          kind: "FUNCTION",
          location: secondLocation,
          containerName: null,
          visibility: null
        }
      ],
      imports: [
        {
          moduleSpecifier: "./b?value=one:two",
          defaultImport: null,
          namespaceImport: null,
          namedImports: [{ name: "X", alias: "LocalX" }],
          typeOnly: false,
          location: firstLocation
        },
        {
          moduleSpecifier: "./b?value=one:two",
          defaultImport: null,
          namespaceImport: null,
          namedImports: [{ name: "Y", alias: null }],
          typeOnly: true,
          location: secondLocation
        }
      ],
      exports: [
        {
          kind: "NAMED",
          name: null,
          moduleSpecifier: "./b?value=one:two",
          namedExports: [{ name: "X", alias: "PublicX" }],
          location: secondLocation
        }
      ],
      issues: [{ code: "PARSE_ERROR", message: "preserved" }]
    },
    {
      path: "src/b.ts",
      language: "TYPESCRIPT",
      declarations: [],
      imports: [],
      exports: [],
      issues: []
    }
  ],
  relationships: [
    {
      sourcePath: "src/a:[special].ts",
      kind: "RE_EXPORTS",
      specifier: "./b?value=one:two",
      targetKind: "LOCAL_FILE",
      targetPath: "src/b.ts",
      targetPackageName: null,
      resolved: true,
      packageDependency: null,
      evidence: [
        {
          kind: "EXPORT_DECLARATION",
          location: secondLocation,
          names: ["PublicX"],
          typeOnly: false
        }
      ]
    },
    {
      sourcePath: "src/a:[special].ts",
      kind: "IMPORTS",
      specifier: "./b?value=one:two",
      targetKind: "LOCAL_FILE",
      targetPath: "src/b.ts",
      targetPackageName: null,
      resolved: true,
      packageDependency: null,
      evidence: [
        { kind: "IMPORT_DECLARATION", location: secondLocation, names: ["Y"], typeOnly: true },
        { kind: "IMPORT_DECLARATION", location: firstLocation, names: ["LocalX"], typeOnly: false }
      ]
    }
  ],
  dependencies: [],
  issues: []
};

describe("projectContextSemantic", () => {
  it("preserves complete addressable AnalysisResult structures without changing relationship semantics", () => {
    const semantic = projectContextSemantic(analysis);

    expect(semantic.packages).toHaveLength(1);
    expect(semantic.packages[0]?.publicSurfaceDeclarations).toEqual(
      analysis.project.packages[0]?.publicSurfaceDeclarations
    );
    expect(semantic.packages[0]?.publicSurfaceDeclarations).not.toBe(
      analysis.project.packages[0]?.publicSurfaceDeclarations
    );
    expect(semantic.files).toHaveLength(2);
    expect(semantic.symbols).toHaveLength(2);
    expect(new Set(semantic.symbols.map((symbol) => symbol.id)).size).toBe(2);
    expect(semantic.imports).toHaveLength(2);
    expect(semantic.exports).toHaveLength(1);
    expect(semantic.relationships.map((relationship) => relationship.kind)).toEqual([
      "IMPORTS",
      "RE_EXPORTS"
    ]);
    expect(semantic.relationships[0]?.evidence).toHaveLength(2);
    expect(semantic.relationships[0]?.evidence.map((evidence) => evidence.names)).toEqual([
      ["LocalX"],
      ["Y"]
    ]);
    expect(semantic.files[0]).toMatchObject({
      path: "src/a:[special].ts",
      language: "TYPESCRIPT",
      parseIssues: [{ code: "PARSE_ERROR", message: "preserved" }]
    });
  });

  it("uses encoded deterministic occurrence identities and deterministic ordering", () => {
    const first = projectContextSemantic(analysis);
    const second = projectContextSemantic({
      ...analysis,
      files: [...analysis.files].reverse(),
      sourceStructures: [...analysis.sourceStructures].reverse(),
      relationships: [...analysis.relationships].reverse()
    });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.symbols.every((symbol) => symbol.id.includes("%"))).toBe(true);
    expect(
      first.relationships.every((relationship) => relationship.id.startsWith("relationship:"))
    ).toBe(true);
  });

  it("does not mutate AnalysisResult", () => {
    const before = JSON.stringify(analysis);
    projectContextSemantic(analysis);
    expect(JSON.stringify(analysis)).toBe(before);
  });
});

function location(start: number, end: number, line: number) {
  return {
    start,
    end,
    startLine: line,
    startColumn: 1,
    endLine: line,
    endColumn: end - start + 1
  };
}
