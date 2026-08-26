import { describe, expect, it } from "vitest";

import type { CanonicalAiExport } from "../../domain/canonical-ai-export.js";
import { AI_EXPORT_FORMAT_AI_CONTEXT } from "../../domain/ai-export-format.js";
import { AiContextSerializer } from "./ai-context.serializer.js";

const canonical: CanonicalAiExport = {
  metadata: {
    contextId: "context:analysis_1:context-engine@5.7.1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contextVersion: "context-engine@5.7.1",
    generatedAt: "2026-08-26T10:00:00.000Z",
    exportVersion: "ai-export@1"
  },
  sections: [
    {
      key: "project",
      title: "Project",
      claims: [
        {
          type: "PROJECT_PACKAGE",
          value: {
            type: "PROJECT_PACKAGE",
            path: "package.json",
            name: 'AI "Context" Platform',
            version: "0.1.0",
            isPrimary: true
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: [
            {
              kind: "MANIFEST",
              reference: {
                kind: "MANIFEST",
                path: "package.json"
              }
            }
          ]
        },
        {
          type: "APPLICATION_TYPE",
          value: {
            type: "APPLICATION_TYPE",
            applicationType: "FULLSTACK"
          },
          kind: "INFERRED",
          confidence: "MEDIUM",
          evidence: []
        }
      ]
    },
    {
      key: "technology",
      title: "Technology",
      claims: [
        {
          type: "FRAMEWORK",
          value: {
            type: "FRAMEWORK",
            framework: "REACT"
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        },
        {
          type: "DEPENDENCY",
          value: {
            type: "DEPENDENCY",
            manifestPath: "package.json",
            name: "react",
            version: "^19.2.8",
            dependencyType: "DEPENDENCY"
          },
          kind: "OBSERVED",
          confidence: "LOW",
          evidence: [
            {
              kind: "DEPENDENCY",
              reference: {
                kind: "DEPENDENCY",
                manifestPath: "package.json",
                name: "react"
              }
            }
          ]
        },
        {
          type: "PACKAGE_SCRIPT",
          value: {
            type: "PACKAGE_SCRIPT",
            manifestPath: "package.json",
            name: "build",
            command: "pnpm build && pnpm test"
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        }
      ]
    },
    {
      key: "structure",
      title: "Structure",
      claims: [
        {
          type: "SOURCE_GROUP",
          value: {
            type: "SOURCE_GROUP",
            moduleId: "module:apps/api/src/modules/context",
            path: "apps/api/src/modules/context",
            sourceFileCount: 12,
            declarationCount: 18
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        }
      ]
    },
    {
      key: "architecture",
      title: "Architecture",
      claims: [
        {
          type: "MODULE_CANDIDATE",
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
        },
        {
          type: "MODULE_RELATIONSHIP",
          value: {
            type: "MODULE_RELATIONSHIP",
            sourceModuleId: "module:apps/api/src/modules/document-generation",
            targetModuleId: "module:apps/api/src/modules/context",
            relationshipCount: 3
          },
          kind: "INFERRED",
          confidence: "MEDIUM",
          evidence: []
        }
      ]
    },
    {
      key: "entryPoints",
      title: "Entry Points",
      claims: [
        {
          type: "SOURCE_ENTRY_POINT_CANDIDATE",
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
      ]
    },
    {
      key: "testing",
      title: "Testing",
      claims: [
        {
          type: "TESTING_ARTIFACTS_PRESENT",
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
          type: "TEST_FILE",
          value: {
            type: "TEST_FILE",
            path: "apps/api/src/foo[bar].spec.ts"
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        },
        {
          type: "TEST_SOURCE_STRUCTURE",
          value: {
            type: "TEST_SOURCE_STRUCTURE",
            path: "apps/api/src/context.spec.ts",
            declarationCount: 4
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        }
      ]
    },
    {
      key: "infrastructure",
      title: "Infrastructure",
      claims: [
        {
          type: "INFRASTRUCTURE_ARTIFACTS_PRESENT",
          value: {
            type: "INFRASTRUCTURE_ARTIFACTS_PRESENT",
            artifactCount: 2
          },
          kind: "INFERRED",
          confidence: "MEDIUM",
          evidence: []
        },
        {
          type: "CONFIGURATION_ARTIFACTS_PRESENT",
          value: {
            type: "CONFIGURATION_ARTIFACTS_PRESENT",
            artifactCount: 5
          },
          kind: "INFERRED",
          confidence: "MEDIUM",
          evidence: []
        },
        {
          type: "INFRASTRUCTURE_ARTIFACT",
          value: {
            type: "INFRASTRUCTURE_ARTIFACT",
            path: ".github/workflows/ci.yml"
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        },
        {
          type: "CONFIGURATION_ARTIFACT",
          value: {
            type: "CONFIGURATION_ARTIFACT",
            path: "apps/web/vite.config.ts"
          },
          kind: "OBSERVED",
          confidence: "HIGH",
          evidence: []
        }
      ]
    }
  ],
  ambiguities: [
    {
      type: "ANALYSIS_ISSUE",
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
  ],
  summary: {
    sectionCount: 7,
    populatedSectionCount: 7,
    sectionClaimCount: 16,
    ambiguityCount: 1,
    totalClaimCount: 17,
    observedClaimCount: 10,
    inferredClaimCount: 7,
    evidenceCount: 4
  }
};

function serialize(input: CanonicalAiExport = canonical) {
  return new AiContextSerializer().serialize(input);
}

function parse(content: string) {
  return JSON.parse(content) as Record<string, unknown>;
}

describe("AiContextSerializer", () => {
  it("serializes CanonicalAiExport as deterministic AI_CONTEXT JSON", () => {
    const result = serialize();
    const parsed = parse(result.content);

    expect(result.format).toBe(AI_EXPORT_FORMAT_AI_CONTEXT);
    expect(result.contentType).toBe("application/json; charset=utf-8");
    expect(result.filename).toBe("ai-context.json");
    expect(result.content.endsWith("\n")).toBe(true);
    expect(parsed).toMatchObject({
      type: "AI_PROJECT_CONTEXT",
      version: "ai-export@1",
      context: {
        contextId: canonical.metadata.contextId,
        analysisId: canonical.metadata.analysisId,
        scanId: canonical.metadata.scanId,
        repositoryId: canonical.metadata.repositoryId,
        commitSha: canonical.metadata.commitSha,
        contextVersion: canonical.metadata.contextVersion,
        generatedAt: canonical.metadata.generatedAt
      },
      summary: canonical.summary
    });
  });

  it("preserves all canonical sections in canonical order", () => {
    const parsed = parse(serialize().content);
    const sections = parsed.sections as Record<string, unknown>;

    expect(Object.keys(sections)).toEqual([
      "project",
      "technology",
      "structure",
      "architecture",
      "entryPoints",
      "testing",
      "infrastructure"
    ]);
    expect(sections.project).toEqual({
      title: "Project",
      claims: canonical.sections[0]!.claims
    });
    expect(sections.technology).toEqual({
      title: "Technology",
      claims: canonical.sections[1]!.claims
    });
    expect(sections.structure).toEqual({
      title: "Structure",
      claims: canonical.sections[2]!.claims
    });
    expect(sections.architecture).toEqual({
      title: "Architecture",
      claims: canonical.sections[3]!.claims
    });
    expect(sections.entryPoints).toEqual({
      title: "Entry Points",
      claims: canonical.sections[4]!.claims
    });
    expect(sections.testing).toEqual({
      title: "Testing",
      claims: canonical.sections[5]!.claims
    });
    expect(sections.infrastructure).toEqual({
      title: "Infrastructure",
      claims: canonical.sections[6]!.claims
    });
  });

  it("preserves claim values, types, observed/inferred state, confidence, and evidence", () => {
    const parsed = parse(serialize().content);
    const sections = parsed.sections as {
      project: { claims: unknown[] };
      technology: { claims: unknown[] };
    };

    expect(sections.project.claims[0]).toEqual(canonical.sections[0]!.claims[0]);
    expect(sections.project.claims[1]).toMatchObject({
      type: "APPLICATION_TYPE",
      value: {
        type: "APPLICATION_TYPE",
        applicationType: "FULLSTACK"
      },
      kind: "INFERRED",
      confidence: "MEDIUM",
      evidence: []
    });
    expect(sections.technology.claims[1]).toMatchObject({
      type: "DEPENDENCY",
      kind: "OBSERVED",
      confidence: "LOW",
      evidence: canonical.sections[1]!.claims[1]!.evidence
    });
  });

  it("preserves ambiguities without resolving or rewriting them", () => {
    const parsed = parse(serialize().content);

    expect(parsed.ambiguities).toEqual(canonical.ambiguities);
    expect(JSON.stringify(parsed)).toContain("Unexpected token\\nPreserve newline");
    expect(JSON.stringify(parsed)).not.toContain("resolved");
  });

  it("preserves empty sections according to the canonical representation", () => {
    const result = serialize({
      ...canonical,
      sections: canonical.sections.map((section) => ({
        ...section,
        claims: []
      })),
      ambiguities: [],
      summary: {
        sectionCount: 7,
        populatedSectionCount: 0,
        sectionClaimCount: 0,
        ambiguityCount: 0,
        totalClaimCount: 0,
        observedClaimCount: 0,
        inferredClaimCount: 0,
        evidenceCount: 0
      }
    });
    const sections = parse(result.content).sections as Record<string, { claims: unknown[] }>;

    expect(Object.values(sections).every((section) => section.claims.length === 0)).toBe(true);
  });

  it("produces identical output for identical canonical input and generates no new timestamps", () => {
    const first = serialize();
    const second = serialize();

    expect(first).toEqual(second);
    expect(first.content).toBe(second.content);
    expect(first.content).toContain("2026-08-26T10:00:00.000Z");
    expect(first.content).not.toContain(String(new Date().getFullYear() + 1));
  });

  it("does not create natural-language project summaries or inferred relationships", () => {
    const content = serialize().content;

    expect(content).not.toMatch(/appears to|based on|likely|production ready|clean architecture/i);
    expect(content).not.toContain("React is used for the frontend");
    expect(content).not.toContain("The project is a React application");
  });

  it("uses JSON serialization for special characters without changing values", () => {
    const specialCanonical: CanonicalAiExport = {
      ...canonical,
      sections: [
        {
          key: "project",
          title: "Project",
          claims: [
            {
              type: "PROJECT_PACKAGE",
              value: {
                type: "PROJECT_PACKAGE",
                path: "apps/api/src/foo[bar].ts",
                name: 'AI "Context" Platform \\ Core',
                command: "build && test\twith tab",
                html: '<script>alert("no execution")</script>',
                markdown: "**bold** [link](https://example.com)",
                city: "Prishtinë",
                notes: "line one\nline two"
              },
              kind: "OBSERVED",
              confidence: "HIGH",
              evidence: []
            }
          ]
        }
      ],
      ambiguities: [],
      summary: {
        sectionCount: 1,
        populatedSectionCount: 1,
        sectionClaimCount: 1,
        ambiguityCount: 0,
        totalClaimCount: 1,
        observedClaimCount: 1,
        inferredClaimCount: 0,
        evidenceCount: 0
      }
    };
    const parsed = parse(serialize(specialCanonical).content);
    const sections = parsed.sections as { project: { claims: [{ value: unknown }] } };

    expect(sections.project.claims[0].value).toEqual(
      specialCanonical.sections[0]!.claims[0]!.value
    );
  });

  it("serializes large canonical input completely without truncating claims", () => {
    const claims = Array.from({ length: 150 }, (_, index) => ({
      type: "DEPENDENCY",
      value: {
        type: "DEPENDENCY",
        manifestPath: "package.json",
        name: `@scope/really-long-dependency-name-${String(index).padStart(3, "0")}`,
        version: `^${index}.0.0`,
        dependencyType: "DEPENDENCY"
      },
      kind: "OBSERVED" as const,
      confidence: "HIGH" as const,
      evidence: []
    }));
    const largeCanonical: CanonicalAiExport = {
      ...canonical,
      sections: [
        {
          key: "technology",
          title: "Technology",
          claims
        }
      ],
      ambiguities: [],
      summary: {
        sectionCount: 1,
        populatedSectionCount: 1,
        sectionClaimCount: 150,
        ambiguityCount: 0,
        totalClaimCount: 150,
        observedClaimCount: 150,
        inferredClaimCount: 0,
        evidenceCount: 0
      }
    };
    const parsed = parse(serialize(largeCanonical).content);
    const sections = parsed.sections as { technology: { claims: typeof claims } };

    expect(sections.technology.claims).toHaveLength(150);
    expect(sections.technology.claims[0]?.value.name).toBe(
      "@scope/really-long-dependency-name-000"
    );
    expect(sections.technology.claims.at(-1)?.value.name).toBe(
      "@scope/really-long-dependency-name-149"
    );
  });

  it("does not mutate canonical input", () => {
    const before = structuredClone(canonical);

    serialize(canonical);

    expect(canonical).toEqual(before);
  });
});
