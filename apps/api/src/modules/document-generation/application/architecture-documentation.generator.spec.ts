import { describe, expect, it } from "vitest";

import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { MarkdownDocumentRenderer } from "../infrastructure/markdown-document.renderer.js";
import { ArchitectureDocumentationGenerator } from "./architecture-documentation.generator.js";

const generatedAt = new Date("2026-08-25T10:00:00.000Z");

function claim(
  value: unknown,
  kind: ContextClaim["kind"] = "OBSERVED",
  confidence: ContextClaim["confidence"] = "HIGH",
  evidence: ContextClaim["evidence"] = []
): ContextClaim {
  return {
    value,
    kind,
    confidence,
    evidence
  };
}

function sourceEvidence(path: string): ContextEvidence {
  return {
    kind: "SOURCE_STRUCTURE",
    reference: {
      kind: "SOURCE_STRUCTURE",
      path
    }
  };
}

function relationshipEvidence(sourcePath: string, specifier: string): ContextEvidence {
  return {
    kind: "RELATIONSHIP",
    reference: {
      kind: "RELATIONSHIP",
      sourcePath,
      specifier
    }
  };
}

function dependencyEvidence(manifestPath: string, name: string): ContextEvidence {
  return {
    kind: "DEPENDENCY",
    reference: {
      kind: "DEPENDENCY",
      manifestPath,
      name
    }
  };
}

function issueEvidence(
  stage: "SOURCE_STRUCTURE" | "RELATIONSHIP_ANALYSIS",
  path: string,
  code: string
): ContextEvidence {
  return {
    kind: "ISSUE",
    reference: {
      kind: "ISSUE",
      stage,
      path,
      code
    }
  };
}

function generator(): ArchitectureDocumentationGenerator {
  return new ArchitectureDocumentationGenerator(new MarkdownDocumentRenderer());
}

function baseContext(input: Partial<Parameters<typeof ProjectContext.create>[0]> = {}) {
  return ProjectContext.create({
    contextId: "context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contextVersion: "context-engine@1",
    generatedAt,
    ...input
  });
}

describe("ArchitectureDocumentationGenerator", () => {
  it("generates architecture documentation from ProjectContext architecture claims", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim({ type: "ECOSYSTEM", ecosystem: "NODE_JS" }),
          claim({ type: "FRAMEWORK", framework: "NESTJS" }, "OBSERVED", "HIGH", [
            dependencyEvidence("apps/api/package.json", "@nestjs/core")
          ]),
          claim({ type: "FRAMEWORK", framework: "REACT" }, "OBSERVED", "HIGH", [
            dependencyEvidence("apps/web/package.json", "react")
          ])
        ]
      },
      structure: {
        claims: [
          claim(
            {
              type: "SOURCE_GROUP",
              moduleId: "apps/api/src",
              path: "apps/api/src",
              sourceFileCount: 12,
              declarationCount: 30
            },
            "OBSERVED",
            "HIGH",
            [sourceEvidence("apps/api/src")]
          )
        ]
      },
      architecture: {
        claims: [
          claim(
            {
              type: "MODULE_CANDIDATE",
              moduleId: "apps/api/src/modules/auth",
              name: "auth",
              path: "apps/api/src/modules/auth",
              sourceFileCount: 6,
              declarationCount: 18,
              internalRelationshipCount: 4,
              incomingRelationshipCount: 2,
              outgoingRelationshipCount: 3
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("apps/api/src/modules/auth")]
          ),
          claim(
            {
              type: "MODULE_CANDIDATE",
              moduleId: "apps/api/src/modules/context",
              name: "context",
              path: "apps/api/src/modules/context",
              sourceFileCount: 8,
              declarationCount: 25,
              internalRelationshipCount: 5,
              incomingRelationshipCount: 1,
              outgoingRelationshipCount: 2
            },
            "INFERRED",
            "LOW",
            [sourceEvidence("apps/api/src/modules/context")]
          ),
          claim(
            {
              type: "MODULE_RELATIONSHIP",
              sourceModuleId: "apps/api/src/modules/document-generation",
              targetModuleId: "apps/api/src/modules/context",
              relationshipCount: 4
            },
            "INFERRED",
            "MEDIUM",
            [
              relationshipEvidence(
                "apps/api/src/modules/document-generation/generator.ts",
                "../../context"
              )
            ]
          )
        ]
      },
      entryPoints: {
        claims: [
          claim(
            {
              type: "SOURCE_ENTRY_POINT_CANDIDATE",
              entryPointId: "apps/api/src/main.ts",
              path: "apps/api/src/main.ts",
              outgoingRelationshipCount: 5,
              connectedSourceFileCount: 11
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("apps/api/src/main.ts")]
          )
        ]
      },
      ambiguities: [
        claim(
          {
            type: "ANALYSIS_ISSUE",
            stage: "RELATIONSHIP_ANALYSIS",
            path: "apps/api/src/modules/document-generation/generator.ts",
            code: "UNRESOLVED_IMPORT",
            message: "Could not resolve import target"
          },
          "OBSERVED",
          "HIGH",
          [
            issueEvidence(
              "RELATIONSHIP_ANALYSIS",
              "apps/api/src/modules/document-generation/generator.ts",
              "UNRESOLVED_IMPORT"
            )
          ]
        ),
        claim(
          {
            type: "ANALYSIS_ISSUE",
            stage: "PROJECT_DETECTION",
            path: "package.json",
            code: "MISSING_MANIFEST_CONTENT",
            message: "Manifest content was unavailable"
          },
          "OBSERVED",
          "HIGH",
          []
        )
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toMatchObject({
      contextId: "context_1",
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(result.content).toContain("# Architecture Documentation");
    expect(result.content).toContain("## Architecture Overview");
    expect(result.content).toContain("| Module candidates | 2 |");
    expect(result.content).toContain("| Module relationships | 1 |");
    expect(result.content).toContain("| Entry point candidates | 1 |");
    expect(result.content).toContain("## Modules");
    expect(result.content).toContain(
      "| auth | apps/api/src/modules/auth | 6 | 18 | 4 | 2 | 3 | Likely inferred |"
    );
    expect(result.content).toContain(
      "| context | apps/api/src/modules/context | 8 | 25 | 5 | 1 | 2 | Low-confidence inference |"
    );
    expect(result.content).toContain("## Module Relationships");
    expect(result.content).toContain(
      "| apps/api/src/modules/document-generation | apps/api/src/modules/context | 4 | Likely inferred |"
    );
    expect(result.content).toContain("## Source Structure");
    expect(result.content).toContain("| apps/api/src | 12 | 30 | Observed |");
    expect(result.content).toContain("## Entry Points");
    expect(result.content).toContain("| apps/api/src/main.ts | 11 | 5 | Likely inferred |");
    expect(result.content).toContain("## Technology Context");
    expect(result.content).toContain("| Node.js | Observed |");
    expect(result.content).toContain("| NestJS | Observed |");
    expect(result.content).toContain("| React | Observed |");
    expect(result.content).toContain("## Architecture Ambiguities");
    expect(result.content).toContain(
      "| Relationship analysis | apps/api/src/modules/document-generation/generator.ts | Unresolved Import | Could not resolve import target | Observed |"
    );
    expect(result.content).toContain("Sources:");
    expect(result.content).not.toContain("PROJECT_DETECTION");
    expect(result.content).not.toContain("MISSING_MANIFEST_CONTENT");
    expect(result.content).not.toContain("MODULE_CANDIDATE");
    expect(result.content).not.toContain("Observed:");
    expect(result.content).not.toContain("Evidence:");
    expect(result.content).not.toContain("Clean Architecture");
    expect(result.content).not.toContain("MVC");
    expect(result.content).not.toContain("runtime flow");
  });

  it("does not invent architecture sections when ProjectContext has no architecture data", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        technology: {
          claims: [claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 10 })]
        }
      }),
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toBe("# Architecture Documentation\n");
    expect(result.content).not.toContain("## Modules");
    expect(result.content).not.toContain("## Module Relationships");
    expect(result.content).not.toContain("## Entry Points");
    expect(result.content).not.toContain("layered architecture");
    expect(result.content).not.toContain("Clean Architecture");
    expect(result.content).not.toContain("responsible for");
  });

  it("renders the same ProjectContext byte-for-byte identically", async () => {
    const projectContext = baseContext({
      architecture: {
        claims: [
          claim(
            {
              type: "MODULE_RELATIONSHIP",
              sourceModuleId: "b",
              targetModuleId: "a",
              relationshipCount: 1
            },
            "INFERRED",
            "MEDIUM",
            [relationshipEvidence("b.ts", "./a")]
          ),
          claim(
            {
              type: "MODULE_CANDIDATE",
              moduleId: "a",
              name: "a",
              path: "src/a",
              sourceFileCount: 1,
              declarationCount: 2,
              internalRelationshipCount: 0,
              incomingRelationshipCount: 1,
              outgoingRelationshipCount: 0
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("src/a")]
          )
        ]
      }
    });
    const input = {
      projectContext,
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } as const;

    const first = await generator().generate(input);
    const second = await generator().generate(input);

    expect(second.content).toBe(first.content);
    expect(first.content).not.toContain(generatedAt.toISOString());
  });

  it("is testable with only ProjectContext, a renderer, and no repository infrastructure", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        entryPoints: {
          claims: [
            claim(
              {
                type: "SOURCE_ENTRY_POINT_CANDIDATE",
                entryPointId: "src/main.ts",
                path: "src/main.ts",
                connectedSourceFileCount: 3,
                outgoingRelationshipCount: 2
              },
              "INFERRED",
              "MEDIUM",
              [sourceEvidence("src/main.ts")]
            )
          ]
        }
      }),
      documentType: "ARCHITECTURE_DOCUMENT",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| src/main.ts | 3 | 2 | Likely inferred |");
  });

  it("rejects other document types and unsupported formats", async () => {
    const projectContext = baseContext();

    await expect(
      generator().generate({
        projectContext,
        documentType: "TECHNICAL_DOCUMENTATION",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentTypeError);
    await expect(
      generator().generate({
        projectContext,
        documentType: "ARCHITECTURE_DOCUMENT",
        format: "HTML" as "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentFormatError);
  });
});
