import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import type { OperationLockService } from "../../usage/operation-lock.service.js";
import { aiExportQuotaLock } from "../../usage/operation-locks.js";
import type { UsageService } from "../../usage/usage.service.js";
import { V1_USAGE_LIMITS } from "../../usage/v1-usage-limits.js";
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
    private readonly serializerRouter: AiExportSerializerRouter,
    private readonly usageService: UsageService,
    private readonly operationLockService: OperationLockService
  ) {}

  async execute(command: GenerateAiExportCommand): Promise<GeneratedAiExport> {
    return this.operationLockService.withLocks([aiExportQuotaLock(command.userId)], async () => {
      const context = await this.projectContextReader.readProjectContext({
        userId: command.userId,
        contextId: command.contextId
      });

      if (!context) {
        throw new ProjectContextNotFoundForAiExportError(command.contextId);
      }

      await this.usageService.assertMonthlyQuota({
        userId: command.userId,
        resource: "aiExports",
        limit: V1_USAGE_LIMITS.aiExportsPerMonth
      });

      const canonical = this.aiExportProjector.project(context.projectContext);
      const result = this.serializerRouter.serialize(canonical, command.format);

      await this.usageService.recordAiExportUsage({
        userId: command.userId,
        contextId: command.contextId,
        format: command.format
      });

      return toGeneratedAiExport(context.projectContextId, canonical, result);
    });
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
