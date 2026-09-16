import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import type { OperationLockService } from "../../usage/operation-lock.service.js";
import { userHeavyOperationLock } from "../../usage/operation-locks.js";
import type { UsageService } from "../../usage/usage.service.js";
import { V1_USAGE_LIMITS } from "../../usage/v1-usage-limits.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
import { DocumentNotFoundError } from "./errors/document-not-found.error.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";

export type RegenerateDocumentCommand = {
  userId: string;
  documentId: string;
};

export class RegenerateDocumentUseCase {
  constructor(
    private readonly projectContextReader: ProjectContextReader,
    private readonly documentGenerator: DocumentGenerator,
    private readonly documentRepository: DocumentRepository,
    private readonly usageService: UsageService,
    private readonly operationLockService: OperationLockService
  ) {}

  async execute(command: RegenerateDocumentCommand): Promise<PersistedGeneratedDocument> {
    const original = await this.documentRepository.findById(command.documentId);

    if (!original) {
      throw new DocumentNotFoundError(command.documentId);
    }

    const context = await this.projectContextReader.readProjectContext({
      userId: command.userId,
      contextId: original.projectContextId
    });

    if (!context) {
      throw new ProjectContextNotFoundForDocumentGenerationError(original.projectContextId);
    }

    await this.usageService.assertMonthlyQuota({
      userId: command.userId,
      resource: "documents",
      limit: V1_USAGE_LIMITS.documentsPerMonth
    });

    return this.operationLockService.withRenewingLocks(
      [userHeavyOperationLock(command.userId, V1_USAGE_LIMITS.lockLeaseMs.document)],
      async () => {
        const regenerated = await this.documentGenerator.generate({
          projectContext: context.projectContext,
          documentType: original.documentType,
          format: original.format,
          generatorVersion: original.generatorVersion
        });

        return this.documentRepository.save({
          projectContextId: original.projectContextId,
          document: regenerated
        });
      }
    );
  }
}
