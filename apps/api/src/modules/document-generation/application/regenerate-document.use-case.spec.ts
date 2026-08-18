import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
import type { GeneratedDocument } from "../domain/generated-document.js";
import { DocumentNotFoundError } from "./errors/document-not-found.error.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";
import { RegenerateDocumentUseCase } from "./regenerate-document.use-case.js";

const projectContext = ProjectContext.create({
  contextId: "context:analysis_1:context-engine@1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const originalDocument: PersistedGeneratedDocument = {
  id: "document_1",
  projectContextId: "project_context_1",
  contextId: projectContext.contextId,
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: "# Project Overview\n\nOriginal\n",
  createdAt: new Date("2026-08-18T10:00:00.000Z")
};
const regeneratedDocument: GeneratedDocument = {
  contextId: projectContext.contextId,
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: "# Project Overview\n\nOriginal\n"
};
const persistedRegeneratedDocument: PersistedGeneratedDocument = {
  id: "document_2",
  projectContextId: "project_context_1",
  createdAt: new Date("2026-08-18T11:00:00.000Z"),
  ...regeneratedDocument
};

function createUseCase(options: { original?: PersistedGeneratedDocument | null } = {}) {
  const projectContextReader: ProjectContextReader = {
    readProjectContext: vi.fn(async () => ({
      projectContextId: "project_context_1",
      projectContext
    }))
  };
  const documentGenerator: DocumentGenerator = {
    generate: vi.fn(async () => regeneratedDocument)
  };
  const documentRepository: DocumentRepository = {
    save: vi.fn(async () => persistedRegeneratedDocument),
    findById: vi.fn(async () =>
      Object.hasOwn(options, "original") ? (options.original ?? null) : originalDocument
    ),
    listByProjectContextId: vi.fn()
  };

  return {
    projectContextReader,
    documentGenerator,
    documentRepository,
    useCase: new RegenerateDocumentUseCase(
      projectContextReader,
      documentGenerator,
      documentRepository
    )
  };
}

describe("RegenerateDocumentUseCase", () => {
  it("creates a new immutable artifact from the original document ProjectContext", async () => {
    const { useCase, projectContextReader, documentGenerator, documentRepository } =
      createUseCase();

    await expect(useCase.execute({ userId: "user_1", documentId: "document_1" })).resolves.toBe(
      persistedRegeneratedDocument
    );

    expect(documentRepository.findById).toHaveBeenCalledWith("document_1");
    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
    expect(documentGenerator.generate).toHaveBeenCalledWith({
      projectContext,
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1"
    });
    expect(documentRepository.save).toHaveBeenCalledWith({
      projectContextId: "project_context_1",
      document: regeneratedDocument
    });
    expect(persistedRegeneratedDocument.id).not.toBe(originalDocument.id);
    expect(persistedRegeneratedDocument.createdAt).not.toBe(originalDocument.createdAt);
    expect(originalDocument.content).toBe("# Project Overview\n\nOriginal\n");
  });

  it("preserves deterministic content and provenance when regenerating the same input", async () => {
    const { useCase } = createUseCase();

    const first = await useCase.execute({ userId: "user_1", documentId: "document_1" });
    const second = await useCase.execute({ userId: "user_1", documentId: "document_1" });

    expect(second.content).toBe(first.content);
    expect(second.projectContextId).toBe(first.projectContextId);
    expect(second.contextId).toBe(first.contextId);
    expect(second.documentType).toBe(first.documentType);
    expect(second.format).toBe(first.format);
    expect(second.generatorVersion).toBe(first.generatorVersion);
  });

  it("fails when the original document does not exist", async () => {
    const { useCase, projectContextReader, documentGenerator, documentRepository } = createUseCase({
      original: null
    });

    await expect(useCase.execute({ userId: "user_1", documentId: "missing" })).rejects.toThrow(
      DocumentNotFoundError
    );
    expect(projectContextReader.readProjectContext).not.toHaveBeenCalled();
    expect(documentGenerator.generate).not.toHaveBeenCalled();
    expect(documentRepository.save).not.toHaveBeenCalled();
  });

  it("fails closed when the original ProjectContext is unavailable", async () => {
    const { useCase, projectContextReader, documentGenerator, documentRepository } =
      createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockResolvedValueOnce(null);

    await expect(useCase.execute({ userId: "user_1", documentId: "document_1" })).rejects.toThrow(
      ProjectContextNotFoundForDocumentGenerationError
    );
    expect(documentGenerator.generate).not.toHaveBeenCalled();
    expect(documentRepository.save).not.toHaveBeenCalled();
  });

  it("rejects cross-user regeneration through the ProjectContext ownership boundary", async () => {
    const forbidden = new ForbiddenException("Repository belongs to another user");
    const { useCase, projectContextReader, documentGenerator, documentRepository } =
      createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockRejectedValueOnce(forbidden);

    await expect(useCase.execute({ userId: "user_2", documentId: "document_1" })).rejects.toBe(
      forbidden
    );
    expect(documentGenerator.generate).not.toHaveBeenCalled();
    expect(documentRepository.save).not.toHaveBeenCalled();
  });
});
