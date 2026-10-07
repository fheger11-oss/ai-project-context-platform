import { describe, expect, it } from "vitest";

import type {
  ProjectContextSemantic,
  SemanticExport,
  SemanticFile,
  SemanticImport,
  SemanticPackage,
  SemanticSymbol
} from "../domain/project-context-semantic.js";
import { projectContextArchitecture } from "./project-context-architecture.projector.js";

const packages: SemanticPackage[] = [
  semanticPackage("package:root", "package.json", "workspace"),
  semanticPackage("package:api", "apps/api/package.json", "duplicate"),
  semanticPackage("package:plugin", "apps/api/plugins/a/package.json", "duplicate"),
  semanticPackage("package:web", "apps/web/package.json", "web")
];

const files: SemanticFile[] = [
  file("file:root", "README.md", "DOCUMENTATION"),
  file("file:api-module", "apps/api/src/modules/auth/auth.module.ts"),
  file("file:api-domain", "apps/api/src/modules/auth/domain/user.ts"),
  file("file:api-application", "apps/api/src/modules/auth/application/login.ts"),
  file("file:api-infrastructure", "apps/api/src/modules/auth/infrastructure/store.ts"),
  file("file:api-presentation", "apps/api/src/modules/auth/presentation/controller.ts"),
  file("file:plugin-feature", "apps/api/plugins/a/src/modules/auth/service.ts"),
  file("file:plugin-module-name", "apps/api/plugins/a/src/modules/auth/auth.module.ts"),
  file("file:web-feature", "apps/web/src/features/auth/components/auth-panel.tsx"),
  file("file:web-feature-api", "apps/web/src/features/auth/api/auth-api.ts"),
  file("file:web-component-a", "apps/web/src/components/button.tsx"),
  file("file:web-component-b", "apps/web/src/components/card.tsx"),
  file("file:web-lib", "apps/web/src/lib/request.ts")
];

const symbols: SemanticSymbol[] = [
  symbol(
    "symbol:auth-module",
    "file:api-module",
    "apps/api/src/modules/auth/auth.module.ts",
    "AuthModule"
  )
];

const imports: SemanticImport[] = [
  sourceImport("import:nest-module", "file:api-module", "apps/api/src/modules/auth/auth.module.ts")
];

const exports: SemanticExport[] = [
  sourceExport("export:user", "file:api-domain", "apps/api/src/modules/auth/domain/user.ts"),
  sourceExport(
    "export:auth-panel",
    "file:web-feature",
    "apps/web/src/features/auth/components/auth-panel.tsx"
  ),
  sourceExport("export:button", "file:web-component-a", "apps/web/src/components/button.tsx")
];

const semantic: ProjectContextSemantic = {
  packages,
  files,
  symbols,
  imports,
  exports,
  relationships: []
};

describe("projectContextArchitecture", () => {
  it("detects workspace, backend, frontend, and conservative shared modules with longest-root ownership", () => {
    const model = projectContextArchitecture(semantic);
    const moduleKinds = model.modules.map((module) => [module.kind, module.rootPath]);

    expect(moduleKinds).toEqual([
      ["WORKSPACE_PACKAGE", "."],
      ["WORKSPACE_PACKAGE", "apps/api"],
      ["WORKSPACE_PACKAGE", "apps/api/plugins/a"],
      ["BACKEND_FEATURE", "apps/api/plugins/a/src/modules/auth"],
      ["BACKEND_FEATURE", "apps/api/src/modules/auth"],
      ["WORKSPACE_PACKAGE", "apps/web"],
      ["SHARED_AREA", "apps/web/src/components"],
      ["FRONTEND_FEATURE", "apps/web/src/features/auth"]
    ]);

    const rootPackage = model.modules.find((module) => module.rootPath === ".");
    const apiPackage = model.modules.find(
      (module) => module.kind === "WORKSPACE_PACKAGE" && module.rootPath === "apps/api"
    );
    const pluginPackage = model.modules.find(
      (module) => module.kind === "WORKSPACE_PACKAGE" && module.rootPath === "apps/api/plugins/a"
    );
    expect(rootPackage?.fileIds).toEqual(["file:root"]);
    expect(apiPackage?.fileIds).not.toContain("file:plugin-feature");
    expect(pluginPackage?.fileIds).toEqual(["file:plugin-feature", "file:plugin-module-name"]);
    expect(model.modules.some((module) => module.rootPath === "apps/web/src/lib")).toBe(false);
  });

  it("preserves layers and source-export references without fabricating runtime public APIs", () => {
    const model = projectContextArchitecture(semantic);
    const backend = model.modules.find(
      (module) =>
        module.kind === "BACKEND_FEATURE" && module.rootPath === "apps/api/src/modules/auth"
    );

    expect(backend?.layers.map((layer) => layer.kind)).toEqual([
      "DOMAIN",
      "APPLICATION",
      "INFRASTRUCTURE",
      "PRESENTATION",
      "UNCLASSIFIED"
    ]);
    expect(backend?.sourceExports).toEqual([
      { exportId: "export:user", fileId: "file:api-domain" }
    ]);
    expect(JSON.stringify(backend)).not.toMatch(/provider|controllerIds|runtime|packagePublic/i);
  });

  it("records evidence-backed NestJS candidates without parsing decorator metadata", () => {
    const backend = projectContextArchitecture(semantic).modules.find(
      (module) =>
        module.kind === "BACKEND_FEATURE" && module.rootPath === "apps/api/src/modules/auth"
    );

    expect(backend).toMatchObject({
      inference: "STRONGLY_INFERRED",
      confidence: "HIGH",
      frameworkSignals: [
        {
          kind: "NESTJS_MODULE_CANDIDATE",
          fileId: "file:api-module",
          symbolIds: ["symbol:auth-module"],
          importIds: ["import:nest-module"],
          inference: "STRONGLY_INFERRED",
          confidence: "HIGH"
        }
      ]
    });
    expect(backend?.evidence).toEqual(
      expect.arrayContaining([
        { kind: "SOURCE_FILE", fileId: "file:api-module" },
        {
          kind: "SOURCE_SYMBOL",
          symbolId: "symbol:auth-module",
          fileId: "file:api-module"
        },
        {
          kind: "SOURCE_IMPORT",
          importId: "import:nest-module",
          fileId: "file:api-module"
        }
      ])
    );

    const filenameOnlyCandidate = projectContextArchitecture(semantic).modules.find(
      (module) => module.rootPath === "apps/api/plugins/a/src/modules/auth"
    );
    expect(filenameOnlyCandidate).toMatchObject({
      inference: "INFERRED",
      confidence: "MEDIUM",
      frameworkSignals: []
    });
  });

  it("uses deterministic structured identities and ordering for duplicate names in different packages", () => {
    const first = projectContextArchitecture(semantic);
    const second = projectContextArchitecture({
      ...semantic,
      packages: [...semantic.packages].reverse(),
      files: [...semantic.files].reverse(),
      symbols: [...semantic.symbols].reverse(),
      imports: [...semantic.imports].reverse(),
      exports: [...semantic.exports].reverse()
    });
    const duplicatePackages = first.modules.filter(
      (module) => module.kind === "WORKSPACE_PACKAGE" && module.name === "duplicate"
    );

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(new Set(duplicatePackages.map((module) => module.id)).size).toBe(2);
    expect(first.modules.every((module) => module.id.startsWith("architecture-module:"))).toBe(
      true
    );
  });
});

function semanticPackage(id: string, manifestPath: string, name: string): SemanticPackage {
  return {
    id,
    manifestPath,
    name,
    version: "1.0.0",
    isPrimary: manifestPath === "package.json",
    dependencies: [],
    scripts: []
  };
}

function file(
  id: string,
  path: string,
  category: SemanticFile["category"] = "SOURCE"
): SemanticFile {
  return {
    id,
    path,
    category,
    language: path.endsWith(".tsx") ? "TYPESCRIPT_TSX" : path.endsWith(".ts") ? "TYPESCRIPT" : null,
    parseIssues: [],
    symbolIds: [],
    importIds: [],
    exportIds: []
  };
}

function symbol(id: string, fileId: string, filePath: string, name: string): SemanticSymbol {
  return {
    id,
    fileId,
    filePath,
    name,
    kind: "CLASS",
    containerName: null,
    visibility: null,
    location: location()
  };
}

function sourceImport(id: string, fileId: string, filePath: string): SemanticImport {
  return {
    id,
    fileId,
    filePath,
    moduleSpecifier: "@nestjs/common",
    defaultImport: null,
    namespaceImport: null,
    namedImports: [{ name: "Module", alias: null }],
    typeOnly: false,
    location: location()
  };
}

function sourceExport(id: string, fileId: string, filePath: string): SemanticExport {
  return {
    id,
    fileId,
    filePath,
    kind: "DECLARATION",
    name: id,
    moduleSpecifier: null,
    namedExports: [],
    location: location()
  };
}

function location() {
  return { start: 0, end: 10, startLine: 1, startColumn: 1, endLine: 1, endColumn: 11 };
}
