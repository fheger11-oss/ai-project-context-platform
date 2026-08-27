import "reflect-metadata";

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { DocumentNotFoundError } from "../application/errors/document-not-found.error.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "../application/errors/project-context-not-found-for-document-generation.error.js";
import type { GenerateDocumentUseCase } from "../application/generate-document.use-case.js";
import type { GetDocumentUseCase } from "../application/get-document.use-case.js";
import type { ListDocumentHistoryUseCase } from "../application/list-document-history.use-case.js";
import type { RegenerateDocumentUseCase } from "../application/regenerate-document.use-case.js";
import { InvalidDocumentFormatError } from "../domain/errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import type { PersistedGeneratedDocument } from "../domain/contracts/document-repository.contract.js";
import { DocumentController } from "./document.controller.js";

const GUARDS_METADATA = "__guards__";
const API_SECURITY_METADATA = "swagger/apiSecurity";

const user = { id: "user_1" } as AuthenticatedUser;
const content = [
  "# Project Overview",
  "",
  "## Technology",
  "",
  "- Observed: framework NESTJS is present. Evidence: dependency @nestjs/core in package.json.",
  ""
].join("\n");
const persistedDocument: PersistedGeneratedDocument = {
  id: "document_1",
  projectContextId: "project_context_1",
  contextId: "context:analysis_1:context-engine@1",
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content,
  createdAt: new Date("2026-08-18T10:00:00.000Z")
};

function createController(options: { result?: PersistedGeneratedDocument; error?: Error } = {}) {
  const generateDocumentUseCase = {
    execute: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }

      return options.result ?? persistedDocument;
    })
  } as unknown as GenerateDocumentUseCase;
  const getDocumentUseCase = {
    execute: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }

      return options.result ?? persistedDocument;
    })
  } as unknown as GetDocumentUseCase;
  const listDocumentHistoryUseCase = {
    execute: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }

      return [options.result ?? persistedDocument];
    })
  } as unknown as ListDocumentHistoryUseCase;
  const regenerateDocumentUseCase = {
    execute: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }

      return options.result ?? { ...persistedDocument, id: "document_2" };
    })
  } as unknown as RegenerateDocumentUseCase;

  return {
    generateDocumentUseCase,
    getDocumentUseCase,
    listDocumentHistoryUseCase,
    regenerateDocumentUseCase,
    controller: new DocumentController(
      generateDocumentUseCase,
      getDocumentUseCase,
      listDocumentHistoryUseCase,
      regenerateDocumentUseCase
    )
  };
}

describe("DocumentController", () => {
  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DocumentController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, DocumentController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("calls the application use case with transport values and returns a stable response", async () => {
    const { controller, generateDocumentUseCase } = createController();

    await expect(
      controller.create(user, {
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN"
      })
    ).resolves.toEqual({
      id: "document_1",
      projectContextId: "project_context_1",
      contextId: "context:analysis_1:context-engine@1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1",
      content,
      createdAt: "2026-08-18T10:00:00.000Z"
    });
    expect(generateDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN"
    });
  });

  it("does not accept client authority over generator version", async () => {
    const { controller, generateDocumentUseCase } = createController();

    await controller.create(user, {
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN"
    });

    expect(generateDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN"
    });
  });

  it("preserves exact generated content returned by the application layer", async () => {
    const exactContent = "# Project Overview\n\n## Project\n\n- Observed: exact content.\n";
    const { controller } = createController({
      result: {
        ...persistedDocument,
        content: exactContent
      }
    });

    const response = await controller.create(user, {
      contextId: "project_context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN"
    });

    expect(response.content).toBe(exactContent);
  });

  it("retrieves one generated document through the application use case", async () => {
    const { controller, getDocumentUseCase } = createController();

    await expect(controller.getById(user, { documentId: "document_1" })).resolves.toMatchObject({
      id: "document_1",
      content
    });
    expect(getDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: "user_1",
      documentId: "document_1"
    });
  });

  it("lists document history through the application use case", async () => {
    const { controller, listDocumentHistoryUseCase } = createController();

    await expect(
      controller.listByContext(user, { contextId: "project_context_1" })
    ).resolves.toEqual({
      documents: [
        {
          id: "document_1",
          projectContextId: "project_context_1",
          contextId: "context:analysis_1:context-engine@1",
          documentType: "PROJECT_OVERVIEW",
          format: "MARKDOWN",
          generatorVersion: "document-generator@1",
          content,
          createdAt: "2026-08-18T10:00:00.000Z"
        }
      ]
    });
    expect(listDocumentHistoryUseCase.execute).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
  });

  it("regenerates a new generated document through the application use case", async () => {
    const { controller, regenerateDocumentUseCase } = createController();

    await expect(controller.regenerate(user, { documentId: "document_1" })).resolves.toMatchObject({
      id: "document_2",
      content
    });
    expect(regenerateDocumentUseCase.execute).toHaveBeenCalledWith({
      userId: "user_1",
      documentId: "document_1"
    });
  });

  it("maps missing ProjectContext to NotFoundException", async () => {
    const { controller } = createController({
      error: new ProjectContextNotFoundForDocumentGenerationError("missing")
    });

    await expect(
      controller.create(user, {
        contextId: "missing",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN"
      })
    ).rejects.toThrow(NotFoundException);
  });

  it("maps missing documents to NotFoundException", async () => {
    const { controller } = createController({
      error: new DocumentNotFoundError("missing")
    });

    await expect(controller.getById(user, { documentId: "missing" })).rejects.toThrow(
      NotFoundException
    );
  });

  it("preserves the existing forbidden ownership behavior for inaccessible ProjectContexts", async () => {
    const { controller } = createController({
      error: new ForbiddenException("Repository belongs to another user")
    });

    await expect(
      controller.create(user, {
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN"
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it("maps unsupported document values to BadRequestException", async () => {
    await expect(
      createController({ error: new InvalidDocumentTypeError("README") }).controller.create(user, {
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN"
      })
    ).rejects.toThrow(BadRequestException);
    await expect(
      createController({ error: new InvalidDocumentFormatError("HTML") }).controller.create(user, {
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("does not convert generator failures into unrelated client errors", async () => {
    const generatorError = new Error("generator failed");
    const { controller } = createController({ error: generatorError });

    await expect(
      controller.create(user, {
        contextId: "project_context_1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN"
      })
    ).rejects.toBe(generatorError);
  });
});
