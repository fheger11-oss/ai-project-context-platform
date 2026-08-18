import { describe, expect, it, vi } from "vitest";

import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "../domain/contracts/document-generation-input.contract.js";
import type { GeneratedDocument } from "../domain/generated-document.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";
import { GenerateDocumentUseCase } from "./generate-document.use-case.js";

const projectContext = ProjectContext.create({
  contextId: "context:analysis_1:context-engine@1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const generatedDocument: GeneratedDocument = {
  contextId: projectContext.contextId,
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: "# Project Overview"
};

function createUseCase(options: { context?: ProjectContext | null } = {}) {
  const projectContextReader: ProjectContextReader = {
    readProjectContext: vi.fn(async () =>
      Object.hasOwn(options, "context") ? (options.context ?? null) : projectContext
    )
  };
  const documentGenerator: DocumentGenerator = {
    generate: vi.fn(async () => generatedDocument)
  };

  return {
    projectContextReader,
    documentGenerator,
    useCase: new GenerateDocumentUseCase(projectContextReader, documentGenerator)
  };
}

describe("GenerateDocumentUseCase", () => {
  it("resolves ProjectContext and forwards the exact DocumentGenerationInput", async () => {
    const { useCase, projectContextReader, documentGenerator } = createUseCase();

    await expect(
      useCase.execute({
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).resolves.toBe(generatedDocument);

    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      contextId: "project_context_1"
    });
    expect(documentGenerator.generate).toHaveBeenCalledWith({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } satisfies DocumentGenerationInput);
  });

  it("returns the GeneratedDocument from DocumentGenerator unchanged", async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute({
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toBe(generatedDocument);
  });

  it("fails clearly when ProjectContext cannot be resolved", async () => {
    const { useCase, documentGenerator } = createUseCase({ context: null });

    await expect(
      useCase.execute({
        contextId: "missing_context",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(ProjectContextNotFoundForDocumentGenerationError);
    expect(documentGenerator.generate).not.toHaveBeenCalled();
  });
});
