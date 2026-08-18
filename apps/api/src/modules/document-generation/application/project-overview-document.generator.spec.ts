import { describe, expect, it } from "vitest";

import type { ContextClaim } from "../../context/domain/context-claim.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { MarkdownDocumentRenderer } from "../infrastructure/markdown-document.renderer.js";
import { ProjectOverviewDocumentGenerator } from "./project-overview-document.generator.js";

const generatedAt = new Date("2026-08-17T10:00:00.000Z");

function claim(
  value: unknown,
  kind: ContextClaim["kind"],
  confidence: ContextClaim["confidence"],
  evidence: ContextClaim["evidence"] = []
): ContextClaim {
  return {
    value,
    kind,
    confidence,
    evidence
  };
}

function generator(): ProjectOverviewDocumentGenerator {
  return new ProjectOverviewDocumentGenerator(new MarkdownDocumentRenderer());
}

describe("ProjectOverviewDocumentGenerator", () => {
  it("accepts ProjectContext and produces a GeneratedDocument with rendered Markdown", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt,
      technology: {
        claims: [
          claim("NestJS", "OBSERVED", "HIGH", [
            {
              kind: "DEPENDENCY",
              reference: {
                kind: "DEPENDENCY",
                manifestPath: "package.json",
                name: "@nestjs/core"
              }
            }
          ])
        ]
      }
    });

    await expect(
      generator().generate({
        projectContext,
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).resolves.toEqual({
      contextId: "context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1",
      content:
        "# Project Overview\n\n## Technology\n\n- Observed: NestJS. Evidence: dependency @nestjs/core in package.json.\n"
    });
  });

  it("renders the same input exactly the same way", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt,
      project: {
        claims: [claim("Fullstack application", "INFERRED", "MEDIUM")]
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

  it("uses deterministic section and collection ordering", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt,
      technology: {
        claims: [
          claim("zeta", "INFERRED", "LOW"),
          claim("alpha", "OBSERVED", "HIGH"),
          claim("beta", "OBSERVED", "MEDIUM")
        ]
      },
      project: {
        claims: [claim("project claim", "OBSERVED", "HIGH")]
      },
      testing: {
        claims: [claim("testing claim", "OBSERVED", "HIGH")]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toBe(
      [
        "# Project Overview",
        "",
        "## Project",
        "",
        "- Observed: project claim.",
        "",
        "## Technology",
        "",
        "- Observed: alpha.",
        "- Observed: beta.",
        "- Possible inference with low confidence: zeta.",
        "",
        "## Testing",
        "",
        "- Observed: testing claim.",
        ""
      ].join("\n")
    );
  });

  it("preserves observed, inferred, and low-confidence distinctions", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt,
      architecture: {
        claims: [
          claim("modular boundaries", "OBSERVED", "HIGH"),
          claim("service-oriented structure", "INFERRED", "HIGH"),
          claim("layered architecture", "INFERRED", "MEDIUM"),
          claim("event-driven architecture", "INFERRED", "LOW"),
          claim("deployment shape", "OBSERVED", "LOW")
        ]
      }
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toContain("- Observed: modular boundaries.");
    expect(result.content).toContain("- Inferred: service-oriented structure.");
    expect(result.content).toContain("- Likely inferred: layered architecture.");
    expect(result.content).toContain(
      "- Possible inference with low confidence: event-driven architecture."
    );
    expect(result.content).toContain("- Observed with low confidence: deployment shape.");
    expect(result.content).not.toContain("- Observed: event-driven architecture.");
  });

  it("renders concise deterministic evidence without dumping every reference", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt,
      structure: {
        claims: [
          claim("module candidates", "OBSERVED", "HIGH", [
            {
              kind: "SOURCE_STRUCTURE",
              reference: { kind: "SOURCE_STRUCTURE", path: "src/z.ts" }
            },
            {
              kind: "MANIFEST",
              reference: { kind: "MANIFEST", path: "package.json" }
            },
            {
              kind: "PROJECT_METADATA",
              reference: { kind: "PROJECT_METADATA", field: "language" }
            },
            {
              kind: "FILE_CLASSIFICATION",
              reference: { kind: "FILE_CLASSIFICATION", path: "src/a.ts" }
            }
          ])
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
      "- Observed: module candidates. Evidence: file classification src/a.ts; manifest package.json; project metadata language."
    );
    expect(result.content).not.toContain("source structure src/z.ts");
  });

  it("does not invent facts for empty Context sections", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt
    });

    const result = await generator().generate({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result.content).toBe("# Project Overview\n");
    expect(result.content).not.toContain("NestJS");
    expect(result.content).not.toContain("React");
    expect(result.content).not.toContain("uses");
  });

  it("rejects unsupported document types and formats", async () => {
    const projectContext = ProjectContext.create({
      contextId: "context_1",
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contextVersion: "context-engine@1",
      generatedAt
    });

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
