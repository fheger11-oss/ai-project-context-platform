import { describe, expect, it } from "vitest";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { ContextClaim } from "../domain/context-claim.js";
import { CONTEXT_ENGINE_VERSION } from "./context-engine-version.js";
import { DeterministicContextGenerator } from "./deterministic-context.generator.js";

type LanguageClaimValue = {
  type: "LANGUAGE";
  language: string;
  fileCount: number;
};

type MonorepoClaimValue = {
  type: "MONOREPO";
  manifestCount: number;
  packageCount: number;
};

type SourceGroupClaimValue = {
  type: "SOURCE_GROUP";
  moduleId: string;
  path: string;
  sourceFileCount: number;
  declarationCount: number;
};

type ModuleCandidateClaimValue = {
  type: "MODULE_CANDIDATE";
  moduleId: string;
  name: string;
  path: string;
  sourceFileCount: number;
  declarationCount: number;
  internalRelationshipCount: number;
  incomingRelationshipCount: number;
  outgoingRelationshipCount: number;
};

type ModuleRelationshipClaimValue = {
  type: "MODULE_RELATIONSHIP";
  sourceModuleId: string;
  targetModuleId: string;
  relationshipCount: number;
};

type SourceEntryPointCandidateClaimValue = {
  type: "SOURCE_ENTRY_POINT_CANDIDATE";
  entryPointId: string;
  path: string;
  outgoingRelationshipCount: number;
  connectedSourceFileCount: number;
};

type TestFileClaimValue = {
  type: "TEST_FILE";
  path: string;
};

type TestSourceStructureClaimValue = {
  type: "TEST_SOURCE_STRUCTURE";
  path: string;
  declarationCount: number;
};

type TestingArtifactsPresentClaimValue = {
  type: "TESTING_ARTIFACTS_PRESENT";
  testFileCount: number;
  structuredTestFileCount: number;
};

const generatedAt = new Date("2026-08-17T10:00:00.000Z");

function baseAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    analyzerVersion: "analysis-engine@4",
    generatedAt,
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
    issues: [],
    ...overrides
  };
}

function nodePackageAnalysis(overrides: Partial<AnalysisResult["project"]> = {}): AnalysisResult {
  return baseAnalysis({
    project: {
      ecosystems: ["NODE_JS", "TYPESCRIPT"],
      languages: [
        { language: "TYPESCRIPT", fileCount: 12 },
        { language: "JAVASCRIPT", fileCount: 2 }
      ],
      packageManager: {
        status: "DETECTED",
        packageManager: "PNPM",
        evidence: ["pnpm-lock.yaml"]
      },
      frameworks: [],
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
      dependencies: [],
      issues: [],
      ...overrides
    }
  });
}

function isLanguageClaim(claim: ContextClaim): claim is ContextClaim<LanguageClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "LANGUAGE"
  );
}

function isMonorepoClaim(claim: ContextClaim): claim is ContextClaim<MonorepoClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "MONOREPO"
  );
}

function isSourceGroupClaim(claim: ContextClaim): claim is ContextClaim<SourceGroupClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "SOURCE_GROUP"
  );
}

function isModuleCandidateClaim(
  claim: ContextClaim
): claim is ContextClaim<ModuleCandidateClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "MODULE_CANDIDATE"
  );
}

function isModuleRelationshipClaim(
  claim: ContextClaim
): claim is ContextClaim<ModuleRelationshipClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "MODULE_RELATIONSHIP"
  );
}

function isSourceEntryPointCandidateClaim(
  claim: ContextClaim
): claim is ContextClaim<SourceEntryPointCandidateClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "SOURCE_ENTRY_POINT_CANDIDATE"
  );
}

function isTestFileClaim(claim: ContextClaim): claim is ContextClaim<TestFileClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "TEST_FILE"
  );
}

function isTestSourceStructureClaim(
  claim: ContextClaim
): claim is ContextClaim<TestSourceStructureClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "TEST_SOURCE_STRUCTURE"
  );
}

function isTestingArtifactsPresentClaim(
  claim: ContextClaim
): claim is ContextClaim<TestingArtifactsPresentClaimValue> {
  return (
    typeof claim.value === "object" &&
    claim.value !== null &&
    "type" in claim.value &&
    claim.value.type === "TESTING_ARTIFACTS_PRESENT"
  );
}

function file(
  path: string,
  category: AnalysisResult["files"][number]["category"] = "SOURCE"
): AnalysisResult["files"][number] {
  return { path, category };
}

function sourceStructure(
  path: string,
  declarations = 1
): AnalysisResult["sourceStructures"][number] {
  return {
    path,
    language: "TYPESCRIPT",
    imports: [],
    exports: [],
    declarations: Array.from({ length: declarations }, (_, index) => ({
      name: `Declaration${index + 1}`,
      kind: "CLASS",
      containerName: null,
      visibility: null,
      location: {
        start: index,
        end: index + 1,
        startLine: index + 1,
        startColumn: 1,
        endLine: index + 1,
        endColumn: 2
      }
    })),
    issues: []
  };
}

function relationship(
  sourcePath: string,
  targetPath: string,
  specifier: string
): AnalysisResult["relationships"][number] {
  return {
    sourcePath,
    kind: "IMPORTS",
    specifier,
    targetKind: "LOCAL_FILE",
    targetPath,
    targetPackageName: null,
    resolved: true,
    packageDependency: null,
    evidence: []
  };
}

function unresolvedRelationship(
  sourcePath: string,
  specifier: string
): AnalysisResult["relationships"][number] {
  return {
    sourcePath,
    kind: "IMPORTS",
    specifier,
    targetKind: "UNRESOLVED",
    targetPath: null,
    targetPackageName: null,
    resolved: false,
    packageDependency: null,
    evidence: []
  };
}

function packageRelationship(
  sourcePath: string,
  packageName: string
): AnalysisResult["relationships"][number] {
  return {
    sourcePath,
    kind: "IMPORTS",
    specifier: packageName,
    targetKind: "PACKAGE",
    targetPath: null,
    targetPackageName: packageName,
    resolved: true,
    packageDependency: {
      manifestPath: "package.json",
      version: "^1.0.0",
      type: "DEPENDENCY"
    },
    evidence: []
  };
}

async function generate(analysis: AnalysisResult) {
  const context = await new DeterministicContextGenerator().generate({ analysis });

  return context.toSnapshot();
}

describe("DeterministicContextGenerator", () => {
  it("generates project identity and technology context for a TypeScript NestJS project", async () => {
    const analysis = nodePackageAnalysis({
      frameworks: [{ framework: "NESTJS", evidence: ["package.json:@nestjs/core"] }],
      dependencies: [
        {
          manifestPath: "package.json",
          name: "@nestjs/core",
          version: "^11.0.0",
          type: "DEPENDENCY"
        }
      ]
    });

    const context = await generate(analysis);

    expect(context).toMatchObject({
      contextId: `context:analysis_1:${CONTEXT_ENGINE_VERSION}`,
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: CONTEXT_ENGINE_VERSION
    });
    expect(context.project.claims).toContainEqual({
      value: { type: "APPLICATION_TYPE", applicationType: "BACKEND" },
      kind: "INFERRED",
      confidence: "MEDIUM",
      evidence: expect.arrayContaining([
        {
          kind: "PROJECT_METADATA",
          reference: { kind: "PROJECT_METADATA", field: "project.frameworks" }
        },
        {
          kind: "DEPENDENCY",
          reference: {
            kind: "DEPENDENCY",
            manifestPath: "package.json",
            name: "@nestjs/core"
          }
        }
      ])
    });
    expect(context.project.claims).toContainEqual({
      value: { type: "PRIMARY_LANGUAGE", language: "TYPESCRIPT" },
      kind: "INFERRED",
      confidence: "HIGH",
      evidence: [
        {
          kind: "PROJECT_METADATA",
          reference: { kind: "PROJECT_METADATA", field: "project.languages" }
        }
      ]
    });
    expect(context.technology.claims).toEqual(
      expect.arrayContaining([
        {
          value: { type: "FRAMEWORK", framework: "NESTJS" },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: expect.arrayContaining([
            {
              kind: "PROJECT_METADATA",
              reference: { kind: "PROJECT_METADATA", field: "project.frameworks" }
            }
          ])
        },
        {
          value: { type: "PACKAGE_MANAGER", packageManager: "PNPM" },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: expect.arrayContaining([
            {
              kind: "MANIFEST",
              reference: { kind: "MANIFEST", path: "pnpm-lock.yaml" }
            }
          ])
        }
      ])
    );
    expect(context.architecture.claims).toEqual([]);
    expect(context.testing.claims).toEqual([]);
    expect(context.infrastructure.claims).toEqual([]);
  });

  it("generates frontend technology context for a React project", async () => {
    const context = await generate(
      nodePackageAnalysis({
        frameworks: [{ framework: "REACT", evidence: ["package.json:react"] }],
        dependencies: [
          {
            manifestPath: "package.json",
            name: "react",
            version: "^19.0.0",
            type: "DEPENDENCY"
          }
        ]
      })
    );

    expect(context.project.claims).toContainEqual(
      expect.objectContaining({
        value: { type: "APPLICATION_TYPE", applicationType: "FRONTEND" },
        kind: "INFERRED",
        confidence: "MEDIUM"
      })
    );
    expect(context.technology.claims).toContainEqual(
      expect.objectContaining({
        value: { type: "FRAMEWORK", framework: "REACT" },
        kind: "OBSERVED",
        confidence: "HIGH"
      })
    );
  });

  it("infers full-stack identity when React and NestJS are both observed", async () => {
    const context = await generate(
      nodePackageAnalysis({
        frameworks: [
          { framework: "NESTJS", evidence: ["apps/api/package.json:@nestjs/core"] },
          { framework: "REACT", evidence: ["apps/web/package.json:react"] }
        ],
        manifests: [
          { path: "apps/api/package.json", type: "PACKAGE_JSON", isPrimary: false },
          { path: "apps/web/package.json", type: "PACKAGE_JSON", isPrimary: false }
        ],
        packages: [
          {
            path: "apps/api/package.json",
            isPrimary: false,
            name: "api",
            version: "0.1.0",
            dependencies: []
          },
          {
            path: "apps/web/package.json",
            isPrimary: false,
            name: "web",
            version: "0.1.0",
            dependencies: []
          }
        ],
        dependencies: [
          {
            manifestPath: "apps/api/package.json",
            name: "@nestjs/core",
            version: "^11.0.0",
            type: "DEPENDENCY"
          },
          {
            manifestPath: "apps/web/package.json",
            name: "react",
            version: "^19.0.0",
            type: "DEPENDENCY"
          }
        ]
      })
    );

    expect(context.project.claims).toContainEqual(
      expect.objectContaining({
        value: { type: "APPLICATION_TYPE", applicationType: "FULLSTACK" },
        kind: "INFERRED",
        confidence: "MEDIUM"
      })
    );
    expect(context.project.claims.some(isMonorepoClaim)).toBe(false);
  });

  it("does not infer monorepo from multiple package manifests alone", async () => {
    const context = await generate(
      nodePackageAnalysis({
        manifests: [
          { path: "package.json", type: "PACKAGE_JSON", isPrimary: true },
          { path: "examples/demo/package.json", type: "PACKAGE_JSON", isPrimary: false }
        ],
        packages: [
          {
            path: "package.json",
            isPrimary: true,
            name: "root",
            version: "0.1.0",
            dependencies: []
          },
          {
            path: "examples/demo/package.json",
            isPrimary: false,
            name: "demo",
            version: "0.1.0",
            dependencies: []
          }
        ]
      })
    );

    expect(context.project.claims.some(isMonorepoClaim)).toBe(false);
  });

  it("does not turn ambiguous nested package structures into strong monorepo claims", async () => {
    const context = await generate(
      nodePackageAnalysis({
        manifests: [
          { path: "fixtures/template/package.json", type: "PACKAGE_JSON", isPrimary: false },
          { path: "examples/basic/package.json", type: "PACKAGE_JSON", isPrimary: false }
        ],
        packages: [
          {
            path: "fixtures/template/package.json",
            isPrimary: false,
            name: "template",
            version: null,
            dependencies: []
          },
          {
            path: "examples/basic/package.json",
            isPrimary: false,
            name: "example",
            version: null,
            dependencies: []
          }
        ]
      })
    );

    expect(context.project.claims).not.toContainEqual(
      expect.objectContaining({
        value: expect.objectContaining({ type: "MONOREPO" }),
        confidence: "HIGH"
      })
    );
    expect(context.project.claims.some(isMonorepoClaim)).toBe(false);
  });

  it("uses Analysis framework evidence for NestJS, React, and Next.js claims", async () => {
    const context = await generate(
      nodePackageAnalysis({
        frameworks: [
          { framework: "NESTJS", evidence: ["apps/api/package.json:@nestjs/core"] },
          { framework: "NEXT_JS", evidence: ["apps/site/package.json:next"] },
          { framework: "REACT", evidence: ["apps/web/package.json:react"] }
        ]
      })
    );

    expect(context.technology.claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: { type: "FRAMEWORK", framework: "NESTJS" },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: expect.arrayContaining([
            {
              kind: "DEPENDENCY",
              reference: {
                kind: "DEPENDENCY",
                manifestPath: "apps/api/package.json",
                name: "@nestjs/core"
              }
            }
          ])
        }),
        expect.objectContaining({
          value: { type: "FRAMEWORK", framework: "NEXT_JS" },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: expect.arrayContaining([
            {
              kind: "DEPENDENCY",
              reference: {
                kind: "DEPENDENCY",
                manifestPath: "apps/site/package.json",
                name: "next"
              }
            }
          ])
        }),
        expect.objectContaining({
          value: { type: "FRAMEWORK", framework: "REACT" },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: expect.arrayContaining([
            {
              kind: "DEPENDENCY",
              reference: {
                kind: "DEPENDENCY",
                manifestPath: "apps/web/package.json",
                name: "react"
              }
            }
          ])
        })
      ])
    );
    expect(context.project.claims).toContainEqual(
      expect.objectContaining({
        value: { type: "APPLICATION_TYPE", applicationType: "FULLSTACK" },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: expect.arrayContaining([
          {
            kind: "DEPENDENCY",
            reference: {
              kind: "DEPENDENCY",
              manifestPath: "apps/site/package.json",
              name: "next"
            }
          }
        ])
      })
    );
  });

  it("preserves multiple legitimate languages in deterministic order", async () => {
    const context = await generate(
      nodePackageAnalysis({
        languages: [
          { language: "JAVASCRIPT", fileCount: 4 },
          { language: "TYPESCRIPT", fileCount: 10 },
          { language: "JSON", fileCount: 6 }
        ]
      })
    );

    const languageClaims = context.technology.claims.filter(isLanguageClaim);

    expect(languageClaims.map((claim) => claim.value)).toEqual([
      { type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 10 },
      { type: "LANGUAGE", language: "JSON", fileCount: 6 },
      { type: "LANGUAGE", language: "JAVASCRIPT", fileCount: 4 }
    ]);
  });

  it("omits unsupported identity and technology claims for insufficient evidence", async () => {
    const context = await generate(baseAnalysis());

    expect(context.project.claims).toEqual([]);
    expect(context.technology.claims).toEqual([]);
    expect(context.structure.claims).toEqual([]);
    expect(context.architecture.claims).toEqual([]);
    expect(context.entryPoints.claims).toEqual([]);
  });

  it("does not fabricate testing context without Analysis test evidence", async () => {
    const context = await generate(
      baseAnalysis({
        files: [file("src/main.ts", "SOURCE"), file("README.md", "DOCUMENTATION")],
        sourceStructures: [sourceStructure("src/main.ts")]
      })
    );

    expect(context.testing.claims).toEqual([]);
    expect(JSON.stringify(context)).not.toContain("TEST_COVERAGE");
    expect(JSON.stringify(context)).not.toContain("TESTS_PASS");
    expect(JSON.stringify(context)).not.toContain("TESTS_FAIL");
  });

  it("generates observed testing claims from Analysis test classifications and structures", async () => {
    const context = await generate(
      baseAnalysis({
        files: [
          file("src/auth/auth.service.spec.ts", "TEST"),
          file("tests/support/example.ts", "TEST")
        ],
        sourceStructures: [
          sourceStructure("src/auth/auth.service.spec.ts", 2),
          sourceStructure("tests/support/example.ts", 1)
        ]
      })
    );

    expect(context.testing.claims.filter(isTestingArtifactsPresentClaim)).toEqual([
      {
        value: {
          type: "TESTING_ARTIFACTS_PRESENT",
          testFileCount: 2,
          structuredTestFileCount: 2
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "src/auth/auth.service.spec.ts" }
          },
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "tests/support/example.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/auth/auth.service.spec.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "tests/support/example.ts" }
          }
        ]
      }
    ]);
    expect(context.testing.claims.filter(isTestFileClaim)).toEqual([
      {
        value: { type: "TEST_FILE", path: "src/auth/auth.service.spec.ts" },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "src/auth/auth.service.spec.ts" }
          }
        ]
      },
      {
        value: { type: "TEST_FILE", path: "tests/support/example.ts" },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "tests/support/example.ts" }
          }
        ]
      }
    ]);
    expect(context.testing.claims.filter(isTestSourceStructureClaim)).toEqual([
      {
        value: {
          type: "TEST_SOURCE_STRUCTURE",
          path: "src/auth/auth.service.spec.ts",
          declarationCount: 2
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "src/auth/auth.service.spec.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/auth/auth.service.spec.ts" }
          }
        ]
      },
      {
        value: {
          type: "TEST_SOURCE_STRUCTURE",
          path: "tests/support/example.ts",
          declarationCount: 1
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "tests/support/example.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "tests/support/example.ts" }
          }
        ]
      }
    ]);
  });

  it("uses deterministic ordering and does not duplicate testing evidence", async () => {
    const analysis = baseAnalysis({
      files: [
        file("tests/zeta.spec.ts", "TEST"),
        file("src/alpha.test.ts", "TEST"),
        file("src/alpha.test.ts", "TEST")
      ],
      sourceStructures: [
        sourceStructure("tests/zeta.spec.ts"),
        sourceStructure("src/alpha.test.ts")
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);
    const testFileClaims = first.testing.claims.filter(isTestFileClaim);

    expect(testFileClaims.map((claim) => claim.value.path)).toEqual([
      "src/alpha.test.ts",
      "tests/zeta.spec.ts"
    ]);
    expect(first.testing.claims.filter(isTestingArtifactsPresentClaim)).toEqual([
      expect.objectContaining({
        value: {
          type: "TESTING_ARTIFACTS_PRESENT",
          testFileCount: 2,
          structuredTestFileCount: 2
        },
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "src/alpha.test.ts" }
          },
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "tests/zeta.spec.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/alpha.test.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "tests/zeta.spec.ts" }
          }
        ]
      })
    ]);
    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });

  it("does not infer testing frameworks, dependencies, coverage, quality, or execution status", async () => {
    const context = await generate(
      nodePackageAnalysis({
        dependencies: [
          {
            manifestPath: "package.json",
            name: "vitest",
            version: "^4.0.0",
            type: "DEV_DEPENDENCY"
          }
        ]
      })
    );

    expect(context.testing.claims).toEqual([]);
    expect(JSON.stringify(context)).not.toContain("TEST_FRAMEWORK");
    expect(JSON.stringify(context)).not.toContain("TEST_DEPENDENCY");
    expect(JSON.stringify(context)).not.toContain("COVERAGE");
    expect(JSON.stringify(context)).not.toContain("TEST_QUALITY");
    expect(JSON.stringify(context)).not.toContain("TESTS_PASS");
    expect(JSON.stringify(context)).not.toContain("TESTS_FAIL");
  });

  it("does not promote generic Analysis scripts into runtime entry-point context", async () => {
    const context = await generate(
      baseAnalysis({
        files: [
          file("scripts/build.sh", "SCRIPT"),
          file("tools/release.bash", "SCRIPT"),
          file("scripts/seed.sh", "SCRIPT"),
          file("scripts/migrate.sh", "SCRIPT"),
          file("scripts/test-helper.sh", "SCRIPT"),
          file("examples/demo/scripts/start.sh", "SCRIPT"),
          file("fixtures/template/scripts/setup.sh", "SCRIPT")
        ]
      })
    );

    expect(context.entryPoints.claims).toEqual([]);
    expect(JSON.stringify(context)).not.toContain("RUNTIME_SCRIPT");
  });

  it("infers a source entry-point candidate from a static dependency root", async () => {
    const context = await generate(
      baseAnalysis({
        files: [file("src/main.ts"), file("src/app/service.ts"), file("src/app/repository.ts")],
        sourceStructures: [
          sourceStructure("src/main.ts"),
          sourceStructure("src/app/service.ts"),
          sourceStructure("src/app/repository.ts")
        ],
        relationships: [
          relationship("src/main.ts", "src/app/service.ts", "./app/service"),
          relationship("src/main.ts", "src/app/repository.ts", "./app/repository")
        ]
      })
    );

    expect(context.entryPoints.claims.filter(isSourceEntryPointCandidateClaim)).toEqual([
      {
        value: {
          type: "SOURCE_ENTRY_POINT_CANDIDATE",
          entryPointId: "entry-point:src/main.ts",
          path: "src/main.ts",
          outgoingRelationshipCount: 2,
          connectedSourceFileCount: 2
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "src/main.ts" }
          },
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/main.ts",
              specifier: "./app/repository"
            }
          },
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/main.ts",
              specifier: "./app/service"
            }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/main.ts" }
          }
        ]
      }
    ]);
  });

  it("uses medium confidence for a limited source entry-point candidate", async () => {
    const context = await generate(
      baseAnalysis({
        files: [file("src/main.ts"), file("src/app/service.ts")],
        sourceStructures: [sourceStructure("src/main.ts"), sourceStructure("src/app/service.ts")],
        relationships: [relationship("src/main.ts", "src/app/service.ts", "./app/service")]
      })
    );

    expect(context.entryPoints.claims.filter(isSourceEntryPointCandidateClaim)).toEqual([
      expect.objectContaining({
        value: expect.objectContaining({
          entryPointId: "entry-point:src/main.ts",
          outgoingRelationshipCount: 1,
          connectedSourceFileCount: 1
        }),
        kind: "INFERRED",
        confidence: "MEDIUM"
      })
    ]);
  });

  it("does not infer entry points from declarations without relationships", async () => {
    const context = await generate(
      baseAnalysis({
        files: [file("src/main.ts")],
        sourceStructures: [sourceStructure("src/main.ts", 3)]
      })
    );

    expect(context.entryPoints.claims).toEqual([]);
  });

  it("orders multiple entry-point candidates deterministically", async () => {
    const analysis = baseAnalysis({
      files: [
        file("apps/web/src/main.ts"),
        file("apps/web/src/app.ts"),
        file("apps/api/src/main.ts"),
        file("apps/api/src/app.ts")
      ],
      sourceStructures: [
        sourceStructure("apps/web/src/main.ts"),
        sourceStructure("apps/web/src/app.ts"),
        sourceStructure("apps/api/src/main.ts"),
        sourceStructure("apps/api/src/app.ts")
      ],
      relationships: [
        relationship("apps/web/src/main.ts", "apps/web/src/app.ts", "./app"),
        relationship("apps/api/src/main.ts", "apps/api/src/app.ts", "./app")
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);

    expect(
      first.entryPoints.claims.filter(isSourceEntryPointCandidateClaim).map((claim) => claim.value)
    ).toEqual([
      expect.objectContaining({
        entryPointId: "entry-point:apps/api/src/main.ts",
        path: "apps/api/src/main.ts"
      }),
      expect.objectContaining({
        entryPointId: "entry-point:apps/web/src/main.ts",
        path: "apps/web/src/main.ts"
      })
    ]);
    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });

  it("ignores unresolved, package, self, and duplicate relationship evidence for entry-point candidates", async () => {
    const context = await generate(
      baseAnalysis({
        files: [file("src/main.ts"), file("src/app/service.ts"), file("src/app/repository.ts")],
        sourceStructures: [
          sourceStructure("src/main.ts"),
          sourceStructure("src/app/service.ts"),
          sourceStructure("src/app/repository.ts")
        ],
        relationships: [
          relationship("src/main.ts", "src/app/service.ts", "./app/service"),
          relationship("src/main.ts", "src/app/service.ts", "./app/service"),
          relationship("src/main.ts", "src/main.ts", "./main"),
          unresolvedRelationship("src/main.ts", "./missing"),
          packageRelationship("src/main.ts", "@nestjs/common"),
          relationship("src/app/service.ts", "src/app/repository.ts", "./repository")
        ]
      })
    );

    expect(context.entryPoints.claims.filter(isSourceEntryPointCandidateClaim)).toEqual([
      {
        value: {
          type: "SOURCE_ENTRY_POINT_CANDIDATE",
          entryPointId: "entry-point:src/main.ts",
          path: "src/main.ts",
          outgoingRelationshipCount: 2,
          connectedSourceFileCount: 1
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [
          {
            kind: "FILE_CLASSIFICATION",
            reference: { kind: "FILE_CLASSIFICATION", path: "src/main.ts" }
          },
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/main.ts",
              specifier: "./app/service"
            }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/main.ts" }
          }
        ]
      }
    ]);
    expect(JSON.stringify(context.entryPoints.claims)).not.toContain("./missing");
    expect(JSON.stringify(context.entryPoints.claims)).not.toContain("@nestjs/common");
  });

  it("does not fabricate runtime-flow claims from static relationships", async () => {
    const context = await generate(
      baseAnalysis({
        files: [file("src/main.ts"), file("src/app/service.ts"), file("src/app/repository.ts")],
        sourceStructures: [
          sourceStructure("src/main.ts"),
          sourceStructure("src/app/service.ts"),
          sourceStructure("src/app/repository.ts")
        ],
        relationships: [
          relationship("src/main.ts", "src/app/service.ts", "./app/service"),
          relationship("src/app/service.ts", "src/app/repository.ts", "./repository")
        ]
      })
    );

    expect(
      context.entryPoints.claims.map((claim) => (claim.value as { type?: string }).type)
    ).toEqual(["SOURCE_ENTRY_POINT_CANDIDATE"]);
    expect(JSON.stringify(context.entryPoints.claims)).not.toContain("RUNTIME_FLOW");
  });

  it("uses medium confidence for tied primary-language inference", async () => {
    const context = await generate(
      nodePackageAnalysis({
        languages: [
          { language: "JAVASCRIPT", fileCount: 4 },
          { language: "TYPESCRIPT", fileCount: 4 }
        ]
      })
    );

    expect(context.project.claims).toContainEqual({
      value: { type: "PRIMARY_LANGUAGE", language: "JAVASCRIPT" },
      kind: "INFERRED",
      confidence: "MEDIUM",
      evidence: [
        {
          kind: "PROJECT_METADATA",
          reference: { kind: "PROJECT_METADATA", field: "project.languages" }
        }
      ]
    });
  });

  it("generates equivalent semantic output for equivalent input", async () => {
    const analysis = nodePackageAnalysis({
      frameworks: [{ framework: "NESTJS", evidence: ["package.json:@nestjs/core"] }],
      dependencies: [
        {
          manifestPath: "package.json",
          name: "@nestjs/core",
          version: "^11.0.0",
          type: "DEPENDENCY"
        }
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);

    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });

  it("omits architecture and module context when structural evidence is insufficient", async () => {
    const context = await generate(
      baseAnalysis({
        sourceStructures: [sourceStructure("src/main.ts")]
      })
    );

    expect(context.structure.claims).toEqual([]);
    expect(context.architecture.claims).toEqual([]);
  });

  it("generates a deterministic module candidate for a cohesive source area", async () => {
    const context = await generate(
      baseAnalysis({
        sourceStructures: [
          sourceStructure("src/auth/controller.ts"),
          sourceStructure("src/auth/service.ts")
        ],
        relationships: [relationship("src/auth/controller.ts", "src/auth/service.ts", "./service")]
      })
    );
    const sourceGroups = context.structure.claims.filter(isSourceGroupClaim);
    const modules = context.architecture.claims.filter(isModuleCandidateClaim);

    expect(sourceGroups).toEqual([
      {
        value: {
          type: "SOURCE_GROUP",
          moduleId: "module:src/auth",
          path: "src/auth",
          sourceFileCount: 2,
          declarationCount: 2
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/auth/controller.ts" }
          },
          {
            kind: "SOURCE_STRUCTURE",
            reference: { kind: "SOURCE_STRUCTURE", path: "src/auth/service.ts" }
          }
        ]
      }
    ]);
    expect(modules).toEqual([
      expect.objectContaining({
        value: {
          type: "MODULE_CANDIDATE",
          moduleId: "module:src/auth",
          name: "auth",
          path: "src/auth",
          sourceFileCount: 2,
          declarationCount: 2,
          internalRelationshipCount: 1,
          incomingRelationshipCount: 0,
          outgoingRelationshipCount: 0
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: expect.arrayContaining([
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/auth/controller.ts",
              specifier: "./service"
            }
          }
        ])
      })
    ]);
  });

  it("generates multiple modules and aggregates cross-module relationships", async () => {
    const context = await generate(
      baseAnalysis({
        sourceStructures: [
          sourceStructure("src/auth/controller.ts"),
          sourceStructure("src/auth/service.ts"),
          sourceStructure("src/users/controller.ts"),
          sourceStructure("src/users/service.ts"),
          sourceStructure("src/repositories/controller.ts"),
          sourceStructure("src/repositories/service.ts")
        ],
        relationships: [
          relationship("src/auth/controller.ts", "src/auth/service.ts", "./service"),
          relationship("src/auth/service.ts", "src/users/service.ts", "../users/service"),
          relationship("src/users/controller.ts", "src/users/service.ts", "./service"),
          relationship("src/repositories/controller.ts", "src/repositories/service.ts", "./service")
        ]
      })
    );
    const modules = context.architecture.claims.filter(isModuleCandidateClaim);
    const moduleRelationships = context.architecture.claims.filter(isModuleRelationshipClaim);

    expect(modules.map((claim) => claim.value.moduleId)).toEqual([
      "module:src/auth",
      "module:src/repositories",
      "module:src/users"
    ]);
    expect(moduleRelationships).toEqual([
      {
        value: {
          type: "MODULE_RELATIONSHIP",
          sourceModuleId: "module:src/auth",
          targetModuleId: "module:src/users",
          relationshipCount: 1
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/auth/service.ts",
              specifier: "../users/service"
            }
          }
        ]
      }
    ]);
  });

  it("ignores unresolved relationships instead of inventing module edges", async () => {
    const analysis = baseAnalysis({
      sourceStructures: [
        sourceStructure("src/auth/controller.ts"),
        sourceStructure("src/auth/service.ts"),
        sourceStructure("src/users/controller.ts"),
        sourceStructure("src/users/service.ts")
      ],
      relationships: [
        relationship("src/auth/controller.ts", "src/auth/service.ts", "./service"),
        relationship("src/users/controller.ts", "src/users/service.ts", "./service"),
        unresolvedRelationship("src/auth/service.ts", "../users/missing-service")
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);
    const moduleRelationships = first.architecture.claims.filter(isModuleRelationshipClaim);

    expect(moduleRelationships).toEqual([]);
    expect(JSON.stringify(first.architecture.claims)).not.toContain("../users/missing-service");
    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });

  it("ignores external package relationships when aggregating module edges", async () => {
    const analysis = baseAnalysis({
      sourceStructures: [
        sourceStructure("src/auth/controller.ts"),
        sourceStructure("src/auth/service.ts"),
        sourceStructure("src/users/controller.ts"),
        sourceStructure("src/users/service.ts")
      ],
      relationships: [
        relationship("src/auth/controller.ts", "src/auth/service.ts", "./service"),
        relationship("src/users/controller.ts", "src/users/service.ts", "./service"),
        packageRelationship("src/auth/service.ts", "@nestjs/common")
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);
    const modules = first.architecture.claims.filter(isModuleCandidateClaim);
    const moduleRelationships = first.architecture.claims.filter(isModuleRelationshipClaim);

    expect(modules.map((claim) => claim.value.moduleId)).toEqual([
      "module:src/auth",
      "module:src/users"
    ]);
    expect(modules.map((claim) => claim.value.moduleId)).not.toContain("module:@nestjs/common");
    expect(moduleRelationships).toEqual([]);
    expect(JSON.stringify(first.architecture.claims)).not.toContain("@nestjs/common");
    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });

  it("uses self-module relationships as cohesion evidence without emitting self edges", async () => {
    const context = await generate(
      baseAnalysis({
        sourceStructures: [
          sourceStructure("src/auth/controller.ts"),
          sourceStructure("src/auth/service.ts")
        ],
        relationships: [
          relationship("src/auth/service.ts", "src/auth/controller.ts", "./controller")
        ]
      })
    );
    const modules = context.architecture.claims.filter(isModuleCandidateClaim);
    const moduleRelationships = context.architecture.claims.filter(isModuleRelationshipClaim);

    expect(modules).toEqual([
      expect.objectContaining({
        value: expect.objectContaining({
          moduleId: "module:src/auth",
          internalRelationshipCount: 1
        }),
        evidence: expect.arrayContaining([
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/auth/service.ts",
              specifier: "./controller"
            }
          }
        ])
      })
    ]);
    expect(moduleRelationships).toEqual([]);
  });

  it("aggregates duplicate file-level relationships into one deterministic module edge", async () => {
    const analysis = baseAnalysis({
      sourceStructures: [
        sourceStructure("src/auth/a.ts"),
        sourceStructure("src/auth/c.ts"),
        sourceStructure("src/users/b.ts"),
        sourceStructure("src/users/d.ts")
      ],
      relationships: [
        relationship("src/auth/a.ts", "src/auth/c.ts", "./c"),
        relationship("src/users/b.ts", "src/users/d.ts", "./d"),
        relationship("src/auth/a.ts", "src/users/b.ts", "../users/b"),
        relationship("src/auth/c.ts", "src/users/d.ts", "../users/d"),
        relationship("src/auth/a.ts", "src/users/b.ts", "../users/b")
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);
    const moduleRelationships = first.architecture.claims.filter(isModuleRelationshipClaim);

    expect(moduleRelationships).toEqual([
      {
        value: {
          type: "MODULE_RELATIONSHIP",
          sourceModuleId: "module:src/auth",
          targetModuleId: "module:src/users",
          relationshipCount: 3
        },
        kind: "INFERRED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/auth/a.ts",
              specifier: "../users/b"
            }
          },
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/auth/a.ts",
              specifier: "../users/b"
            }
          },
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "src/auth/c.ts",
              specifier: "../users/d"
            }
          }
        ]
      }
    ]);
    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });

  it("uses high confidence for stronger internal module evidence", async () => {
    const context = await generate(
      baseAnalysis({
        sourceStructures: [
          sourceStructure("src/auth/controller.ts", 2),
          sourceStructure("src/auth/service.ts", 2),
          sourceStructure("src/auth/repository.ts", 1)
        ],
        relationships: [
          relationship("src/auth/controller.ts", "src/auth/service.ts", "./service"),
          relationship("src/auth/service.ts", "src/auth/repository.ts", "./repository")
        ]
      })
    );

    expect(context.architecture.claims.filter(isModuleCandidateClaim)).toEqual([
      expect.objectContaining({
        value: expect.objectContaining({
          moduleId: "module:src/auth",
          internalRelationshipCount: 2,
          declarationCount: 5
        }),
        kind: "INFERRED",
        confidence: "HIGH"
      })
    ]);
  });

  it("keeps module identifiers and ordering stable", async () => {
    const analysis = baseAnalysis({
      sourceStructures: [
        sourceStructure("src/users/service.ts"),
        sourceStructure("src/auth/service.ts"),
        sourceStructure("src/users/controller.ts"),
        sourceStructure("src/auth/controller.ts")
      ],
      relationships: [
        relationship("src/users/controller.ts", "src/users/service.ts", "./service"),
        relationship("src/auth/controller.ts", "src/auth/service.ts", "./service")
      ]
    });

    const first = await generate(analysis);
    const second = await generate(analysis);

    expect(
      first.architecture.claims.filter(isModuleCandidateClaim).map((claim) => claim.value)
    ).toEqual([
      expect.objectContaining({ moduleId: "module:src/auth", path: "src/auth" }),
      expect.objectContaining({ moduleId: "module:src/users", path: "src/users" })
    ]);
    expect({ ...first, generatedAt: null }).toEqual({ ...second, generatedAt: null });
  });
});
