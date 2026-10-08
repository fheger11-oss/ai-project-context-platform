import { describe, expect, it } from "vitest";

import type { ArchitecturalModule } from "../domain/project-context-architecture.js";
import type {
  ProjectContextSemantic,
  SemanticExport,
  SemanticFile,
  SemanticPackage
} from "../domain/project-context-semantic.js";
import { projectArchitecturePublicSurfaces } from "./project-context-public-surface.projector.js";

describe("projectArchitecturePublicSurfaces", () => {
  it("groups root declarations while keeping different subpaths separate", () => {
    const semantic = input({
      declarations: [
        declaration("MAIN", ".", "dist/index.js"),
        declaration("TYPES", ".", "dist/index.d.ts"),
        declaration("EXPORTS", "./feature", "./feature/index.js")
      ]
    });

    const surfaces = projectArchitecturePublicSurfaces(semantic, modules());

    expect(surfaces.map((surface) => [surface.subpath, surface.declarations.length])).toEqual([
      [".", 2],
      ["./feature", 1]
    ]);
  });

  it("resolves only exact safe package-relative files and associates exports and ownership", () => {
    const semantic = input({
      declarations: [
        declaration("EXPORTS", "./exact", "./src/./exact.js"),
        declaration("EXPORTS", "./nested", "nested/part/../index.js"),
        declaration("EXPORTS", "./traversal", "../outside.js"),
        declaration("EXPORTS", "./absolute", "/etc/file.js"),
        declaration("EXPORTS", "./url", "https://example.test/file.js"),
        declaration("EXPORTS", "./wildcard", "./src/*.js"),
        declaration("EXPORTS", "./missing", "./dist/index.js"),
        declaration("EXPORTS", "./extension", "./src/exact")
      ],
      files: [
        file("file:exact", "packages/example/src/exact.js"),
        file("file:nested", "packages/example/nested/index.js")
      ],
      exports: [sourceExport("export:z", "file:exact"), sourceExport("export:a", "file:exact")]
    });

    const surfaces = projectArchitecturePublicSurfaces(semantic, modules(["file:exact"]));
    const exact = surface(surfaces, "./exact");

    expect(exact).toMatchObject({
      status: "RESOLVED",
      declarations: [
        {
          resolution: "RESOLVED",
          targetFileId: "file:exact",
          targetModuleId: "module:example",
          sourceExportIds: ["export:a", "export:z"]
        }
      ]
    });
    expect(surface(surfaces, "./nested").declarations[0]).toMatchObject({
      resolution: "RESOLVED",
      targetFileId: "file:nested",
      targetModuleId: null,
      sourceExportIds: []
    });
    for (const subpath of [
      "./traversal",
      "./absolute",
      "./url",
      "./wildcard",
      "./missing",
      "./extension"
    ]) {
      expect(surface(surfaces, subpath).declarations[0]).toMatchObject({
        resolution: "UNRESOLVED",
        targetFileId: null,
        targetModuleId: null,
        sourceExportIds: []
      });
    }
  });

  it("preserves conditional and fallback selectors and explicit blocked declarations", () => {
    const semantic = input({
      declarations: [
        {
          ...declaration("EXPORTS", ".", "./src/index.js"),
          selectorPath: [{ kind: "CONDITION", value: "default" }]
        },
        {
          ...declaration("EXPORTS", ".", "./fallback.js"),
          selectorPath: [{ kind: "FALLBACK", index: 1 }]
        },
        {
          ...declaration("EXPORTS", ".", "./first.js"),
          selectorPath: [{ kind: "FALLBACK", index: 0 }]
        },
        {
          manifestPath: "packages/example/package.json",
          sourceField: "EXPORTS",
          subpath: "./internal",
          selectorPath: [],
          disposition: "BLOCKED",
          declaredTarget: null
        }
      ],
      files: [file("file:index", "packages/example/src/index.js")]
    });

    const surfaces = projectArchitecturePublicSurfaces(semantic, modules());
    const root = surface(surfaces, ".");

    expect(root.status).toBe("PARTIAL");
    expect(root.declarations.map((item) => item.selectorPath)).toEqual([
      [{ kind: "CONDITION", value: "default" }],
      [{ kind: "FALLBACK", index: 0 }],
      [{ kind: "FALLBACK", index: 1 }]
    ]);
    expect(surface(surfaces, "./internal")).toMatchObject({
      status: "BLOCKED",
      declarations: [
        {
          resolution: "BLOCKED",
          targetFileId: null,
          targetModuleId: null,
          sourceExportIds: []
        }
      ]
    });
  });

  it("derives all aggregate coverage states", () => {
    const semantic = input({
      declarations: [
        declaration("EXPORTS", "./resolved", "./exists.js"),
        declaration("MAIN", "./partial", "./exists.js"),
        declaration("TYPES", "./partial", "./missing.d.ts"),
        declaration("EXPORTS", "./unresolved", "./missing.js"),
        {
          manifestPath: "packages/example/package.json",
          sourceField: "EXPORTS",
          subpath: "./blocked",
          selectorPath: [],
          disposition: "BLOCKED",
          declaredTarget: null
        }
      ],
      files: [file("file:exists", "packages/example/exists.js")]
    });

    const surfaces = projectArchitecturePublicSurfaces(semantic, modules());

    expect(surface(surfaces, "./resolved").status).toBe("RESOLVED");
    expect(surface(surfaces, "./partial").status).toBe("PARTIAL");
    expect(surface(surfaces, "./unresolved").status).toBe("UNRESOLVED");
    expect(surface(surfaces, "./blocked").status).toBe("BLOCKED");
  });

  it("uses deterministic identities and output independent of semantic and module ordering", () => {
    const firstInput = input({
      declarations: [declaration("MAIN", ".", "./a.js"), declaration("MODULE", ".", "./b.js")],
      files: [file("file:a", "packages/example/a.js"), file("file:b", "packages/example/b.js")],
      exports: [sourceExport("export:a", "file:a"), sourceExport("export:b", "file:b")]
    });
    const otherPackage: SemanticPackage = {
      ...firstInput.packages[0]!,
      id: "package:other",
      manifestPath: "packages/other/package.json",
      name: "@example/other",
      publicSurfaceDeclarations: [
        {
          ...declaration("EXPORTS", ".", "./index.js"),
          manifestPath: "packages/other/package.json"
        }
      ]
    };
    const orderedInput: ProjectContextSemantic = {
      ...firstInput,
      packages: [...firstInput.packages, otherPackage],
      files: [...firstInput.files, file("file:other", "packages/other/index.js")]
    };
    const firstModules = [
      ...modules(["file:a", "file:b"]),
      {
        ...architectureModule(
          "module:other",
          "packages/other",
          ["file:other"],
          "WORKSPACE_PACKAGE"
        ),
        packageId: "package:other"
      }
    ];
    const first = projectArchitecturePublicSurfaces(orderedInput, firstModules);
    const second = projectArchitecturePublicSurfaces(
      {
        ...orderedInput,
        packages: [...orderedInput.packages].reverse(),
        files: [...orderedInput.files].reverse(),
        exports: [...orderedInput.exports].reverse()
      },
      [...firstModules].reverse()
    );
    const changedTarget = projectArchitecturePublicSurfaces(
      input({ declarations: [declaration("MAIN", ".", "./changed.js")] }),
      firstModules
    );

    expect(second).toEqual(first);
    expect(changedTarget[0]?.id).toBe(first[0]?.id);
    expect(changedTarget[0]?.declarations[0]?.declarationId).not.toBe(
      first[0]?.declarations[0]?.declarationId
    );
    expect(first[0]?.id).toMatch(/^architecture-public-surface:/);
    expect(
      first[0]?.declarations.every((item) =>
        item.declarationId.startsWith("architecture-public-surface-declaration:")
      )
    ).toBe(true);
  });

  it("does not select a module when ownership is ambiguous", () => {
    const semantic = input({
      declarations: [declaration("EXPORTS", ".", "./index.js")],
      files: [file("file:index", "packages/example/index.js")]
    });
    const ambiguous = [
      architectureModule("module:a", "packages/example/a", ["file:index"]),
      architectureModule("module:b", "packages/example/b", ["file:index"])
    ];

    expect(
      projectArchitecturePublicSurfaces(semantic, ambiguous)[0]?.declarations[0]?.targetModuleId
    ).toBeNull();
  });
});

function input(overrides: {
  declarations?: SemanticPackage["publicSurfaceDeclarations"];
  files?: SemanticFile[];
  exports?: SemanticExport[];
}): ProjectContextSemantic {
  return {
    packages: [
      {
        id: "package:example",
        manifestPath: "packages/example/package.json",
        name: "@example/package",
        version: "1.0.0",
        isPrimary: false,
        dependencies: [],
        scripts: [],
        publicSurfaceDeclarations: overrides.declarations ?? []
      }
    ],
    files: overrides.files ?? [],
    symbols: [],
    imports: [],
    exports: overrides.exports ?? [],
    relationships: []
  };
}

function declaration(
  sourceField: "EXPORTS" | "MAIN" | "MODULE" | "TYPES",
  subpath: string,
  declaredTarget: string
): SemanticPackage["publicSurfaceDeclarations"][number] {
  return {
    manifestPath: "packages/example/package.json",
    sourceField,
    subpath,
    selectorPath: [],
    disposition: "TARGET",
    declaredTarget
  };
}

function file(id: string, path: string): SemanticFile {
  return {
    id,
    path,
    category: path.endsWith(".json") ? "CONFIG" : "SOURCE",
    language: path.endsWith(".js") ? "JAVASCRIPT" : null,
    parseIssues: [],
    symbolIds: [],
    importIds: [],
    exportIds: []
  };
}

function sourceExport(id: string, fileId: string): SemanticExport {
  return {
    id,
    fileId,
    filePath: "unused.js",
    kind: "DEFAULT",
    name: "default",
    moduleSpecifier: null,
    namedExports: [],
    location: { start: 0, end: 1, startLine: 1, startColumn: 1, endLine: 1, endColumn: 2 }
  };
}

function modules(fileIds: string[] = []): ArchitecturalModule[] {
  return [architectureModule("module:example", "packages/example", fileIds, "WORKSPACE_PACKAGE")];
}

function architectureModule(
  id: string,
  rootPath: string,
  fileIds: string[],
  kind: ArchitecturalModule["kind"] = "BACKEND_FEATURE"
): ArchitecturalModule {
  return {
    id,
    kind,
    name: id,
    rootPath,
    packageId: "package:example",
    parentModuleId: kind === "WORKSPACE_PACKAGE" ? null : "module:example",
    fileIds,
    layers: [],
    sourceExports: [],
    frameworkSignals: [],
    inference: kind === "WORKSPACE_PACKAGE" ? "OBSERVED" : "INFERRED",
    confidence: kind === "WORKSPACE_PACKAGE" ? "HIGH" : "MEDIUM",
    evidence: []
  };
}

function surface(surfaces: ReturnType<typeof projectArchitecturePublicSurfaces>, subpath: string) {
  const found = surfaces.find((item) => item.subpath === subpath);
  expect(found).toBeDefined();
  return found!;
}
