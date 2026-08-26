import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import { ProjectContext } from "../../context/domain/project-context.js";
import type { AiExportProjector } from "../domain/contracts/ai-export-projector.contract.js";
import type { CanonicalAiExport } from "../domain/canonical-ai-export.js";
import type { AiExportSerializerRouter } from "../infrastructure/serializers/ai-export-serializer.router.js";
import { ProjectContextNotFoundForAiExportError } from "./errors/project-context-not-found-for-ai-export.error.js";
import { GenerateAiExportUseCase } from "./generate-ai-export.use-case.js";

const projectContext = ProjectContext.create({
  contextId: "context:analysis_1:context-engine@5.7.1",
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  contextVersion: "context-engine@5.7.1",
  generatedAt: new Date("2026-08-26T10:00:00.000Z")
});

const canonical: CanonicalAiExport = {
  metadata: {
    contextId: projectContext.contextId,
    analysisId: projectContext.analysisId,
    scanId: projectContext.scanId,
    repositoryId: projectContext.repositoryId,
    commitSha: projectContext.commitSha,
    contextVersion: projectContext.contextVersion,
    generatedAt: projectContext.generatedAt.toISOString(),
    exportVersion: "ai-export@1"
  },
  sections: [],
  ambiguities: [],
  summary: {
    sectionCount: 0,
    populatedSectionCount: 0,
    sectionClaimCount: 0,
    ambiguityCount: 0,
    totalClaimCount: 0,
    observedClaimCount: 0,
    inferredClaimCount: 0,
    evidenceCount: 0
  }
};

function createUseCase(
  options: {
    readResult?: Awaited<ReturnType<ProjectContextReader["readProjectContext"]>>;
    readError?: Error;
    serializeError?: Error;
  } = {}
) {
  const projectContextReader: ProjectContextReader = {
    readProjectContext: vi.fn(async () => {
      if (options.readError) {
        throw options.readError;
      }

      return Object.hasOwn(options, "readResult")
        ? (options.readResult ?? null)
        : {
            projectContextId: "project_context_1",
            projectContext
          };
    })
  };
  const aiExportProjector: AiExportProjector = {
    project: vi.fn(() => canonical)
  };
  const serializerRouter = {
    serialize: vi.fn(() => {
      if (options.serializeError) {
        throw options.serializeError;
      }

      return {
        format: "AI_CONTEXT",
        contentType: "application/json; charset=utf-8",
        filename: "ai-context.json",
        content: "{}\n"
      };
    })
  } as unknown as AiExportSerializerRouter;

  return {
    projectContextReader,
    aiExportProjector,
    serializerRouter,
    useCase: new GenerateAiExportUseCase(projectContextReader, aiExportProjector, serializerRouter)
  };
}

describe("GenerateAiExportUseCase", () => {
  it("authorizes through ProjectContextReader before projecting and serializing", async () => {
    const { useCase, projectContextReader, aiExportProjector, serializerRouter } = createUseCase();

    await expect(
      useCase.execute({
        userId: "user_1",
        contextId: "project_context_1",
        format: "AI_CONTEXT"
      })
    ).resolves.toEqual({
      projectContextId: "project_context_1",
      contextId: "context:analysis_1:context-engine@5.7.1",
      exportVersion: "ai-export@1",
      contextVersion: "context-engine@5.7.1",
      result: {
        format: "AI_CONTEXT",
        contentType: "application/json; charset=utf-8",
        filename: "ai-context.json",
        content: "{}\n"
      }
    });
    expect(projectContextReader.readProjectContext).toHaveBeenCalledWith({
      userId: "user_1",
      contextId: "project_context_1"
    });
    expect(aiExportProjector.project).toHaveBeenCalledWith(projectContext);
    expect(serializerRouter.serialize).toHaveBeenCalledWith(canonical, "AI_CONTEXT");
  });

  it.each(["AI_CONTEXT", "MARKDOWN", "TEXT"] as const)(
    "passes %s format to the serializer router without format branching",
    async (format) => {
      const { useCase, serializerRouter } = createUseCase();

      await useCase.execute({
        userId: "user_1",
        contextId: "project_context_1",
        format
      });

      expect(serializerRouter.serialize).toHaveBeenCalledWith(canonical, format);
    }
  );

  it("maps missing ProjectContext reader results to an AI Export not-found error", async () => {
    const { useCase, aiExportProjector, serializerRouter } = createUseCase({ readResult: null });

    await expect(
      useCase.execute({
        userId: "user_1",
        contextId: "missing",
        format: "TEXT"
      })
    ).rejects.toThrow(ProjectContextNotFoundForAiExportError);
    expect(aiExportProjector.project).not.toHaveBeenCalled();
    expect(serializerRouter.serialize).not.toHaveBeenCalled();
  });

  it("preserves forbidden reader behavior and does not serialize unauthorized contexts", async () => {
    const forbidden = new ForbiddenException("Repository belongs to another user");
    const { useCase, aiExportProjector, serializerRouter } = createUseCase({
      readError: forbidden
    });

    await expect(
      useCase.execute({
        userId: "user_2",
        contextId: "project_context_1",
        format: "MARKDOWN"
      })
    ).rejects.toBe(forbidden);
    expect(aiExportProjector.project).not.toHaveBeenCalled();
    expect(serializerRouter.serialize).not.toHaveBeenCalled();
  });

  it("propagates serializer failures without rewriting them", async () => {
    const serializerError = new Error("serializer failed");
    const { useCase } = createUseCase({ serializeError: serializerError });

    await expect(
      useCase.execute({
        userId: "user_1",
        contextId: "project_context_1",
        format: "AI_CONTEXT"
      })
    ).rejects.toBe(serializerError);
  });
});
