import { describe, expect, it } from "vitest";

import type { CanonicalAiExport } from "../../domain/canonical-ai-export.js";
import { AI_EXPORT_FORMAT_TEXT } from "../../domain/ai-export-format.js";
import { PlainTextAiExportSerializer } from "./plain-text-ai-export.serializer.js";

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
          type: "PRIMARY_LANGUAGE",
          value: "TYPESCRIPT",
          kind: "INFERRED",
          confidence: "LOW",
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
          confidence: "MEDIUM",
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
          confidence: "HIGH",
          evidence: [
            {
              kind: "DEPENDENCY",
              reference: {
                kind: "DEPENDENCY",
                manifestPath: "package.json",
                name: "react"
              }
            },
            {
              kind: "PROJECT_METADATA",
              reference: {
                kind: "PROJECT_METADATA",
                field: "project.frameworks"
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
        },
        {
          type: "LANGUAGE_LIST",
          value: ["TYPESCRIPT", "JAVASCRIPT"],
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
          confidence: "MEDIUM",
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
          confidence: "HIGH",
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
          type: "SPECIAL_CHARACTERS",
          value: "# Heading *bold* [link](url) <tag>\nTabbed\tvalue\\path ``` fence Prishtinë",
          kind: "OBSERVED",
          confidence: "LOW",
          evidence: []
        }
      ]
    },
    {
      key: "infrastructure",
      title: "Infrastructure",
      claims: [
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
          value: null,
          kind: "OBSERVED",
          confidence: "LOW",
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
    sectionClaimCount: 14,
    ambiguityCount: 1,
    totalClaimCount: 15,
    observedClaimCount: 10,
    inferredClaimCount: 5,
    evidenceCount: 4
  }
};

function serialize(input: CanonicalAiExport = canonical) {
  return new PlainTextAiExportSerializer().serialize(input);
}

describe("PlainTextAiExportSerializer", () => {
  it("returns TEXT result metadata and a stable top-level plain text structure", () => {
    const result = serialize();

    expect(result.format).toBe(AI_EXPORT_FORMAT_TEXT);
    expect(result.contentType).toBe("text/plain; charset=utf-8");
    expect(result.filename).toBe("ai-context.txt");
    expect(result.content.startsWith("AI PROJECT CONTEXT\n\nCONTEXT METADATA")).toBe(true);
    expect(result.content.endsWith("\n")).toBe(true);
    expect(result.content.endsWith("\n\n")).toBe(false);
  });

  it("preserves context metadata and export version", () => {
    const content = serialize().content;

    expect(content).toContain("Context ID: context:analysis_1:context-engine@5.7.1");
    expect(content).toContain("Analysis ID: analysis_1");
    expect(content).toContain("Scan ID: scan_1");
    expect(content).toContain("Repository ID: repository_1");
    expect(content).toContain("Commit SHA: abc123");
    expect(content).toContain("Context Version: context-engine@5.7.1");
    expect(content).toContain("Export Version: ai-export@1");
    expect(content).toContain("Generated At: 2026-08-26T10:00:00.000Z");
  });

  it("preserves canonical section order without sorting claims again", () => {
    const content = serialize().content;
    const headings = [
      ...content.matchAll(
        /^(PROJECT|TECHNOLOGY|STRUCTURE|ARCHITECTURE|ENTRY POINTS|TESTING|INFRASTRUCTURE|AMBIGUITIES|EXPORT SUMMARY)$/gm
      )
    ].map((match) => match[1]);

    expect(headings).toEqual([
      "PROJECT",
      "TECHNOLOGY",
      "STRUCTURE",
      "ARCHITECTURE",
      "ENTRY POINTS",
      "TESTING",
      "INFRASTRUCTURE",
      "AMBIGUITIES",
      "EXPORT SUMMARY"
    ]);
    expect(content.indexOf("  Type: FRAMEWORK")).toBeLessThan(
      content.indexOf("  Type: DEPENDENCY")
    );
    expect(content.indexOf("  Type: DEPENDENCY")).toBeLessThan(
      content.indexOf("  Type: PACKAGE_SCRIPT")
    );
  });

  it("preserves scalar, object, array, and null claim values with trust labels", () => {
    const content = serialize().content;

    expect(content).toContain("  Type: PRIMARY_LANGUAGE");
    expect(content).toContain('    "TYPESCRIPT"');
    expect(content).toContain('"name": "AI \\"Context\\" Platform"');
    expect(content).toContain('"isPrimary": true');
    expect(content).toContain('"TYPESCRIPT",');
    expect(content).toContain('"JAVASCRIPT"');
    expect(content).toContain("    null");
    expect(content).toContain("  State: OBSERVED");
    expect(content).toContain("  State: INFERRED");
    expect(content).toContain("  Confidence: HIGH");
    expect(content).toContain("  Confidence: MEDIUM");
    expect(content).toContain("  Confidence: LOW");
  });

  it("preserves evidence kind, reference fields, multiple evidence items, and order", () => {
    const content = serialize().content;

    expect(content).toContain("      Evidence 1\n        Kind: DEPENDENCY");
    expect(content).toContain('"manifestPath": "package.json"');
    expect(content).toContain('"name": "react"');
    expect(content).toContain("      Evidence 2\n        Kind: PROJECT_METADATA");
    expect(content.indexOf("Kind: DEPENDENCY")).toBeLessThan(
      content.indexOf("Kind: PROJECT_METADATA")
    );
  });

  it("preserves ambiguities separately without resolving or rewriting them", () => {
    const content = serialize().content;

    expect(content).toContain("AMBIGUITIES\n  CLAIM 1");
    expect(content).toContain("  Type: ANALYSIS_ISSUE");
    expect(content).toContain('"stage": "SOURCE_STRUCTURE"');
    expect(content).toContain('"message": "Unexpected token\\nPreserve newline"');
    expect(content).toContain("      Kind: ISSUE");
    expect(content).not.toContain("resolved");
  });

  it("preserves canonical summary fields without recalculating or interpreting them", () => {
    const content = serialize().content;

    expect(content).toContain("EXPORT SUMMARY");
    expect(content).toContain("Section Count: 7");
    expect(content).toContain("Populated Section Count: 7");
    expect(content).toContain("Section Claim Count: 14");
    expect(content).toContain("Ambiguity Count: 1");
    expect(content).toContain("Total Claim Count: 15");
    expect(content).toContain("Observed Claim Count: 10");
    expect(content).toContain("Inferred Claim Count: 5");
    expect(content).toContain("Evidence Count: 4");
    expect(content).not.toContain("well documented");
    expect(content).not.toContain("highly reliable");
  });

  it("uses neutral empty collection output without inventing negative project facts", () => {
    const empty: CanonicalAiExport = {
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
    };
    const content = serialize(empty).content;

    expect(content.match(/Claims: \[\]/g)).toHaveLength(8);
    expect(content).not.toMatch(/No testing|No infrastructure|Not configured|Not supported/);
  });

  it("serializes special characters and multiline strings without Markdown formatting", () => {
    const content = serialize().content;

    expect(content).toContain(
      '"# Heading *bold* [link](url) <tag>\\nTabbed\\tvalue\\\\path ``` fence Prishtinë"'
    );
    expect(content).not.toContain("# AI Project Context");
    expect(content).not.toMatch(/^```/m);
    expect(content).not.toContain("`TYPESCRIPT`");
    expect(content).not.toContain("- State:");
  });

  it("is deterministic and does not generate timestamps or random identifiers", () => {
    expect(serialize().content).toBe(serialize().content);
    expect(serialize().content.match(/2026-08-26T10:00:00.000Z/g)).toHaveLength(1);
    expect(serialize().content).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}/i);
  });

  it("does not mutate canonical input", () => {
    const input = structuredClone(canonical);
    const before = structuredClone(input);

    serialize(input);

    expect(input).toEqual(before);
  });

  it("serializes large canonical contexts without truncating claims or evidence", () => {
    const largeClaims = Array.from({ length: 150 }, (_, index) => ({
      type: "DEPENDENCY",
      value: {
        type: "DEPENDENCY",
        manifestPath: "package.json",
        name: `dependency-${index}`,
        version: `${index}.0.0`,
        dependencyType: "DEPENDENCY"
      },
      kind: "OBSERVED" as const,
      confidence: "HIGH" as const,
      evidence: [
        {
          kind: "DEPENDENCY" as const,
          reference: {
            kind: "DEPENDENCY" as const,
            manifestPath: "package.json",
            name: `dependency-${index}`
          }
        }
      ]
    }));
    const large: CanonicalAiExport = {
      ...canonical,
      sections: [
        {
          key: "technology",
          title: "Technology",
          claims: largeClaims
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
        evidenceCount: 150
      }
    };
    const content = serialize(large).content;

    expect(content).toContain("CLAIM 150");
    expect(content).toContain('"name": "dependency-149"');
    expect(content.match(/Type: DEPENDENCY/g)).toHaveLength(150);
    expect(content.match(/Evidence 1/g)).toHaveLength(150);
    expect(content).toContain("Total Claim Count: 150");
  });
});
