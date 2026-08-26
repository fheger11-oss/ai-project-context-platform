import "reflect-metadata";

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../../auth/guards/roles.guard.js";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.js";
import { ProjectContextNotFoundForAiExportError } from "../application/errors/project-context-not-found-for-ai-export.error.js";
import type { GenerateAiExportUseCase } from "../application/generate-ai-export.use-case.js";
import { InvalidAiExportFormatError } from "../domain/errors/invalid-ai-export-format.error.js";
import { AiExportController } from "./ai-export.controller.js";

const GUARDS_METADATA = "__guards__";
const API_SECURITY_METADATA = "swagger/apiSecurity";

const user = { id: "user_1" } as AuthenticatedUser;
const generated = {
  projectContextId: "project_context_1",
  contextId: "context:analysis_1:context-engine@5.7.1",
  exportVersion: "ai-export@1",
  contextVersion: "context-engine@5.7.1",
  result: {
    format: "TEXT" as const,
    contentType: "text/plain; charset=utf-8",
    filename: "ai-context.txt",
    content: "AI PROJECT CONTEXT\n"
  }
};

function createController(options: { error?: Error; result?: typeof generated } = {}) {
  const generateAiExportUseCase = {
    execute: vi.fn(async () => {
      if (options.error) {
        throw options.error;
      }

      return options.result ?? generated;
    })
  } as unknown as GenerateAiExportUseCase;

  const response = {
    setHeader: vi.fn()
  };

  return {
    generateAiExportUseCase,
    response,
    controller: new AiExportController(generateAiExportUseCase)
  };
}

describe("AiExportController", () => {
  it("uses the existing Auth guard mechanism and Swagger bearer auth", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AiExportController) as unknown[];
    const security = Reflect.getMetadata(API_SECURITY_METADATA, AiExportController) as Array<
      Record<string, string[]>
    >;

    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(security).toContainEqual({ bearer: [] });
  });

  it("returns a JSON API response by default with the generated content metadata", async () => {
    const { controller, generateAiExportUseCase, response } = createController();

    await expect(
      controller.exportContext(
        user,
        { contextId: "project_context_1" },
        { format: "TEXT", download: false },
        response as never
      )
    ).resolves.toEqual({
      projectContextId: "project_context_1",
      contextId: "context:analysis_1:context-engine@5.7.1",
      format: "TEXT",
      exportVersion: "ai-export@1",
      contextVersion: "context-engine@5.7.1",
      contentType: "text/plain; charset=utf-8",
      filename: "ai-context.txt",
      content: "AI PROJECT CONTEXT\n"
    });
    expect(generateAiExportUseCase.execute).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1",
      format: "TEXT"
    });
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it("returns the same generated content as an attachment when download=true", async () => {
    const { controller, response } = createController();

    await expect(
      controller.exportContext(
        user,
        { contextId: "project_context_1" },
        { format: "TEXT", download: true },
        response as never
      )
    ).resolves.toBe("AI PROJECT CONTEXT\n");
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain; charset=utf-8");
    expect(response.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="ai-context.txt"'
    );
  });

  it("uses serializer-provided filenames and ignores user-controlled filename query values", async () => {
    const { controller, response } = createController();

    await controller.exportContext(
      user,
      { contextId: "project_context_1" },
      { format: "TEXT", download: true, filename: "../../secret.txt" } as never,
      response as never
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="ai-context.txt"'
    );
  });

  it("sanitizes attachment filenames before setting Content-Disposition", async () => {
    const { controller, response } = createController({
      result: {
        ...generated,
        result: {
          ...generated.result,
          filename: 'ai-context"\r\nx.txt'
        }
      }
    });

    await controller.exportContext(
      user,
      { contextId: "project_context_1" },
      { format: "TEXT", download: true },
      response as never
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="ai-context___x.txt"'
    );
  });

  it("maps missing ProjectContext and invalid format errors to HTTP exceptions", async () => {
    await expect(
      createController({
        error: new ProjectContextNotFoundForAiExportError("missing")
      }).controller.exportContext(
        user,
        { contextId: "missing" },
        { format: "TEXT", download: false },
        createController().response as never
      )
    ).rejects.toThrow(NotFoundException);

    await expect(
      createController({
        error: new InvalidAiExportFormatError("HTML")
      }).controller.exportContext(
        user,
        { contextId: "project_context_1" },
        { format: "TEXT", download: false },
        createController().response as never
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("preserves existing forbidden access and unexpected failure behavior", async () => {
    const forbidden = new ForbiddenException("Repository belongs to another user");
    await expect(
      createController({ error: forbidden }).controller.exportContext(
        user,
        { contextId: "project_context_1" },
        { format: "TEXT", download: false },
        createController().response as never
      )
    ).rejects.toBe(forbidden);

    const unexpected = new Error("serializer failed");
    await expect(
      createController({ error: unexpected }).controller.exportContext(
        user,
        { contextId: "project_context_1" },
        { format: "TEXT", download: false },
        createController().response as never
      )
    ).rejects.toBe(unexpected);
  });
});
