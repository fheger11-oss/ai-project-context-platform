import { describe, expect, it } from "vitest";

import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { MarkdownDocumentRenderer } from "../infrastructure/markdown-document.renderer.js";
import { TechnicalDocumentationGenerator } from "./technical-documentation.generator.js";

const generatedAt = new Date("2026-08-21T10:00:00.000Z");

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

function manifestEvidence(path: string): ContextEvidence {
  return {
    kind: "MANIFEST",
    reference: {
      kind: "MANIFEST",
      path
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

function sourceEvidence(path: string): ContextEvidence {
  return {
    kind: "SOURCE_STRUCTURE",
    reference: {
      kind: "SOURCE_STRUCTURE",
      path
    }
  };
}

function fileEvidence(path: string): ContextEvidence {
  return {
    kind: "FILE_CLASSIFICATION",
    reference: {
      kind: "FILE_CLASSIFICATION",
      path
    }
  };
}

function generator(): TechnicalDocumentationGenerator {
  return new TechnicalDocumentationGenerator(new MarkdownDocumentRenderer());
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

describe("TechnicalDocumentationGenerator", () => {
  it("generates technical documentation from supported ProjectContext claims", async () => {
    const projectContext = baseContext({
      project: {
        claims: [
          claim(
            {
              type: "PROJECT_PACKAGE",
              path: "package.json",
              name: "ai-context-platform",
              version: "1.0.0",
              isPrimary: true
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
          ),
          claim({ type: "PRIMARY_LANGUAGE", language: "TYPESCRIPT" }, "INFERRED", "HIGH", [
            {
              kind: "PROJECT_METADATA",
              reference: { kind: "PROJECT_METADATA", field: "project.languages" }
            }
          ]),
          claim(
            { type: "APPLICATION_TYPE", applicationType: "FULLSTACK_APPLICATION" },
            "INFERRED",
            "MEDIUM",
            [
              {
                kind: "PROJECT_METADATA",
                reference: { kind: "PROJECT_METADATA", field: "project.frameworks" }
              }
            ]
          )
        ]
      },
      technology: {
        claims: [
          claim({ type: "ECOSYSTEM", ecosystem: "NODE_JS" }),
          claim({ type: "ECOSYSTEM", ecosystem: "TYPESCRIPT" }),
          claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 57 }),
          claim({ type: "LANGUAGE", language: "HTML", fileCount: 16 }),
          claim({ type: "FRAMEWORK", framework: "NESTJS" }, "OBSERVED", "HIGH", [
            dependencyEvidence("apps/api/package.json", "@nestjs/core")
          ]),
          claim({ type: "PACKAGE_MANAGER", packageManager: "PNPM" }, "OBSERVED", "HIGH", [
            manifestEvidence("pnpm-lock.yaml")
          ]),
          claim(
            {
              type: "MANIFEST",
              path: "apps/api/package.json",
              manifestType: "PACKAGE_JSON",
              isPrimary: false
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("apps/api/package.json")]
          ),
          claim(
            {
              type: "MANIFEST",
              path: "package.json",
              manifestType: "PACKAGE_JSON",
              isPrimary: true
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
          ),
          claim(
            {
              type: "DEPENDENCY",
              name: "@nestjs/core",
              version: "^10.0.0",
              dependencyType: "DEPENDENCY",
              manifestPath: "apps/api/package.json"
            },
            "OBSERVED",
            "HIGH",
            [dependencyEvidence("apps/api/package.json", "@nestjs/core")]
          ),
          claim(
            {
              type: "DEPENDENCY",
              name: "typescript",
              version: "^5.8.3",
              dependencyType: "DEV_DEPENDENCY",
              manifestPath: "package.json"
            },
            "OBSERVED",
            "HIGH",
            [dependencyEvidence("package.json", "typescript")]
          ),
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "apps/api/package.json",
              name: "build",
              command: "nest build"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("apps/api/package.json")]
          ),
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "package.json",
              name: "test",
              command: "vitest"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
          )
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
              moduleId: "apps/api/src/modules",
              name: "modules",
              path: "apps/api/src/modules",
              sourceFileCount: 8,
              declarationCount: 20,
              internalRelationshipCount: 6,
              incomingRelationshipCount: 1,
              outgoingRelationshipCount: 3
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("apps/api/src/modules")]
          ),
          claim(
            {
              type: "MODULE_RELATIONSHIP",
              sourceModuleId: "apps/api",
              targetModuleId: "packages/contracts",
              relationshipCount: 4
            },
            "INFERRED",
            "MEDIUM",
            [
              {
                kind: "RELATIONSHIP",
                reference: {
                  kind: "RELATIONSHIP",
                  sourcePath: "apps/api/src/main.ts",
                  specifier: "@ai-context/contracts"
                }
              }
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
      testing: {
        claims: [
          claim(
            {
              type: "TESTING_ARTIFACTS_PRESENT",
              testFileCount: 2,
              structuredTestFileCount: 1
            },
            "INFERRED",
            "MEDIUM",
            [fileEvidence("apps/api/src/app.spec.ts")]
          ),
          claim({ type: "TEST_FILE", path: "apps/api/src/app.spec.ts" }, "OBSERVED", "HIGH", [
            fileEvidence("apps/api/src/app.spec.ts")
          ]),
          claim(
            {
              type: "TEST_SOURCE_STRUCTURE",
              path: "apps/api/src/app.spec.ts",
              declarationCount: 3
            },
            "OBSERVED",
            "HIGH",
            [sourceEvidence("apps/api/src/app.spec.ts")]
          )
        ]
      },
      infrastructure: {
        claims: [
          claim(
            { type: "CONFIGURATION_ARTIFACTS_PRESENT", artifactCount: 2 },
            "INFERRED",
            "MEDIUM",
            [fileEvidence("eslint.config.js")]
          ),
          claim({ type: "CONFIGURATION_ARTIFACT", path: "eslint.config.js" }, "OBSERVED", "HIGH", [
            fileEvidence("eslint.config.js")
          ]),
          claim({ type: "INFRASTRUCTURE_ARTIFACT", path: "Dockerfile" }, "OBSERVED", "HIGH", [
            fileEvidence("Dockerfile")
          ])
        ]
      },
      ambiguities: [
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
          [
            {
              kind: "ISSUE",
              reference: {
                kind: "ISSUE",
                stage: "PROJECT_DETECTION",
                path: "package.json",
                code: "MISSING_MANIFEST_CONTENT"
              }
            }
          ]
        )
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toMatchObject({
      contextId: "context_1",
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(result.content).toContain("# Technical Documentation");
    expect(result.content).toContain("## Project Identity");
    expect(result.content).toContain(
      "| Primary package | ai-context-platform — 1.0.0 — package.json | Observed |"
    );
    expect(result.content).toContain("| Primary language | TypeScript | Inferred |");
    expect(result.content).toContain(
      "| Application type | Full-stack application | Likely inferred |"
    );
    expect(result.content).toContain("| Package manager | pnpm | Observed |");
    expect(result.content).toContain(
      "| Primary manifest | package.json — package.json | Observed |"
    );
    expect(result.content).toContain("## Technology Stack");
    expect(result.content).toContain("| Ecosystem | Semantics |");
    expect(result.content).toContain("| Node.js | Observed |");
    expect(result.content).toContain("| TypeScript | 57 | Observed |");
    expect(result.content).toContain("| NestJS | Observed |");
    expect(result.content).toContain("| pnpm | Observed |");
    expect(result.content).toContain("| package.json | package.json | yes | Observed |");
    expect(result.content).toContain("## Packages and Dependencies");
    expect(result.content).toContain(
      "| package.json | ai-context-platform | 1.0.0 | yes | Observed |"
    );
    expect(result.content).toContain(
      "| apps/api/package.json | @nestjs/core | ^10.0.0 | Dependency | Observed |"
    );
    expect(result.content).toContain(
      "| package.json | typescript | ^5.8.3 | Dev dependency | Observed |"
    );
    expect(result.content).toContain("## Available Scripts");
    expect(result.content).toContain("| apps/api/package.json | build | `nest build` |");
    expect(result.content).toContain("| package.json | test | `vitest` |");
    expect(result.content).toContain("## Project Structure");
    expect(result.content).toContain("| apps/api/src | 12 | 30 | Observed |");
    expect(result.content).toContain("## Modules");
    expect(result.content).toContain(
      "| modules | apps/api/src/modules | 8 | 20 | 6 | 1 | 3 | Likely inferred |"
    );
    expect(result.content).toContain("## Module Relationships");
    expect(result.content).toContain("| apps/api | packages/contracts | 4 | Likely inferred |");
    expect(result.content).toContain("## Entry Point Candidates");
    expect(result.content).toContain("| apps/api/src/main.ts | 11 | 5 | Likely inferred |");
    expect(result.content).toContain("## Configuration and Infrastructure");
    expect(result.content).toContain("| eslint.config.js | Observed |");
    expect(result.content).toContain("| Dockerfile | Observed |");
    expect(result.content).toContain("## Testing");
    expect(result.content).toContain("| apps/api/src/app.spec.ts | Observed |");
    expect(result.content).toContain("| 2 | 1 | Likely inferred |");
    expect(result.content).toContain("## Technical Ambiguities");
    expect(result.content).toContain(
      "| Project detection | package.json | Missing manifest content | Manifest content was unavailable | Observed |"
    );
    expect(result.content).toContain("Sources:");
    expect(result.content).not.toContain("Observed:");
    expect(result.content).not.toContain("Evidence:");
    expect(result.content).not.toContain("NODE_JS");
    expect(result.content).not.toContain("PACKAGE_SCRIPT");
    expect(result.content).not.toContain("MODULE_CANDIDATE");
    expect(result.content).not.toContain("production");
    expect(result.content).not.toContain("test quality");
    expect(result.content).not.toContain("API route");
    expect(result.content).not.toContain("security posture");
  });

  it("preserves exact script commands and keeps multiple manifests distinct", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "apps/api/package.json",
              name: "build",
              command: "nest build"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("apps/api/package.json")]
          ),
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "apps/web/package.json",
              name: "build",
              command: "vite build"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("apps/web/package.json")]
          )
        ]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| apps/api/package.json | build | `nest build` |");
    expect(result.content).toContain("| apps/web/package.json | build | `vite build` |");
    expect(result.content).not.toContain("Builds the production application");
  });

  it("keeps dependency rows when optional metadata is missing", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim(
            {
              type: "DEPENDENCY",
              name: "left-pad",
              dependencyType: "OPTIONAL_DEPENDENCY",
              manifestPath: "package.json"
            },
            "OBSERVED",
            "HIGH",
            [dependencyEvidence("package.json", "left-pad")]
          )
        ]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain(
      "| package.json | left-pad |  | Optional dependency | Observed |"
    );
  });

  it("deduplicates identical technical ambiguity rows without hiding distinct issues", async () => {
    const issue = (path: string, codeValue: string, message: string) =>
      claim(
        {
          type: "ANALYSIS_ISSUE",
          stage: "SOURCE_STRUCTURE",
          path,
          code: codeValue,
          message
        },
        "OBSERVED",
        "HIGH",
        [
          {
            kind: "ISSUE",
            reference: {
              kind: "ISSUE",
              stage: "SOURCE_STRUCTURE",
              path,
              code: codeValue
            }
          }
        ]
      );
    const projectContext = baseContext({
      ambiguities: [
        issue("src/a.ts", "PARSE_ERROR", "Could not parse source file"),
        issue("src/a.ts", "PARSE_ERROR", "Could not parse source file"),
        issue("src/b.ts", "EMPTY_SOURCE", "Source file was empty")
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(
      result.content.match(
        /\| Source structure \| src\/a\.ts \| Parse Error \| Could not parse source file \| Observed \|/g
      )
    ).toHaveLength(1);
    expect(result.content).toContain(
      "| Source structure | src/b.ts | Empty Source | Source file was empty | Observed |"
    );
    expect(result.content).toContain("Sources:");
  });

  it("renders context values containing backticks without breaking inline code spans", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "package.json",
              name: "build`docs",
              command: "node -e `compile`"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
          )
        ]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| package.json | build`docs | ``node -e `compile``` |");
  });

  it("does not invent unsupported sections or conventional commands", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        technology: {
          claims: [claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 10 })]
        }
      }),
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("## Technology Stack");
    expect(result.content).not.toContain("## Available Scripts");
    expect(result.content).not.toContain("## Project Identity");
    expect(result.content).not.toContain("## Project Structure");
    expect(result.content).not.toContain("## Modules");
    expect(result.content).not.toContain("## Entry Point Candidates");
    expect(result.content).not.toContain("dev");
    expect(result.content).not.toContain("start");
    expect(result.content).not.toContain("build");
    expect(result.content).not.toContain("test");
    expect(result.content).not.toContain("project purpose");
    expect(result.content).not.toContain("deployment");
    expect(result.content).not.toContain("runtime behavior");
  });

  it("renders the same ProjectContext byte-for-byte identically", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim({ type: "LANGUAGE", language: "JAVASCRIPT", fileCount: 4 }),
          claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 10 })
        ]
      }
    });
    const input = {
      projectContext,
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } as const;

    const first = await generator().generate(input);
    const second = await generator().generate(input);

    expect(second.content).toBe(first.content);
    expect(first.content).not.toContain(generatedAt.toISOString());
  });

  it("produces valid minimal Markdown without invented facts", async () => {
    const result = await generator().generate({
      projectContext: baseContext(),
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toBe("# Technical Documentation\n");
    expect(result.content).not.toContain("NestJS");
    expect(result.content).not.toContain("React");
    expect(result.content).not.toContain("uses");
  });

  it("is testable with only ProjectContext, a renderer, and no repository infrastructure", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        technology: {
          claims: [claim({ type: "FRAMEWORK", framework: "REACT" })]
        }
      }),
      documentType: "TECHNICAL_DOCUMENTATION",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| React | Observed |");
  });

  it("rejects other document types and unsupported formats", async () => {
    const projectContext = baseContext();

    await expect(
      generator().generate({
        projectContext,
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentTypeError);
    await expect(
      generator().generate({
        projectContext,
        documentType: "TECHNICAL_DOCUMENTATION",
        format: "HTML" as "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentFormatError);
  });
});
