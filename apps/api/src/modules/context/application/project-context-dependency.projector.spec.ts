import { describe, expect, it } from "vitest";

import type { ArchitecturalModule } from "../domain/project-context-architecture.js";
import type {
  ProjectContextSemantic,
  SemanticPackage,
  SemanticRelationship
} from "../domain/project-context-semantic.js";
import { projectArchitectureDependencies } from "./project-context-dependency.projector.js";

describe("projectArchitectureDependencies", () => {
  it.each(["IMPORTS", "RE_EXPORTS"] as const)(
    "creates a directed dependency for a resolved local %s relationship",
    (kind) => {
      const dependencies = projectArchitectureDependencies(
        semantic([relationship("relationship:1", kind, "file:a", "file:b")]),
        modules()
      );

      expect(dependencies).toEqual([
        expect.objectContaining({
          sourceModuleId: "module:a",
          targetModuleId: "module:b",
          relationshipCount: 1,
          sourceFileCount: 1,
          targetFileCount: 1,
          relationshipKinds: [kind],
          relationshipIds: ["relationship:1"],
          resolution: "RESOLVED"
        })
      ]);
    }
  );

  it("aggregates distinct relationships without counting evidence occurrences", () => {
    const first = relationship("relationship:2", "RE_EXPORTS", "file:a2", "file:b");
    const repeatedEvidence = {
      ...relationship("relationship:1", "IMPORTS", "file:a", "file:b"),
      evidence: [evidence("evidence:1"), evidence("evidence:2")]
    };
    const third = relationship("relationship:3", "IMPORTS", "file:a", "file:b2");
    const dependencies = projectArchitectureDependencies(
      semantic([first, repeatedEvidence, third]),
      modules({ a: ["file:a", "file:a2"], b: ["file:b", "file:b2"] })
    );

    expect(dependencies[0]).toMatchObject({
      relationshipCount: 3,
      sourceFileCount: 2,
      targetFileCount: 2,
      relationshipKinds: ["IMPORTS", "RE_EXPORTS"],
      relationshipIds: ["relationship:1", "relationship:2", "relationship:3"]
    });
  });

  it("excludes unresolved, missing-target, self, unmapped, and ambiguous relationships", () => {
    const unresolved = {
      ...relationship("unresolved", "IMPORTS", "file:a", "file:b"),
      resolved: false
    };
    const missingTarget = {
      ...relationship("missing-target", "IMPORTS", "file:a", "file:b"),
      targetFileId: null,
      targetPath: null
    };
    const candidates = [
      ...modules({ a: ["file:a", "file:self"], b: ["file:b"] }),
      module("module:ambiguous-1", "BACKEND_FEATURE", "root/aaaa", "package:a", ["file:ambiguous"]),
      module("module:ambiguous-2", "BACKEND_FEATURE", "root/bbbb", "package:a", ["file:ambiguous"])
    ];
    const relationships = [
      unresolved,
      missingTarget,
      relationship("self", "IMPORTS", "file:a", "file:self"),
      relationship("unmapped-source", "IMPORTS", "file:missing", "file:b"),
      relationship("unmapped-target", "IMPORTS", "file:a", "file:missing"),
      relationship("ambiguous", "IMPORTS", "file:ambiguous", "file:b")
    ];

    expect(projectArchitectureDependencies(semantic(relationships), candidates)).toEqual([]);
  });

  it("creates workspace-package edges only for an exact package declared by the source owner", () => {
    const packageRelationship = relationship("relationship:workspace", "IMPORTS", "file:a", null, {
      targetKind: "PACKAGE",
      targetPackageName: "@workspace/target",
      specifier: "@workspace/target/subpath",
      packageDependency: {
        manifestPath: "wrong/package.json",
        version: "wrong",
        type: "DEV_DEPENDENCY"
      }
    });
    const projectSemantic = semantic(
      [packageRelationship],
      [
        semanticPackage("package:a", "apps/a/package.json", "@workspace/a", ["@workspace/target"]),
        semanticPackage("package:b", "packages/target/package.json", "@workspace/target")
      ]
    );
    const candidates = [
      ...modules(),
      module("workspace:b", "WORKSPACE_PACKAGE", "packages/target", "package:b", ["file:b"])
    ];

    expect(projectArchitectureDependencies(projectSemantic, candidates)).toEqual([
      expect.objectContaining({
        sourceModuleId: "module:a",
        targetModuleId: "workspace:b",
        targetFileCount: 0,
        relationshipIds: ["relationship:workspace"]
      })
    ]);
  });

  it("excludes external, undeclared, unresolved, and duplicate-name package targets", () => {
    const relationships = [
      packageRelationship("external", "external"),
      packageRelationship("undeclared", "@workspace/undeclared"),
      { ...packageRelationship("unresolved", "@workspace/target"), resolved: false },
      packageRelationship("duplicate", "@workspace/duplicate")
    ];
    const projectSemantic = semantic(relationships, [
      semanticPackage("package:a", "apps/a/package.json", "@workspace/a", [
        "@workspace/target",
        "@workspace/duplicate"
      ]),
      semanticPackage("package:b", "packages/b/package.json", "@workspace/target"),
      semanticPackage("package:d1", "packages/d1/package.json", "@workspace/duplicate"),
      semanticPackage("package:d2", "packages/d2/package.json", "@workspace/duplicate")
    ]);
    const candidates = [
      ...modules(),
      module("workspace:b", "WORKSPACE_PACKAGE", "packages/b", "package:b", []),
      module("workspace:d1", "WORKSPACE_PACKAGE", "packages/d1", "package:d1", []),
      module("workspace:d2", "WORKSPACE_PACKAGE", "packages/d2", "package:d2", [])
    ];

    expect(projectArchitectureDependencies(projectSemantic, candidates)).toEqual([]);
  });

  it("uses stable structured IDs and deterministic ordering", () => {
    const relationships = [
      relationship("relationship:2", "IMPORTS", "file:b", "file:a"),
      relationship("relationship:1", "IMPORTS", "file:a", "file:b")
    ];
    const first = projectArchitectureDependencies(semantic(relationships), modules());
    const second = projectArchitectureDependencies(
      semantic([...relationships].reverse()),
      [...modules()].reverse()
    );

    expect(second).toEqual(first);
    expect(first.every((dependency) => dependency.id.startsWith("architecture-dependency:"))).toBe(
      true
    );
    expect(first[0]?.id).toContain(encodeURIComponent(JSON.stringify(["module:a", "module:b"])));
  });
});

function modules(overrides: { a?: string[]; b?: string[] } = {}): ArchitecturalModule[] {
  return [
    module("workspace:a", "WORKSPACE_PACKAGE", "apps/a", "package:a", [
      ...(overrides.a ?? ["file:a", "file:a2"])
    ]),
    module("module:a", "BACKEND_FEATURE", "apps/a/src/modules/a", "package:a", [
      ...(overrides.a ?? ["file:a", "file:a2"])
    ]),
    module("workspace:b", "WORKSPACE_PACKAGE", "apps/b", "package:b", [
      ...(overrides.b ?? ["file:b", "file:b2"])
    ]),
    module("module:b", "BACKEND_FEATURE", "apps/b/src/modules/b", "package:b", [
      ...(overrides.b ?? ["file:b", "file:b2"])
    ])
  ];
}

function module(
  id: string,
  kind: ArchitecturalModule["kind"],
  rootPath: string,
  packageId: string,
  fileIds: string[]
): ArchitecturalModule {
  return {
    id,
    kind,
    name: id,
    rootPath,
    packageId,
    parentModuleId: kind === "WORKSPACE_PACKAGE" ? null : `workspace:${packageId}`,
    fileIds,
    layers: [],
    sourceExports: [],
    frameworkSignals: [],
    inference: kind === "WORKSPACE_PACKAGE" ? "OBSERVED" : "INFERRED",
    confidence: kind === "WORKSPACE_PACKAGE" ? "HIGH" : "MEDIUM",
    evidence: []
  };
}

function semantic(
  relationships: SemanticRelationship[],
  packages: SemanticPackage[] = [
    semanticPackage("package:a", "apps/a/package.json", "@workspace/a"),
    semanticPackage("package:b", "apps/b/package.json", "@workspace/b")
  ]
): ProjectContextSemantic {
  return { packages, files: [], symbols: [], imports: [], exports: [], relationships };
}

function semanticPackage(
  id: string,
  manifestPath: string,
  name: string,
  dependencies: string[] = []
): SemanticPackage {
  return {
    id,
    manifestPath,
    name,
    version: "1.0.0",
    isPrimary: false,
    dependencies: dependencies.map((dependency) => ({
      manifestPath,
      name: dependency,
      version: "workspace:*",
      type: "DEPENDENCY"
    })),
    scripts: [],
    publicSurfaceDeclarations: []
  };
}

function relationship(
  id: string,
  kind: SemanticRelationship["kind"],
  sourceFileId: string,
  targetFileId: string | null,
  overrides: Partial<SemanticRelationship> = {}
): SemanticRelationship {
  return {
    id,
    kind,
    sourceFileId,
    sourcePath: `${sourceFileId}.ts`,
    specifier: "../target.js",
    targetKind: "LOCAL_FILE",
    targetFileId,
    targetPath: targetFileId ? `${targetFileId}.ts` : null,
    targetPackageName: null,
    resolved: true,
    packageDependency: null,
    evidence: [evidence(`evidence:${id}`)],
    ...overrides
  };
}

function packageRelationship(id: string, packageName: string): SemanticRelationship {
  return relationship(id, "IMPORTS", "file:a", null, {
    targetKind: "PACKAGE",
    targetPackageName: packageName,
    specifier: packageName,
    packageDependency: {
      manifestPath: "untrusted/package.json",
      version: "workspace:*",
      type: "DEPENDENCY"
    }
  });
}

function evidence(id: string): SemanticRelationship["evidence"][number] {
  return {
    id,
    kind: "IMPORT_DECLARATION",
    location: { start: 0, end: 1, startLine: 1, startColumn: 1, endLine: 1, endColumn: 2 },
    names: [],
    typeOnly: false,
    sourceRecordId: null
  };
}
