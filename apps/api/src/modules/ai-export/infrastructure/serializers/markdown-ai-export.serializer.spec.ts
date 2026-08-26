import { describe, expect, it } from "vitest";

import type { CanonicalAiExport } from "../../domain/canonical-ai-export.js";
import { AI_EXPORT_FORMAT_MARKDOWN } from "../../domain/ai-export-format.js";
import { MarkdownAiExportSerializer } from "./markdown-ai-export.serializer.js";

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
    sectionClaimCount: 12,
    ambiguityCount: 1,
    totalClaimCount: 13,
    observedClaimCount: 8,
    inferredClaimCount: 5,
    evidenceCount: 4
  }
};

function serialize(input: CanonicalAiExport = canonical) {
  return new MarkdownAiExportSerializer().serialize(input);
}

describe("MarkdownAiExportSerializer", () => {
  it("returns MARKDOWN result metadata and a stable top-level Markdown structure", () => {
    const result = serialize();

    expect(result.format).toBe(AI_EXPORT_FORMAT_MARKDOWN);
    expect(result.contentType).toBe("text/markdown; charset=utf-8");
    expect(result.filename).toBe("ai-context.md");
    expect(result.content.startsWith("# AI Project Context\n\n## Context Metadata")).toBe(true);
    expect(result.content.endsWith("\n")).toBe(true);
    expect(result.content.endsWith("\n\n")).toBe(false);
  });

  it("preserves context metadata and export version", () => {
    const content = serialize().content;

    expect(content).toContain("- Context ID: `context:analysis_1:context-engine@5.7.1`");
    expect(content).toContain("- Analysis ID: `analysis_1`");
    expect(content).toContain("- Scan ID: `scan_1`");
    expect(content).toContain("- Repository ID: `repository_1`");
    expect(content).toContain("- Commit SHA: `abc123`");
    expect(content).toContain("- Context Version: `context-engine@5.7.1`");
    expect(content).toContain("- Export Version: `ai-export@1`");
    expect(content).toContain("- Generated At: `2026-08-26T10:00:00.000Z`");
  });

  it("preserves canonical section order without sorting claims again", () => {
    const content = serialize().content;
    const headings = [...content.matchAll(/^## (.+)$/gm)].map((match) => match[1]);

    expect(headings).toEqual([
      "Context Metadata",
      "Project",
      "Technology",
      "Structure",
      "Architecture",
      "Entry Points",
      "Testing",
      "Infrastructure",
      "Ambiguities",
      "Export Summary"
    ]);
    expect(content.indexOf("### Claim 1: FRAMEWORK")).toBeLessThan(
      content.indexOf("### Claim 2: DEPENDENCY")
    );
    expect(content.indexOf("### Claim 2: DEPENDENCY")).toBeLessThan(
      content.indexOf("### Claim 3: PACKAGE_SCRIPT")
    );
  });

  it("preserves scalar, object, and array claim values with trust labels", () => {
    const content = serialize().content;

    expect(content).toContain("### Claim 2: PRIMARY_LANGUAGE");
    expect(content).toContain("- Value:\n`TYPESCRIPT`");
    expect(content).toContain('"name": "AI \\"Context\\" Platform"');
    expect(content).toContain('"isPrimary": true');
    expect(content).toContain('[\n  "TYPESCRIPT",\n  "JAVASCRIPT"\n]');
    expect(content).toContain("- State: `OBSERVED`");
    expect(content).toContain("- State: `INFERRED`");
    expect(content).toContain("- Confidence: `HIGH`");
    expect(content).toContain("- Confidence: `MEDIUM`");
    expect(content).toContain("- Confidence: `LOW`");
  });

  it("preserves evidence kind, reference fields, multiple evidence items, and order", () => {
    const content = serialize().content;

    expect(content).toContain("  - Evidence 1\n    - Kind: `DEPENDENCY`");
    expect(content).toContain('"manifestPath": "package.json"');
    expect(content).toContain('"name": "react"');
    expect(content).toContain("  - Evidence 2\n    - Kind: `PROJECT_METADATA`");
    expect(content.indexOf("Kind: `DEPENDENCY`")).toBeLessThan(
      content.indexOf("Kind: `PROJECT_METADATA`")
    );
  });

  it("preserves ambiguities separately without resolving or rewriting them", () => {
    const content = serialize().content;

    expect(content).toContain("## Ambiguities");
    expect(content).toContain("### Claim 1: ANALYSIS_ISSUE");
    expect(content).toContain('"path": "apps/api/src/Prishtinë.ts"');
    expect(content).toContain('"message": "Unexpected token\\nPreserve newline"');
    expect(content).not.toMatch(/resolved ambiguity|ambiguity resolved/i);
  });

  it("renders the canonical summary without recalculating or interpreting it", () => {
    const content = serialize().content;

    expect(content).toContain("## Export Summary");
    expect(content).toContain("- Section Count: `7`");
    expect(content).toContain("- Populated Section Count: `7`");
    expect(content).toContain("- Section Claim Count: `12`");
    expect(content).toContain("- Ambiguity Count: `1`");
    expect(content).toContain("- Total Claim Count: `13`");
    expect(content).toContain("- Observed Claim Count: `8`");
    expect(content).toContain("- Inferred Claim Count: `5`");
    expect(content).toContain("- Evidence Count: `4`");
    expect(content).not.toMatch(/well documented|highly reliable/i);
  });

  it("handles empty sections and empty ambiguities without inventing negative facts", () => {
    const empty = serialize({
      ...canonical,
      sections: canonical.sections.map((section) => ({ ...section, claims: [] })),
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
    }).content;

    expect(empty.match(/Claims: \[\]/g)).toHaveLength(8);
    expect(empty).not.toMatch(/not found|not configured|not supported|not used|no testing/i);
  });

  it("escapes inline Markdown and uses safe fences for structured values", () => {
    const special = serialize({
      ...canonical,
      sections: [
        {
          key: "project",
          title: "Project # `Sensitive`",
          claims: [
            {
              type: "SPECIAL_#_`CLAIM`",
              value: "# heading *bold* _em_ - item [x](y) | <tag> `tick`",
              kind: "OBSERVED",
              confidence: "HIGH",
              evidence: [
                {
                  kind: "PROJECT_METADATA",
                  reference: {
                    kind: "PROJECT_METADATA",
                    field: "project.`field`"
                  }
                }
              ]
            },
            {
              type: "STRUCTURED_SPECIAL",
              value: {
                quote: '"',
                apostrophe: "'",
                backslash: "\\",
                unicode: "Prishtinë",
                tab: "\t",
                html: '<script>alert("x")</script>',
                markdown: "**bold** [link](https://example.com)",
                fence: '```json\n{"x": true}\n```',
                multiline: "line one\nline two"
              },
              kind: "INFERRED",
              confidence: "LOW",
              evidence: []
            }
          ]
        }
      ],
      ambiguities: [],
      summary: {
        sectionCount: 1,
        populatedSectionCount: 1,
        sectionClaimCount: 2,
        ambiguityCount: 0,
        totalClaimCount: 2,
        observedClaimCount: 1,
        inferredClaimCount: 1,
        evidenceCount: 1
      }
    }).content;

    expect(special).toContain("## Project \\# \\`Sensitive\\`");
    expect(special).toContain("### Claim 1: SPECIAL_\\#_\\`CLAIM\\`");
    expect(special).toContain("``# heading *bold* _em_ - item [x](y) | <tag> `tick```");
    expect(special).toContain("````json\n{");
    expect(special).toContain('"fence": "```json\\n{\\"x\\": true}\\n```"');
    expect(special).toContain('"unicode": "Prishtinë"');
    expect(special).toContain('"tab": "\\t"');
  });

  it("produces identical output, generates no timestamps or IDs, and does not mutate input", () => {
    const before = structuredClone(canonical);
    const first = serialize(canonical);
    const second = serialize(canonical);

    expect(first).toEqual(second);
    expect(canonical).toEqual(before);
    expect(first.content).not.toContain(String(new Date().getFullYear() + 1));
    expect(first.content).not.toMatch(/randomUUID|crypto\.randomUUID/);
  });

  it("serializes large canonical contexts completely without truncation", () => {
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
    const content = serialize({
      ...canonical,
      sections: [{ key: "technology", title: "Technology", claims }],
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
    }).content;

    expect(content.match(/### Claim /g)).toHaveLength(150);
    expect(content).toContain("@scope/really-long-dependency-name-000");
    expect(content).toContain("@scope/really-long-dependency-name-149");
  });

  it("does not add natural-language project facts, relationships, or provider-specific syntax", () => {
    const content = serialize().content;

    expect(content).not.toMatch(/appears to|based on|likely|production ready|clean architecture/i);
    expect(content).not.toContain("React is used for the frontend");
    expect(content).not.toContain("The project is a React application");
    expect(content).not.toMatch(/OpenAI|ChatGPT|Anthropic|Claude|Cursor|Copilot/);
  });
});
