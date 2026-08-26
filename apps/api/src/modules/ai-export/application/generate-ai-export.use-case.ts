import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import type { AiExportFormat } from "../domain/ai-export-format.js";
import type { AiExportResult } from "../domain/ai-export-result.js";
import type { CanonicalAiExport } from "../domain/canonical-ai-export.js";
import type { AiExportProjector } from "../domain/contracts/ai-export-projector.contract.js";
import type { AiExportSerializerRouter } from "../infrastructure/serializers/ai-export-serializer.router.js";
import { ProjectContextNotFoundForAiExportError } from "./errors/project-context-not-found-for-ai-export.error.js";

export type GenerateAiExportCommand = {
  userId: string;
  contextId: string;
  format: AiExportFormat;
};

export type GeneratedAiExport = {
  projectContextId: string;
  contextId: string;
  exportVersion: string;
  contextVersion: string;
  result: AiExportResult;
};

export class GenerateAiExportUseCase {
  constructor(
    private readonly projectContextReader: ProjectContextReader,
    private readonly aiExportProjector: AiExportProjector,
    private readonly serializerRouter: AiExportSerializerRouter
  ) {}

  async execute(command: GenerateAiExportCommand): Promise<GeneratedAiExport> {
    const context = await this.projectContextReader.readProjectContext({
      userId: command.userId,
      contextId: command.contextId
    });

    if (!context) {
      throw new ProjectContextNotFoundForAiExportError(command.contextId);
    }

    const canonical = this.aiExportProjector.project(context.projectContext);
    const result = this.serializerRouter.serialize(canonical, command.format);

    return toGeneratedAiExport(context.projectContextId, canonical, result);
  }
}

function toGeneratedAiExport(
  projectContextId: string,
  canonical: CanonicalAiExport,
  result: AiExportResult
): GeneratedAiExport {
  return {
    projectContextId,
    contextId: canonical.metadata.contextId,
    exportVersion: canonical.metadata.exportVersion,
    contextVersion: canonical.metadata.contextVersion,
    result
  };
}
