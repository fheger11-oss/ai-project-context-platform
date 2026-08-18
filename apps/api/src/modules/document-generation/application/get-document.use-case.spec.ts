import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
import { DocumentNotFoundError } from "./errors/document-not-found.error.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";
import { GetDocumentUseCase } from "./get-document.use-case.js";

const projectContext = ProjectContext.create({
  contextId: "context:analysis_1:context-engine@1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const document: PersistedGeneratedDocument = {
  id: "document_1",
  projectContextId: "project_context_1",
  contextId: projectContext.contextId,
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: "# Project Overview\n",
  createdAt: new Date("2026-08-18T10:00:00.000Z")
};

function createUseCase(options: { document?: PersistedGeneratedDocument | null } = {}) {
  const projectContextReader: ProjectContextReader = {
    readProjectContext: vi.fn(async () => ({
      projectContextId: "project_context_1",
      projectContext
    }))
  };
  const documentRepository: DocumentRepository = {
    save: vi.fn(),
    findById: vi.fn(async () =>
      Object.hasOwn(options, "document") ? (options.document ?? null) : document
    ),
    listByProjectContextId: vi.fn()
  };

  return {
    projectContextReader,
    documentRepository,
    useCase: new GetDocumentUseCase(projectContextReader, documentRepository)
  };
}

describe("GetDocumentUseCase", () => {
  it("returns a document after verifying ownership through its ProjectContext", async () => {
    const { useCase, projectContextReader, documentRepository } = createUseCase();

    await expect(useCase.execute({ userId: "user_1", documentId: "document_1" })).resolves.toBe(
      document
    );
    expect(documentRepository.findById).toHaveBeenCalledWith("document_1");
    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
  });

  it("fails when the document does not exist", async () => {
    const { useCase, projectContextReader } = createUseCase({ document: null });

    await expect(useCase.execute({ userId: "user_1", documentId: "missing" })).rejects.toThrow(
      DocumentNotFoundError
    );
    expect(projectContextReader.readProjectContext).not.toHaveBeenCalled();
  });

  it("fails closed when the associated ProjectContext is unavailable", async () => {
    const { useCase, projectContextReader } = createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockResolvedValueOnce(null);

    await expect(useCase.execute({ userId: "user_1", documentId: "document_1" })).rejects.toThrow(
      ProjectContextNotFoundForDocumentGenerationError
    );
  });

  it("rejects cross-user document access through the ProjectContext ownership boundary", async () => {
    const forbidden = new ForbiddenException("Repository belongs to another user");
    const { useCase, projectContextReader } = createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockRejectedValueOnce(forbidden);

    await expect(useCase.execute({ userId: "user_2", documentId: "document_1" })).rejects.toBe(
      forbidden
    );
  });
});
