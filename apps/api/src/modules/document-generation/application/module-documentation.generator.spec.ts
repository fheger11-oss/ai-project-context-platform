import { describe, expect, it } from "vitest";

import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { MarkdownDocumentRenderer } from "../infrastructure/markdown-document.renderer.js";
import { ModuleDocumentationGenerator } from "./module-documentation.generator.js";

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

function generator(): ModuleDocumentationGenerator {
  return new ModuleDocumentationGenerator(new MarkdownDocumentRenderer());
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

describe("ModuleDocumentationGenerator", () => {
  it("generates module documentation from ProjectContext module claims", async () => {
    const projectContext = baseContext({
      structure: {
        claims: [
          claim(
            {
              type: "SOURCE_GROUP",
              moduleId: "apps/api/src/modules/auth",
              path: "apps/api/src/modules/auth",
              sourceFileCount: 6,
              declarationCount: 18
            },
            "OBSERVED",
            "HIGH",
            [sourceEvidence("apps/api/src/modules/auth")]
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
              sourceModuleId: "apps/api/src/modules/auth",
              targetModuleId: "apps/api/src/modules/context",
              relationshipCount: 3
            },
            "INFERRED",
            "HIGH",
            [relationshipEvidence("apps/api/src/modules/auth/auth.service.ts", "../context")]
          ),
          claim(
            {
              type: "MODULE_RELATIONSHIP",
              sourceModuleId: "apps/api/src/modules/document-generation",
              targetModuleId: "apps/api/src/modules/auth",
              relationshipCount: 1
            },
            "INFERRED",
            "MEDIUM",
            [
              relationshipEvidence(
                "apps/api/src/modules/document-generation/document.controller.ts",
                "../auth"
              )
            ]
          )
        ]
      },
      ambiguities: [
        claim(
          {
            type: "ANALYSIS_ISSUE",
            stage: "RELATIONSHIP_ANALYSIS",
            path: "apps/api/src/modules/auth/auth.service.ts",
            code: "UNRESOLVED_IMPORT",
            message: "Could not resolve import target"
          },
          "OBSERVED",
          "HIGH",
          [
            issueEvidence(
              "RELATIONSHIP_ANALYSIS",
              "apps/api/src/modules/auth/auth.service.ts",
              "UNRESOLVED_IMPORT"
            )
          ]
        )
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toMatchObject({
      contextId: "context_1",
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(result.content).toContain("# Module Documentation");
    expect(result.content).toContain("## Module Index");
    expect(result.content).toContain(
      "| auth | apps/api/src/modules/auth | 6 | 18 | Likely inferred |"
    );
    expect(result.content).toContain(
      "| context | apps/api/src/modules/context | 8 | 25 | Low-confidence inference |"
    );
    expect(result.content).toContain("## Module: auth");
    expect(result.content).toContain("| Path | apps/api/src/modules/auth |");
    expect(result.content).toContain("| Source file count | 6 |");
    expect(result.content).toContain("| Declaration count | 18 |");
    expect(result.content).toContain("| Internal relationships | 4 |");
    expect(result.content).toContain("| Incoming relationships | 2 |");
    expect(result.content).toContain("| Outgoing relationships | 3 |");
    expect(result.content).toContain("| Semantics | Likely inferred |");
    expect(result.content).toContain(
      "| Incoming | apps/api/src/modules/document-generation | apps/api/src/modules/auth | 1 | Likely inferred |"
    );
    expect(result.content).toContain(
      "| Outgoing | apps/api/src/modules/auth | apps/api/src/modules/context | 3 | Inferred |"
    );
    expect(result.content).toContain("| apps/api/src/modules/auth | 6 | 18 | Observed |");
    expect(result.content).toContain(
      "| Relationship analysis | apps/api/src/modules/auth/auth.service.ts | Unresolved import | Could not resolve import target | Observed |"
    );
    expect(result.content).toContain("Sources:");
    expect(result.content).toContain("source structure apps/api/src/modules/auth");
    expect(result.content).toContain(
      "relationship apps/api/src/modules/auth/auth.service.ts -> ../context"
    );
    expect(result.content).not.toContain("MODULE_CANDIDATE");
    expect(result.content).not.toContain("MODULE_RELATIONSHIP");
    expect(result.content).not.toContain("Observed:");
    expect(result.content).not.toContain("Evidence:");
    expect(result.content).not.toContain("responsible for");
    expect(result.content).not.toContain("API routes");
    expect(result.content).not.toContain("runtime behavior");
  });

  it("does not invent modules when ProjectContext has no module candidates", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        architecture: {
          claims: [
            claim(
              {
                type: "MODULE_RELATIONSHIP",
                sourceModuleId: "src/a",
                targetModuleId: "src/b",
                relationshipCount: 1
              },
              "INFERRED",
              "MEDIUM",
              [relationshipEvidence("src/a/index.ts", "../b")]
            )
          ]
        }
      }),
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toBe("# Module Documentation\n");
    expect(result.content).not.toContain("## Module Index");
    expect(result.content).not.toContain("## Module:");
    expect(result.content).not.toContain("src/a");
    expect(result.content).not.toContain("responsible for");
  });

  it("renders the same ProjectContext byte-for-byte identically", async () => {
    const projectContext = baseContext({
      architecture: {
        claims: [
          claim(
            {
              type: "MODULE_CANDIDATE",
              moduleId: "b",
              name: "b",
              path: "src/b",
              sourceFileCount: 2,
              declarationCount: 4,
              internalRelationshipCount: 0,
              incomingRelationshipCount: 0,
              outgoingRelationshipCount: 1
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("src/b")]
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
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } as const;

    const first = await generator().generate(input);
    const second = await generator().generate(input);

    expect(second.content).toBe(first.content);
    expect(first.content).not.toContain(generatedAt.toISOString());
    expect(first.content.indexOf("## Module: a")).toBeLessThan(
      first.content.indexOf("## Module: b")
    );
  });

  it("is testable with only ProjectContext, a renderer, and no repository infrastructure", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        architecture: {
          claims: [
            claim(
              {
                type: "MODULE_CANDIDATE",
                moduleId: "src/modules/users",
                name: "users",
                path: "src/modules/users",
                sourceFileCount: 3,
                declarationCount: 10,
                internalRelationshipCount: 1,
                incomingRelationshipCount: 0,
                outgoingRelationshipCount: 2
              },
              "INFERRED",
              "MEDIUM",
              [sourceEvidence("src/modules/users")]
            )
          ]
        }
      }),
      documentType: "MODULE_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("## Module: users");
    expect(result.content).toContain("| Outgoing relationships | 2 |");
  });

  it("rejects other document types and unsupported formats", async () => {
    const projectContext = baseContext();

    await expect(
      generator().generate({
        projectContext,
        documentType: "ARCHITECTURE_DOCUMENT",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentTypeError);
    await expect(
      generator().generate({
        projectContext,
        documentType: "MODULE_DOCUMENTATION",
        format: "HTML" as "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentFormatError);
  });
});
