import { describe, expect, it, vi } from "vitest";

import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "../domain/contracts/document-generation-input.contract.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
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
const persistedDocument: PersistedGeneratedDocument = {
  id: "document_1",
  projectContextId: "project_context_1",
  createdAt: new Date("2026-08-18T10:00:00.000Z"),
  ...generatedDocument
};

function createUseCase(
  options: { context?: { projectContextId: string; projectContext: ProjectContext } | null } = {}
) {
  const projectContextReader: ProjectContextReader = {
    readProjectContext: vi.fn(async () =>
      Object.hasOwn(options, "context")
        ? (options.context ?? null)
        : {
            projectContextId: "project_context_1",
            projectContext
          }
    )
  };
  const documentGenerator: DocumentGenerator = {
    generate: vi.fn(async () => generatedDocument)
  };
  const documentRepository: DocumentRepository = {
    save: vi.fn(async () => persistedDocument),
    findById: vi.fn()
  };

  return {
    projectContextReader,
    documentGenerator,
    documentRepository,
    useCase: new GenerateDocumentUseCase(
      projectContextReader,
      documentGenerator,
      documentRepository
    )
  };
}

describe("GenerateDocumentUseCase", () => {
  it("resolves ProjectContext, forwards generation input, and persists the generated artifact", async () => {
    const { useCase, projectContextReader, documentGenerator, documentRepository } =
      createUseCase();

    await expect(
      useCase.execute({
        userId: "user_1",
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).resolves.toBe(persistedDocument);

    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
    expect(documentGenerator.generate).toHaveBeenCalledWith({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    } satisfies DocumentGenerationInput);
    expect(documentRepository.save).toHaveBeenCalledWith({
      projectContextId: "project_context_1",
      document: generatedDocument
    });
  });

  it("returns the persisted GeneratedDocument artifact unchanged", async () => {
    const { useCase } = createUseCase();

    const result = await useCase.execute({
      userId: "user_1",
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });

    expect(result).toBe(persistedDocument);
  });

  it("fails clearly when ProjectContext cannot be resolved", async () => {
    const { useCase, documentGenerator, documentRepository } = createUseCase({ context: null });

    await expect(
      useCase.execute({
        userId: "user_1",
        contextId: "missing_context",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toThrow(ProjectContextNotFoundForDocumentGenerationError);
    expect(documentGenerator.generate).not.toHaveBeenCalled();
    expect(documentRepository.save).not.toHaveBeenCalled();
  });

  it("does not generate or persist when ProjectContext access is rejected", async () => {
    const inaccessibleContextError = new Error("ProjectContext is not accessible");
    const { useCase, projectContextReader, documentGenerator, documentRepository } =
      createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockRejectedValueOnce(
      inaccessibleContextError
    );

    await expect(
      useCase.execute({
        userId: "user_2",
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).rejects.toBe(inaccessibleContextError);
    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      userId: "user_2",
      contextId: "project_context_1"
    });
    expect(documentGenerator.generate).not.toHaveBeenCalled();
    expect(documentRepository.save).not.toHaveBeenCalled();
  });
});
