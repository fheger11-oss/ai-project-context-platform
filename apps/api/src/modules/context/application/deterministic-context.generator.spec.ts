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
});
