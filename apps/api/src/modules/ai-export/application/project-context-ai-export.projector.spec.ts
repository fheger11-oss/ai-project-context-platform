import { describe, expect, it } from "vitest";

import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { AI_EXPORT_ENGINE_VERSION } from "./ai-export-engine-version.js";
import { ProjectContextAiExportProjector } from "./project-context-ai-export.projector.js";

const provenance = {
  contextId: "context:analysis_1:context-engine@5.7.1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: new Date("2026-08-26T10:00:00.000Z")
};

const manifestEvidence: ContextEvidence = {
  kind: "MANIFEST",
  reference: {
    kind: "MANIFEST",
    path: "package.json"
  }
};

const dependencyEvidence: ContextEvidence = {
  kind: "DEPENDENCY",
  reference: {
    kind: "DEPENDENCY",
    manifestPath: "package.json",
    name: "@nestjs/core"
  }
};

const shuffledEvidenceClaim: ContextClaim = {
  value: {
    type: "FRAMEWORK",
    framework: "NESTJS"
  },
  kind: "OBSERVED",
  confidence: "HIGH",
  evidence: [dependencyEvidence, manifestEvidence]
};

const allSectionClaims = {
  project: {
    claims: [
      {
        value: {
          type: "PROJECT_PACKAGE",
          path: "package.json",
          name: 'AI "Context" Platform',
          version: "0.1.0",
          isPrimary: true
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [manifestEvidence]
      },
      {
        value: {
          type: "APPLICATION_TYPE",
          applicationType: "FULLSTACK"
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [dependencyEvidence, manifestEvidence]
      },
      {
        value: {
          type: "PRIMARY_LANGUAGE",
          language: "TYPESCRIPT"
        },
        kind: "INFERRED",
        confidence: "LOW",
        evidence: []
      }
    ] satisfies ContextClaim[]
  },
  technology: {
    claims: [
      shuffledEvidenceClaim,
      {
        value: {
          type: "PACKAGE_SCRIPT",
          manifestPath: "package.json",
          name: "build",
          command: "pnpm build && pnpm test"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [manifestEvidence]
      },
      {
        value: {
          type: "DEPENDENCY",
          manifestPath: "package.json",
          name: "@nestjs/core",
          version: "^11.1.28",
          dependencyType: "DEPENDENCY"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [dependencyEvidence]
      },
      {
        value: {
          type: "LANGUAGE",
          language: "TYPESCRIPT",
          fileCount: 42
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "PROJECT_METADATA",
            reference: {
              kind: "PROJECT_METADATA",
              field: "project.languages"
            }
          }
        ]
      },
      {
        value: {
          type: "ECOSYSTEM",
          ecosystem: "NODE_JS"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: []
      },
      {
        value: {
          type: "PACKAGE_MANAGER",
          packageManager: "PNPM"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [manifestEvidence]
      },
      {
        value: {
          type: "MANIFEST",
          path: "package.json",
          manifestType: "PACKAGE_JSON",
          isPrimary: true
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [manifestEvidence]
      }
    ] satisfies ContextClaim[]
  },
  structure: {
    claims: [
      {
        value: {
          type: "SOURCE_GROUP",
          moduleId: "module:apps/api/src/modules/context",
          path: "apps/api/src/modules/context",
          sourceFileCount: 12,
          declarationCount: 18
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: [
          {
            kind: "SOURCE_STRUCTURE",
            reference: {
              kind: "SOURCE_STRUCTURE",
              path: "apps/api/src/modules/context/project-context.ts"
            }
          }
        ]
      }
    ] satisfies ContextClaim[]
  },
  architecture: {
    claims: [
      {
        value: {
          type: "MODULE_RELATIONSHIP",
          sourceModuleId: "module:apps/api/src/modules/document-generation",
          targetModuleId: "module:apps/api/src/modules/context",
          relationshipCount: 3
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: [
          {
            kind: "RELATIONSHIP",
            reference: {
              kind: "RELATIONSHIP",
              sourcePath: "apps/api/src/modules/document-generation/generate.ts",
              specifier: "../context"
            }
          }
        ]
      },
      {
        value: {
          type: "MODULE_CANDIDATE",
          moduleId: "module:apps/api/src/modules/context",
          name: "context",
          path: "apps/api/src/modules/context",
          sourceFileCount: 12,
          declarationCount: 18,
          internalRelationshipCount: 4,
          incomingRelationshipCount: 2,
          outgoingRelationshipCount: 1
        },
        kind: "INFERRED",
        confidence: "HIGH",
        evidence: []
      }
    ] satisfies ContextClaim[]
  },
  entryPoints: {
    claims: [
      {
        value: {
          type: "SOURCE_ENTRY_POINT_CANDIDATE",
          entryPointId: "entry-point:apps/api/src/main.ts",
          path: "apps/api/src/main.ts",
          outgoingRelationshipCount: 8,
          connectedSourceFileCount: 7
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: []
      }
    ] satisfies ContextClaim[]
  },
  testing: {
    claims: [
      {
        value: {
          type: "TESTING_ARTIFACTS_PRESENT",
          testFileCount: 10,
          structuredTestFileCount: 8
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: []
      },
      {
        value: {
          type: "TEST_FILE",
          path: "apps/api/src/foo[bar].spec.ts"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: []
      },
      {
        value: {
          type: "TEST_SOURCE_STRUCTURE",
          path: "apps/api/src/context.spec.ts",
          declarationCount: 4
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: []
      }
    ] satisfies ContextClaim[]
  },
  infrastructure: {
    claims: [
      {
        value: {
          type: "INFRASTRUCTURE_ARTIFACTS_PRESENT",
          artifactCount: 2
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: []
      },
      {
        value: {
          type: "CONFIGURATION_ARTIFACTS_PRESENT",
          artifactCount: 5
        },
        kind: "INFERRED",
        confidence: "MEDIUM",
        evidence: []
      },
      {
        value: {
          type: "INFRASTRUCTURE_ARTIFACT",
          path: ".github/workflows/ci.yml"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: []
      },
      {
        value: {
          type: "CONFIGURATION_ARTIFACT",
          path: "apps/web/vite.config.ts"
        },
        kind: "OBSERVED",
        confidence: "HIGH",
        evidence: []
      }
    ] satisfies ContextClaim[]
  },
  ambiguities: [
    {
      value: {
        type: "ANALYSIS_ISSUE",
        stage: "SOURCE_STRUCTURE",
        path: "apps/api/src/Prishtinë.ts",
        code: "PARSE_ERROR",
        message: "Unexpected token\nPreserve newline"
      },
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: [
        {
          kind: "ISSUE",
          reference: {
            kind: "ISSUE",
            stage: "SOURCE_STRUCTURE",
            path: "apps/api/src/Prishtinë.ts",
            code: "PARSE_ERROR"
          }
        }
      ]
    }
  ] satisfies ContextClaim[]
};

function projectContext(overrides: Partial<typeof allSectionClaims> = {}): ProjectContext {
  return ProjectContext.create({
    ...provenance,
    ...allSectionClaims,
    ...overrides
  });
}

function project(projectContextInput: ProjectContext = projectContext()) {
  return new ProjectContextAiExportProjector().project(projectContextInput);
}

function reversed<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

describe("ProjectContextAiExportProjector", () => {
  it("projects ProjectContext metadata, sections, summary, and export version", () => {
    const canonical = project();

    expect(canonical.metadata).toEqual({
      contextId: provenance.contextId,
      analysisId: provenance.analysisId,
      scanId: provenance.scanId,
      repositoryId: provenance.repositoryId,
      commitSha: provenance.commitSha,
      contextVersion: provenance.contextVersion,
      generatedAt: "2026-08-26T10:00:00.000Z",
      exportVersion: AI_EXPORT_ENGINE_VERSION
    });
    expect(canonical.sections.map((section) => section.key)).toEqual([
      "project",
      "technology",
      "structure",
      "architecture",
      "entryPoints",
      "testing",
      "infrastructure"
    ]);
    expect(canonical.sections.every((section) => section.title.length > 0)).toBe(true);
    expect(canonical.summary).toEqual({
      sectionCount: 7,
      populatedSectionCount: 7,
      sectionClaimCount: 21,
      ambiguityCount: 1,
      totalClaimCount: 22,
      observedClaimCount: 14,
      inferredClaimCount: 8,
      evidenceCount: 13
    });
  });

  it("preserves claim values, discriminators, kinds, confidence, evidence, and ambiguities", () => {
    const canonical = project();
    const packageClaim = canonical.sections
      .find((section) => section.key === "project")
      ?.claims.find((claim) => claim.type === "PROJECT_PACKAGE");
    const ambiguity = canonical.ambiguities[0];

    expect(packageClaim).toMatchObject({
      type: "PROJECT_PACKAGE",
      value: allSectionClaims.project.claims[0]!.value,
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: [manifestEvidence]
    });
    expect(ambiguity).toEqual({
      type: "ANALYSIS_ISSUE",
      value: allSectionClaims.ambiguities[0]?.value,
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: allSectionClaims.ambiguities[0]?.evidence
    });
  });

  it("does not invent claim type discriminators when source values do not provide one", () => {
    const claim: ContextClaim = {
      value: {
        name: "No discriminator"
      },
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: []
    };
    const canonical = project(
      ProjectContext.create({
        ...provenance,
        project: {
          claims: [claim]
        }
      })
    );

    expect(canonical.sections[0]?.claims[0]).toEqual({
      value: {
        name: "No discriminator"
      },
      kind: "OBSERVED",
      confidence: "HIGH",
      evidence: []
    });
  });

  it("produces identical canonical output for the same ProjectContext", () => {
    const context = projectContext();

    expect(JSON.stringify(project(context))).toBe(JSON.stringify(project(context)));
  });

  it("orders shuffled claims and shuffled evidence deterministically", () => {
    const first = project(
      projectContext({
        technology: {
          claims: reversed(allSectionClaims.technology.claims).map((claim) =>
            claim === shuffledEvidenceClaim
              ? {
                  ...claim,
                  evidence: reversed(claim.evidence)
                }
              : claim
          )
        }
      })
    );
    const second = project(
      projectContext({
        technology: {
          claims: allSectionClaims.technology.claims
        }
      })
    );
    const technologyTypes = first.sections
      .find((section) => section.key === "technology")
      ?.claims.map((claim) => claim.type);
    const frameworkEvidence = first.sections
      .find((section) => section.key === "technology")
      ?.claims.find((claim) => claim.type === "FRAMEWORK")?.evidence;

    expect(first).toEqual(second);
    expect(technologyTypes).toEqual([
      "DEPENDENCY",
      "ECOSYSTEM",
      "FRAMEWORK",
      "LANGUAGE",
      "MANIFEST",
      "PACKAGE_MANAGER",
      "PACKAGE_SCRIPT"
    ]);
    expect(frameworkEvidence).toEqual([dependencyEvidence, manifestEvidence]);
  });

  it("handles empty sections, no ambiguities, and missing evidence without placeholders", () => {
    const canonical = project(ProjectContext.create(provenance));

    expect(canonical.sections).toHaveLength(7);
    expect(canonical.sections.every((section) => section.claims.length === 0)).toBe(true);
    expect(canonical.ambiguities).toEqual([]);
    expect(canonical.summary).toEqual({
      sectionCount: 7,
      populatedSectionCount: 0,
      sectionClaimCount: 0,
      ambiguityCount: 0,
      totalClaimCount: 0,
      observedClaimCount: 0,
      inferredClaimCount: 0,
      evidenceCount: 0
    });
  });

  it("preserves null, undefined, empty strings, special characters, unicode, quotes, and newlines", () => {
    const value = {
      type: "PROJECT_PACKAGE",
      path: "apps/api/src/foo[bar].ts",
      name: 'AI "Context" Platform',
      version: null,
      isPrimary: true,
      optional: undefined,
      city: "Prishtinë",
      notes: "line one\nline two",
      empty: ""
    };
    const canonical = project(
      ProjectContext.create({
        ...provenance,
        project: {
          claims: [
            {
              value,
              kind: "INFERRED",
              confidence: "LOW",
              evidence: []
            }
          ]
        }
      })
    );

    expect(canonical.sections[0]?.claims[0]?.value).toEqual(value);
    expect(canonical.sections[0]?.claims[0]?.kind).toBe("INFERRED");
    expect(canonical.sections[0]?.claims[0]?.confidence).toBe("LOW");
  });

  it("does not convert evidence into claims or resolve ambiguities", () => {
    const canonical = project();
    const allSectionClaimValues = canonical.sections.flatMap((section) =>
      section.claims.map((claim) => claim.value)
    );

    expect(allSectionClaimValues).not.toContainEqual(dependencyEvidence.reference);
    expect(canonical.ambiguities).toHaveLength(1);
    expect(canonical.ambiguities[0]?.value).toEqual(allSectionClaims.ambiguities[0]?.value);
  });

  it("does not mutate ProjectContext input while sorting", () => {
    const context = projectContext({
      technology: {
        claims: reversed(allSectionClaims.technology.claims).map((claim) => ({
          ...claim,
          evidence: reversed(claim.evidence)
        }))
      }
    });
    const before = context.toSnapshot();
    const beforeTechnologyClaims = before.technology.claims;
    const beforeFirstEvidence = beforeTechnologyClaims[0]?.evidence;

    project(context);

    const after = context.toSnapshot();
    expect(after).toEqual(before);
    expect(after.technology.claims).toBe(beforeTechnologyClaims);
    expect(after.technology.claims[0]?.evidence).toBe(beforeFirstEvidence);
  });

  it("does not silently truncate or drop claims in a large ProjectContext", () => {
    const claims = Array.from({ length: 150 }, (_, index): ContextClaim => ({
      value: {
        type: "DEPENDENCY",
        manifestPath: "package.json",
        name: `@scope/really-long-dependency-name-${String(index).padStart(3, "0")}`,
        version: `^${index}.0.0`,
        dependencyType: index % 2 === 0 ? "DEPENDENCY" : "DEV_DEPENDENCY"
      },
      kind: index % 3 === 0 ? "INFERRED" : "OBSERVED",
      confidence: index % 5 === 0 ? "LOW" : "HIGH",
      evidence: [dependencyEvidence]
    }));
    const canonical = project(
      ProjectContext.create({
        ...provenance,
        technology: {
          claims: reversed(claims)
        }
      })
    );
    const technologyClaims = canonical.sections.find(
      (section) => section.key === "technology"
    )?.claims;

    expect(technologyClaims).toHaveLength(150);
    expect(canonical.summary.totalClaimCount).toBe(150);
    expect(technologyClaims?.[0]?.value).toMatchObject({
      name: "@scope/really-long-dependency-name-000"
    });
    expect(technologyClaims?.at(-1)?.value).toMatchObject({
      name: "@scope/really-long-dependency-name-149"
    });
  });
});
