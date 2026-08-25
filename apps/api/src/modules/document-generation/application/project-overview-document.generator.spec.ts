import { describe, expect, it } from "vitest";

import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { MarkdownDocumentRenderer } from "../infrastructure/markdown-document.renderer.js";
import { ProjectOverviewDocumentGenerator } from "./project-overview-document.generator.js";

const generatedAt = new Date("2026-08-17T10:00:00.000Z");

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

function generator(): ProjectOverviewDocumentGenerator {
  return new ProjectOverviewDocumentGenerator(new MarkdownDocumentRenderer());
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

describe("ProjectOverviewDocumentGenerator", () => {
  it("generates a human-readable Project Overview from supported ProjectContext claims", async () => {
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
              reference: { kind: "PROJECT_METADATA", field: "language" }
            }
          ]),
          claim(
            { type: "APPLICATION_TYPE", applicationType: "FULLSTACK_APPLICATION" },
            "INFERRED",
            "MEDIUM",
            [
              {
                kind: "PROJECT_METADATA",
                reference: { kind: "PROJECT_METADATA", field: "applicationType" }
              }
            ]
          )
        ]
      },
      technology: {
        claims: [
          claim({ type: "ECOSYSTEM", ecosystem: "NODE_JS" }),
          claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 42 }),
          claim({ type: "FRAMEWORK", framework: "NESTJS" }, "OBSERVED", "HIGH", [
            dependencyEvidence("apps/api/package.json", "@nestjs/core")
          ]),
          claim({ type: "PACKAGE_MANAGER", packageManager: "PNPM" }, "OBSERVED", "HIGH", [
            manifestEvidence("pnpm-lock.yaml")
          ]),
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
              dependencyType: "runtime",
              manifestPath: "apps/api/package.json"
            },
            "OBSERVED",
            "HIGH",
            [dependencyEvidence("apps/api/package.json", "@nestjs/core")]
          ),
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "package.json",
              name: "build",
              command: "pnpm -r build"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
          ),
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "apps/web/package.json",
              name: "dev",
              command: "vite --host 0.0.0.0"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("apps/web/package.json")]
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
          claim({ type: "TEST_FILE", path: "apps/api/src/app.spec.ts" }, "OBSERVED", "HIGH", [
            {
              kind: "FILE_CLASSIFICATION",
              reference: { kind: "FILE_CLASSIFICATION", path: "apps/api/src/app.spec.ts" }
            }
          ])
        ]
      },
      infrastructure: {
        claims: [
          claim({ type: "CONFIGURATION_ARTIFACT", path: "eslint.config.js" }, "OBSERVED", "HIGH", [
            {
              kind: "FILE_CLASSIFICATION",
              reference: { kind: "FILE_CLASSIFICATION", path: "eslint.config.js" }
            }
          ])
        ]
      },
      ambiguities: [
        claim(
          {
            type: "ANALYSIS_ISSUE",
            stage: "SOURCE_STRUCTURE",
            path: "src/broken.ts",
            code: "PARSE_ERROR",
            message: "Could not parse source file"
          },
          "OBSERVED",
          "HIGH",
          [
            {
              kind: "ISSUE",
              reference: {
                kind: "ISSUE",
                stage: "SOURCE_STRUCTURE",
                path: "src/broken.ts",
                code: "PARSE_ERROR"
              }
            }
          ]
        )
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toMatchObject({
      contextId: "context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(result.content).toContain("## Project");
    expect(result.content).toContain(
      "| Package | ai-context-platform — 1.0.0 — `package.json` — primary package | Observed |"
    );
    expect(result.content).toContain("| Primary language | TypeScript | inferred |");
    expect(result.content).toContain(
      "| Application type | Full-stack application | likely inferred |"
    );
    expect(result.content).toContain("## Technology Stack");
    expect(result.content).toContain("Ecosystems\n\n- Node.js");
    expect(result.content).toContain("| TypeScript | 42 | Observed |");
    expect(result.content).toContain("Frameworks\n\n- NestJS");
    expect(result.content).toContain("Package Managers\n\n- pnpm");
    expect(result.content).toContain("| package.json | package.json | yes | Observed |");
    expect(result.content).toContain("## Dependencies");
    expect(result.content).toContain(
      "| @nestjs/core | ^10.0.0 | Runtime | apps/api/package.json |"
    );
    expect(result.content).toContain("## Available Scripts");
    expect(result.content).toContain("| apps/web/package.json | dev | `vite --host 0.0.0.0` |");
    expect(result.content).toContain("| package.json | build | `pnpm -r build` |");
    expect(result.content).toContain("| apps/api/src | 12 | 30 | Observed |");
    expect(result.content).toContain("## Architecture / Key Structure");
    expect(result.content).toContain(
      "| modules | apps/api/src/modules | 8 | 20 | 6 | 1 | 3 | likely inferred |"
    );
    expect(result.content).toContain(
      "- `apps/api/src/main.ts` — 11 connected source files, 5 outgoing relationships (likely inferred)"
    );
    expect(result.content).toContain("| apps/api/src/app.spec.ts | Observed |");
    expect(result.content).toContain("| eslint.config.js | Observed |");
    expect(result.content).toContain(
      "- Parse Error during Source Structure at `src/broken.ts`: Could not parse source file"
    );
    expect(result.content).toContain("Sources: manifest package.json;");
    expect(result.content).not.toContain("Observed:");
    expect(result.content).not.toContain("Inferred:");
    expect(result.content).not.toContain("Likely inferred:");
    expect(result.content).not.toContain("Evidence:");
    expect(result.content).not.toContain("FULLSTACK_APPLICATION");
    expect(result.content).not.toContain("TYPESCRIPT");
    expect(result.content).not.toContain("NESTJS");
  });

  it("renders actual package scripts with exact commands and manifest association", async () => {
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
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| apps/api/package.json | build | `nest build` |");
    expect(result.content).toContain("| apps/web/package.json | build | `vite build` |");
    expect(result.content).not.toContain("production deployment");
    expect(result.content).not.toContain("test quality");
  });

  it("projects the manual-output shape into readable technology and script sections", async () => {
    const projectContext = baseContext({
      project: {
        claims: [
          claim({ type: "PRIMARY_LANGUAGE", language: "TYPESCRIPT" }, "INFERRED", "HIGH", [
            {
              kind: "PROJECT_METADATA",
              reference: { kind: "PROJECT_METADATA", field: "project.languages" }
            }
          ])
        ]
      },
      technology: {
        claims: [
          claim({ type: "ECOSYSTEM", ecosystem: "JAVASCRIPT" }),
          claim({ type: "ECOSYSTEM", ecosystem: "NODE_JS" }),
          claim({ type: "ECOSYSTEM", ecosystem: "TYPESCRIPT" }),
          claim({ type: "LANGUAGE", language: "HTML", fileCount: 16 }),
          claim({ type: "LANGUAGE", language: "CSS", fileCount: 3 }),
          claim({ type: "LANGUAGE", language: "JAVASCRIPT", fileCount: 4 }),
          claim({ type: "LANGUAGE", language: "JSON", fileCount: 4 }),
          claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 57 }),
          claim(
            {
              type: "MANIFEST",
              path: "tsconfig.json",
              manifestType: "TSCONFIG",
              isPrimary: false
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("tsconfig.json")]
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
              type: "PACKAGE_SCRIPT",
              manifestPath: "package.json",
              name: "dev",
              command: "vite"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
          ),
          claim(
            {
              type: "PACKAGE_SCRIPT",
              manifestPath: "package.json",
              name: "build",
              command: "vite build"
            },
            "OBSERVED",
            "HIGH",
            [manifestEvidence("package.json")]
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
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| Primary language | TypeScript | inferred |");
    expect(result.content).toContain("Ecosystems\n\n- JavaScript\n- Node.js\n- TypeScript");
    expect(result.content).toContain(
      "| TypeScript | 57 | Observed |\n| HTML | 16 | Observed |\n| JavaScript | 4 | Observed |\n| JSON | 4 | Observed |\n| CSS | 3 | Observed |"
    );
    expect(result.content).toContain("| package.json | package.json | yes | Observed |");
    expect(result.content).toContain("| tsconfig.json | tsconfig.json | no | Observed |");
    expect(result.content).toContain("| package.json | build | `vite build` |");
    expect(result.content).toContain("| package.json | dev | `vite` |");
    expect(result.content).toContain("| package.json | test | `vitest` |");
    expect(result.content).not.toContain("Observed:");
    expect(result.content).not.toContain("Inferred:");
    expect(result.content).not.toContain("Evidence:");
    expect(result.content).not.toContain("NODE_JS");
    expect(result.content).not.toContain("TSCONFIG");
    expect(result.content).not.toContain("production deployment");
    expect(result.content).not.toContain("test quality");
  });

  it("does not invent project descriptions, conventional scripts, modules, or entry points", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        project: {
          claims: [
            claim(
              {
                type: "PROJECT_PACKAGE",
                path: "package.json",
                name: "known-package",
                isPrimary: true
              },
              "OBSERVED",
              "HIGH",
              [manifestEvidence("package.json")]
            )
          ]
        }
      }),
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("known-package");
    expect(result.content).not.toContain("description");
    expect(result.content).not.toContain("purpose");
    expect(result.content).not.toContain("## Available Scripts");
    expect(result.content).not.toContain("## Project Structure");
    expect(result.content).not.toContain("## Key Entry Points");
    expect(result.content).not.toContain("dev");
    expect(result.content).not.toContain("start");
    expect(result.content).not.toContain("build");
    expect(result.content).not.toContain("test");
  });

  it("preserves observed, inferred, and low-confidence distinctions", async () => {
    const projectContext = baseContext({
      architecture: {
        claims: [
          claim({
            type: "MODULE_RELATIONSHIP",
            sourceModuleId: "api",
            targetModuleId: "web",
            relationshipCount: 1
          }),
          claim(
            {
              type: "MODULE_CANDIDATE",
              moduleId: "src/events",
              name: "events",
              path: "src/events",
              sourceFileCount: 2,
              declarationCount: 4,
              internalRelationshipCount: 1,
              incomingRelationshipCount: 0,
              outgoingRelationshipCount: 2
            },
            "INFERRED",
            "LOW"
          )
        ]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| api | web | 1 | Observed |");
    expect(result.content).toContain(
      "| events | src/events | 2 | 4 | 1 | 0 | 2 | low-confidence inference |"
    );
    expect(result.content).not.toContain("- Observed:");
  });

  it("keeps dependency rows when optional metadata is missing", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim(
            {
              type: "DEPENDENCY",
              name: "left-pad",
              dependencyType: "optional",
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
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("| left-pad |  | Optional | package.json |");
  });

  it("renders concise deterministic evidence without dumping every reference", async () => {
    const projectContext = baseContext({
      structure: {
        claims: [
          claim(
            {
              type: "SOURCE_GROUP",
              moduleId: "src/api",
              path: "src/api",
              sourceFileCount: 2,
              declarationCount: 5
            },
            "OBSERVED",
            "HIGH",
            [
              sourceEvidence("src/z.ts"),
              manifestEvidence("package.json"),
              {
                kind: "PROJECT_METADATA",
                reference: { kind: "PROJECT_METADATA", field: "language" }
              },
              {
                kind: "FILE_CLASSIFICATION",
                reference: { kind: "FILE_CLASSIFICATION", path: "src/a.ts" }
              }
            ]
          )
        ]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain(
      "Sources: file classification src/a.ts; manifest package.json; project metadata language."
    );
    expect(result.content).not.toContain("source structure src/z.ts");
    expect(result.content).not.toContain("Evidence:");
  });

  it("deduplicates and bounds ambiguity details so they do not dominate the overview", async () => {
    const ambiguity = (path: string, codeValue: string, message: string) =>
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
        ambiguity("src/a.ts", "PARSE_ERROR", "Could not parse source file"),
        ambiguity("src/a.ts", "PARSE_ERROR", "Could not parse source file"),
        ambiguity("src/b.ts", "PARSE_ERROR", "Could not parse source file"),
        ambiguity("src/c.ts", "EMPTY_SOURCE", "Source file was empty"),
        ambiguity("src/d.ts", "UNSUPPORTED_SOURCE", "Unsupported source file"),
        ambiguity("src/e.ts", "PARSE_ERROR", "Could not parse source file"),
        ambiguity("src/f.ts", "PARSE_ERROR", "Could not parse source file")
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(
      result.content.match(/Parse Error during Source Structure at `src\/a\.ts`/g)
    ).toHaveLength(1);
    expect(result.content).toContain("1 additional ambiguity present in ProjectContext.");
    expect(result.content).not.toContain("src/d.ts");
    expect(result.content).toContain("Sources:");
  });

  it("renders the same input exactly the same way", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [
          claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 10 }),
          claim({ type: "LANGUAGE", language: "JAVASCRIPT", fileCount: 4 })
        ]
      }
    });
    const input = {
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } as const;

    const first = await generator().generate(input);
    const second = await generator().generate(input);

    expect(second.content).toBe(first.content);
    expect(first.content).not.toContain(new Date().toISOString());
    expect(first.content).not.toContain(generatedAt.toISOString());
  });

  it("produces valid minimal Markdown without invented facts", async () => {
    const result = await generator().generate({
      projectContext: baseContext(),
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toBe("# Project Overview\n");
    expect(result.content).not.toContain("NestJS");
    expect(result.content).not.toContain("React");
    expect(result.content).not.toContain("uses");
  });

  it("is testable with only ProjectContext, a renderer, and no repository infrastructure", async () => {
    const projectContext = baseContext({
      technology: {
        claims: [claim({ type: "FRAMEWORK", framework: "REACT" })]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("Frameworks\n\n- React");
  });

  it("rejects unsupported document types and formats", async () => {
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
        documentType: "README" as "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentTypeError);
    await expect(
      generator().generate({
        projectContext,
        documentType: "PROJECT_OVERVIEW",
        format: "HTML" as "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentFormatError);
  });
});
