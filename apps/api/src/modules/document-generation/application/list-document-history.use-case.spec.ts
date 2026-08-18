import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";
import { ListDocumentHistoryUseCase } from "./list-document-history.use-case.js";

const projectContext = ProjectContext.create({
  contextId: "context:analysis_1:context-engine@1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@1",
  generatedAt: new Date("2026-08-17T10:00:00.000Z")
});

const documents: PersistedGeneratedDocument[] = [
  {
    id: "document_2",
    projectContextId: "project_context_1",
    contextId: projectContext.contextId,
    documentType: "PROJECT_OVERVIEW",
    format: "MARKDOWN",
    generatorVersion: "document-generator@1",
    content: "# Project Overview\n\nSecond\n",
    createdAt: new Date("2026-08-18T11:00:00.000Z")
  },
  {
    id: "document_1",
    projectContextId: "project_context_1",
    contextId: projectContext.contextId,
    documentType: "PROJECT_OVERVIEW",
    format: "MARKDOWN",
    generatorVersion: "document-generator@1",
    content: "# Project Overview\n\nFirst\n",
    createdAt: new Date("2026-08-18T10:00:00.000Z")
  }
];

function createUseCase() {
  const projectContextReader: ProjectContextReader = {
    readProjectContext: vi.fn(async () => ({
      projectContextId: "project_context_1",
      projectContext
    }))
  };
  const documentRepository: DocumentRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    listByProjectContextId: vi.fn(async () => documents)
  };

  return {
    projectContextReader,
    documentRepository,
    useCase: new ListDocumentHistoryUseCase(projectContextReader, documentRepository)
  };
}

describe("ListDocumentHistoryUseCase", () => {
  it("returns immutable document history after verifying ProjectContext ownership", async () => {
    const { useCase, projectContextReader, documentRepository } = createUseCase();

    await expect(
      useCase.execute({ userId: "user_1", contextId: "project_context_1" })
    ).resolves.toBe(documents);
    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
    expect(documentRepository.listByProjectContextId).toHaveBeenCalledWith("project_context_1");
  });

  it("fails when ProjectContext cannot be resolved", async () => {
    const { useCase, projectContextReader, documentRepository } = createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockResolvedValueOnce(null);

    await expect(useCase.execute({ userId: "user_1", contextId: "missing" })).rejects.toThrow(
      ProjectContextNotFoundForDocumentGenerationError
    );
    expect(documentRepository.listByProjectContextId).not.toHaveBeenCalled();
  });

  it("rejects cross-user history access through the ProjectContext ownership boundary", async () => {
    const forbidden = new ForbiddenException("Repository belongs to another user");
    const { useCase, projectContextReader, documentRepository } = createUseCase();
    vi.mocked(projectContextReader.readProjectContext).mockRejectedValueOnce(forbidden);

    await expect(
      useCase.execute({ userId: "user_2", contextId: "project_context_1" })
    ).rejects.toBe(forbidden);
    expect(documentRepository.listByProjectContextId).not.toHaveBeenCalled();
  });
});
