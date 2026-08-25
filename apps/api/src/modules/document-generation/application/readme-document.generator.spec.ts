import { describe, expect, it } from "vitest";

import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { MarkdownDocumentRenderer } from "../infrastructure/markdown-document.renderer.js";
import { ReadmeDocumentGenerator } from "./readme-document.generator.js";

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
  stage: "PROJECT_DETECTION" | "SOURCE_STRUCTURE",
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

function generator(): ReadmeDocumentGenerator {
  return new ReadmeDocumentGenerator(new MarkdownDocumentRenderer());
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

describe("ReadmeDocumentGenerator", () => {
  it("generates a README-style document from supported ProjectContext facts", async () => {
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
          claim({ type: "APPLICATION_TYPE", applicationType: "FULLSTACK" }, "INFERRED", "MEDIUM", [
            {
              kind: "PROJECT_METADATA",
              reference: { kind: "PROJECT_METADATA", field: "project.frameworks" }
            }
          ])
        ]
      },
      technology: {
        claims: [
          claim({ type: "ECOSYSTEM", ecosystem: "NODE_JS" }),
          claim({ type: "ECOSYSTEM", ecosystem: "TYPESCRIPT" }),
          claim({ type: "LANGUAGE", language: "TYPESCRIPT", fileCount: 57 }),
          claim({ type: "LANGUAGE", language: "HTML", fileCount: 16 }),
          claim({ type: "FRAMEWORK", framework: "REACT" }, "OBSERVED", "HIGH", [
            dependencyEvidence("apps/web/package.json", "react")
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
              name: "react",
              version: "^19.0.0",
              dependencyType: "DEPENDENCY",
              manifestPath: "apps/web/package.json"
            },
            "OBSERVED",
            "HIGH",
            [dependencyEvidence("apps/web/package.json", "react")]
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
              name: "dev",
              command: "vite dev"
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
              moduleId: "src/components",
              path: "src/components",
              sourceFileCount: 46,
              declarationCount: 335
            },
            "OBSERVED",
            "HIGH",
            [sourceEvidence("src/components")]
          )
        ]
      },
      architecture: {
        claims: [
          claim(
            {
              type: "MODULE_CANDIDATE",
              moduleId: "src/components",
              name: "components",
              path: "src/components",
              sourceFileCount: 46,
              declarationCount: 335,
              internalRelationshipCount: 12,
              incomingRelationshipCount: 3,
              outgoingRelationshipCount: 4
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("src/components")]
          ),
          claim(
            {
              type: "MODULE_RELATIONSHIP",
              sourceModuleId: "src/routes",
              targetModuleId: "src/components",
              relationshipCount: 6
            },
            "INFERRED",
            "MEDIUM",
            [relationshipEvidence("src/routes/index.tsx", "../components")]
          )
        ]
      },
      entryPoints: {
        claims: [
          claim(
            {
              type: "SOURCE_ENTRY_POINT_CANDIDATE",
              entryPointId: "src/main.tsx",
              path: "src/main.tsx",
              outgoingRelationshipCount: 4,
              connectedSourceFileCount: 12
            },
            "INFERRED",
            "MEDIUM",
            [sourceEvidence("src/main.tsx")]
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
            [fileEvidence("src/app.spec.ts")]
          ),
          claim({ type: "TEST_FILE", path: "src/app.spec.ts" }, "OBSERVED", "HIGH", [
            fileEvidence("src/app.spec.ts")
          ])
        ]
      },
      infrastructure: {
        claims: [
          claim({ type: "CONFIGURATION_ARTIFACT", path: "vite.config.ts" }, "OBSERVED", "HIGH", [
            fileEvidence("vite.config.ts")
          ]),
          claim({ type: "CONFIGURATION_ARTIFACT", path: "tsconfig.json" }, "OBSERVED", "HIGH", [
            fileEvidence("tsconfig.json")
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
          [issueEvidence("PROJECT_DETECTION", "package.json", "MISSING_MANIFEST_CONTENT")]
        )
      ]
    });

    const result = await generator().generate({
      projectContext,
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toMatchObject({
      contextId: "context_1",
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(result.content).toContain("# ai-context-platform");
    expect(result.content).toContain("## Overview");
    expect(result.content).toContain(
      "| Primary package | ai-context-platform - 1.0.0 - `package.json` |"
    );
    expect(result.content).toContain("| Primary language | TypeScript (inferred) |");
    expect(result.content).toContain(
      "| Application type | Full-stack application (likely inferred) |"
    );
    expect(result.content).toContain("## Tech Stack");
    expect(result.content).toContain("- Node.js");
    expect(result.content).toContain("- TypeScript");
    expect(result.content).toContain("| TypeScript | 57 | Observed |");
    expect(result.content).toContain("- React");
    expect(result.content).toContain("- `package.json` - package.json (primary)");
    expect(result.content).toContain("## Project Structure");
    expect(result.content).toContain("| `src/components` | 46 | 335 | Observed |");
    expect(result.content).toContain("## Architecture");
    expect(result.content).toContain("| Module candidates | 1 |");
    expect(result.content).toContain("| Module relationships | 1 |");
    expect(result.content).toContain("- components - `src/components` (likely inferred)");
    expect(result.content).toContain("## Key Entry Points");
    expect(result.content).toContain("| `src/main.tsx` | 12 | 4 | Likely inferred |");
    expect(result.content).toContain("## Available Scripts");
    expect(result.content).toContain("| `build` | `vite build` | `package.json` | Observed |");
    expect(result.content).toContain("| `dev` | `vite dev` | `package.json` | Observed |");
    expect(result.content).toContain("## Dependencies");
    expect(result.content).toContain("| react | ^19.0.0 | Dependency | `apps/web/package.json` |");
    expect(result.content).toContain("| typescript | ^5.8.3 | Dev dependency | `package.json` |");
    expect(result.content).toContain("## Configuration");
    expect(result.content).toContain("- `tsconfig.json`");
    expect(result.content).toContain("- `vite.config.ts`");
    expect(result.content).toContain("## Testing");
    expect(result.content).toContain("| 2 | 1 | Likely inferred |");
    expect(result.content).toContain("- `src/app.spec.ts`");
    expect(result.content).toContain("## Known Limitations / Ambiguities");
    expect(result.content).toContain(
      "| Project detection | `package.json` | Missing manifest content | Manifest content was unavailable | Observed |"
    );
    expect(result.content).toContain("## Project Information");
    expect(result.content).toContain("| Context ID | context_1 |");
    expect(result.content).toContain("Sources:");
    expect(result.content).not.toContain("Observed:");
    expect(result.content).not.toContain("Evidence:");
    expect(result.content).not.toContain("MODULE_CANDIDATE");
    expect(result.content).not.toContain("PACKAGE_SCRIPT");
    expect(result.content).not.toContain("modern React application");
    expect(result.content).not.toContain("production");
    expect(result.content).not.toContain("test quality");
    expect(result.content).not.toContain("API route");
    expect(result.content).not.toContain("security posture");
  });

  it("omits unsupported README sections and does not invent descriptions or commands", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        project: {
          claims: [claim({ type: "PRIMARY_LANGUAGE", language: "TYPESCRIPT" }, "INFERRED", "HIGH")]
        }
      }),
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("# README");
    expect(result.content).toContain("## Overview");
    expect(result.content).toContain("| Primary language | TypeScript (inferred) |");
    expect(result.content).toContain("## Project Information");
    expect(result.content).not.toContain("## Available Scripts");
    expect(result.content).not.toContain("## Dependencies");
    expect(result.content).not.toContain("## Project Structure");
    expect(result.content).not.toContain("## Architecture");
    expect(result.content).not.toContain("## Key Entry Points");
    expect(result.content).not.toContain("## Configuration");
    expect(result.content).not.toContain("## Testing");
    expect(result.content).not.toContain("project description");
    expect(result.content).not.toContain("project purpose");
    expect(result.content).not.toContain("Starts development server");
    expect(result.content).not.toContain("deployment");
  });

  it("caps large dependency and ambiguity sections deterministically", async () => {
    const dependencyClaims = Array.from({ length: 14 }, (_, index) =>
      claim(
        {
          type: "DEPENDENCY",
          name: `package-${String(index).padStart(2, "0")}`,
          version: null,
          dependencyType: "DEPENDENCY",
          manifestPath: "package.json"
        },
        "OBSERVED",
        "HIGH",
        [dependencyEvidence("package.json", `package-${String(index).padStart(2, "0")}`)]
      )
    );
    const ambiguityClaims = Array.from({ length: 7 }, (_, index) =>
      claim(
        {
          type: "ANALYSIS_ISSUE",
          stage: "SOURCE_STRUCTURE",
          path: `src/file-${index}.ts`,
          code: "PARSE_ERROR",
          message: "Could not parse source file"
        },
        "OBSERVED",
        "HIGH",
        [issueEvidence("SOURCE_STRUCTURE", `src/file-${index}.ts`, "PARSE_ERROR")]
      )
    );

    const result = await generator().generate({
      projectContext: baseContext({
        technology: { claims: dependencyClaims },
        ambiguities: ambiguityClaims
      }),
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("Showing 12 of 14 dependencies in deterministic order.");
    expect(result.content).toContain("Showing 5 of 7 ambiguity records in deterministic order.");
    expect(result.content).toContain("package-00");
    expect(result.content).toContain("package-11");
    expect(result.content).not.toContain("package-12");
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
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain(
      "| ``build`docs`` | ``node -e `compile``` | `package.json` | Observed |"
    );
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
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } as const;

    const first = await generator().generate(input);
    const second = await generator().generate(input);

    expect(second.content).toBe(first.content);
  });

  it("is testable with only ProjectContext, a renderer, and no repository infrastructure", async () => {
    const result = await generator().generate({
      projectContext: baseContext({
        technology: {
          claims: [claim({ type: "FRAMEWORK", framework: "REACT" })]
        }
      }),
      documentType: "README",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("- React");
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
        documentType: "README",
        format: "HTML" as "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(InvalidDocumentFormatError);
  });
});
