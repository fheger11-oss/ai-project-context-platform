import { describe, expect, it } from "vitest";

import type { ProjectProfile } from "../project-detection/project-profile.js";
import type { SourceExport } from "../source-structure/source-export.js";
import type { SourceFileStructure } from "../source-structure/source-file-structure.js";
import type { SourceImport } from "../source-structure/source-import.js";
import type { SourceLocation } from "../source-structure/source-location.js";
import { SourceRelationshipAnalyzer } from "./source-relationship-analyzer.js";

const location: SourceLocation = {
  start: 0,
  end: 1,
  startLine: 1,
  startColumn: 1,
  endLine: 1,
  endColumn: 2
};

const emptyProfile: ProjectProfile = {
  ecosystems: [],
  languages: [],
  packageManager: {
    status: "UNKNOWN",
    evidence: []
  },
  frameworks: [],
  manifests: [],
  packages: [],
  dependencies: [],
  issues: []
};

function source(
  path: string,
  options: {
    imports?: readonly SourceImport[];
    exports?: readonly SourceExport[];
  } = {}
): SourceFileStructure {
  return {
    path,
    language: path.endsWith("x") ? "TYPESCRIPT_TSX" : "TYPESCRIPT",
    imports: options.imports ?? [],
    exports: options.exports ?? [],
    declarations: [],
    issues: []
  };
}

function sourceImport(
  moduleSpecifier: string,
  options: Partial<Omit<SourceImport, "moduleSpecifier" | "location">> = {}
): SourceImport {
  return {
    moduleSpecifier,
    defaultImport: null,
    namespaceImport: null,
    namedImports: [],
    typeOnly: false,
    location,
    ...options
  };
}

function sourceExport(
  moduleSpecifier: string,
  namedExports: SourceExport["namedExports"] = []
): SourceExport {
  return {
    kind: namedExports.length > 0 ? "NAMED" : "NAMESPACE",
    name: null,
    moduleSpecifier,
    namedExports,
    location
  };
}

describe("SourceRelationshipAnalyzer", () => {
  const analyzer = new SourceRelationshipAnalyzer();

  it("resolves relative imports against scanned source files", () => {
    const result = analyzer.analyze({
      sourceStructures: [
        source("src/services/user.service.ts", {
          imports: [sourceImport("../utils/logger")]
        }),
        source("src/utils/logger.ts")
      ],
      projectProfile: emptyProfile
    });

    expect(result.relationships).toMatchObject([
      {
        sourcePath: "src/services/user.service.ts",
        kind: "IMPORTS",
        specifier: "../utils/logger",
        targetKind: "LOCAL_FILE",
        targetPath: "src/utils/logger.ts",
        resolved: true
      }
    ]);
    expect(result.issues).toEqual([]);
  });

  it("supports extension candidates, index resolution, and explicit JavaScript extension substitution", () => {
    const result = analyzer.analyze({
      sourceStructures: [
        source("src/main.ts", {
          imports: [
            sourceImport("./utils"),
            sourceImport("./components"),
            sourceImport("./runtime.js"),
            sourceImport("../shared/helpers")
          ]
        }),
        source("src/utils.tsx"),
        source("src/components/index.ts"),
        source("src/runtime.ts"),
        source("shared/helpers.cjs")
      ],
      projectProfile: emptyProfile
    });

    expect(
      result.relationships.map((relationship) => ({
        specifier: relationship.specifier,
        targetPath: relationship.targetPath
      }))
    ).toEqual([
      { specifier: "../shared/helpers", targetPath: "shared/helpers.cjs" },
      { specifier: "./components", targetPath: "src/components/index.ts" },
      { specifier: "./runtime.js", targetPath: "src/runtime.ts" },
      { specifier: "./utils", targetPath: "src/utils.tsx" }
    ]);
  });

  it("creates re-export relationships without resolving symbols", () => {
    const result = analyzer.analyze({
      sourceStructures: [
        source("src/index.ts", {
          exports: [
            sourceExport("./utils"),
            sourceExport("./foo", [{ name: "foo", alias: null }]),
            sourceExport("./bar", [{ name: "foo", alias: "bar" }])
          ]
        }),
        source("src/utils.ts"),
        source("src/foo.ts"),
        source("src/bar.ts")
      ],
      projectProfile: emptyProfile
    });

    expect(result.relationships).toMatchObject([
      { kind: "RE_EXPORTS", specifier: "./bar", targetPath: "src/bar.ts" },
      { kind: "RE_EXPORTS", specifier: "./foo", targetPath: "src/foo.ts" },
      { kind: "RE_EXPORTS", specifier: "./utils", targetPath: "src/utils.ts" }
    ]);
    expect(result.relationships[1]?.evidence[0]?.names).toEqual(["foo"]);
    expect(result.relationships[0]?.evidence[0]?.names).toEqual(["bar"]);
  });

  it("represents known and unknown package imports without fabricating local targets", () => {
    const result = analyzer.analyze({
      sourceStructures: [
        source("src/main.ts", {
          imports: [
            sourceImport("react", { defaultImport: "React" }),
            sourceImport("@nestjs/common", {
              namedImports: [{ name: "Injectable", alias: null }]
            }),
            sourceImport("@company/package")
          ]
        })
      ],
      projectProfile: {
        ...emptyProfile,
        dependencies: [
          {
            manifestPath: "package.json",
            name: "react",
            version: "^19.0.0",
            type: "DEPENDENCY"
          },
          {
            manifestPath: "apps/api/package.json",
            name: "@nestjs/common",
            version: "^11.0.0",
            type: "DEPENDENCY"
          }
        ]
      }
    });

    expect(result.relationships).toMatchObject([
      {
        specifier: "@company/package",
        targetKind: "PACKAGE",
        targetPackageName: "@company/package",
        resolved: false,
        targetPath: null
      },
      {
        specifier: "@nestjs/common",
        targetKind: "PACKAGE",
        targetPackageName: "@nestjs/common",
        resolved: true,
        packageDependency: {
          manifestPath: "apps/api/package.json",
          version: "^11.0.0",
          type: "DEPENDENCY"
        }
      },
      {
        specifier: "react",
        targetKind: "PACKAGE",
        targetPackageName: "react",
        resolved: true
      }
    ]);
    expect(result.issues).toEqual([
      {
        sourcePath: "src/main.ts",
        specifier: "@company/package",
        code: "UNKNOWN_PACKAGE_DEPENDENCY"
      }
    ]);
  });

  it("keeps unresolved local imports explicit and deduplicates equivalent relationships", () => {
    const result = analyzer.analyze({
      sourceStructures: [
        source("src/main.ts", {
          imports: [sourceImport("./missing"), sourceImport("./missing")]
        })
      ],
      projectProfile: emptyProfile
    });

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]).toMatchObject({
      specifier: "./missing",
      targetKind: "UNRESOLVED",
      targetPath: null,
      resolved: false
    });
    expect(result.relationships[0]?.evidence).toHaveLength(2);
    expect(result.issues).toEqual([
      {
        sourcePath: "src/main.ts",
        specifier: "./missing",
        code: "UNRESOLVED_LOCAL_MODULE"
      }
    ]);
  });

  it("is deterministic for identical source structures and project profile", () => {
    const input = {
      sourceStructures: [
        source("src/b.ts"),
        source("src/a.ts", {
          imports: [sourceImport("./b"), sourceImport("react")]
        })
      ],
      projectProfile: {
        ...emptyProfile,
        dependencies: [
          {
            manifestPath: "package.json",
            name: "react",
            version: "^19.0.0",
            type: "DEPENDENCY" as const
          }
        ]
      }
    };

    expect(analyzer.analyze(input)).toEqual(analyzer.analyze(input));
  });
});
