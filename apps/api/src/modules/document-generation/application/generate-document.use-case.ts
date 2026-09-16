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
import type { DocumentFormat } from "../domain/document-format.js";
import type { DocumentType } from "../domain/document-type.js";
import { DOCUMENT_GENERATOR_VERSION } from "./document-generator-version.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";

export type GenerateDocumentCommand = {
  userId: string;
  contextId: string;
  documentType: DocumentType;
  format: DocumentFormat;
};

export class GenerateDocumentUseCase {
  constructor(
    private readonly projectContextReader: ProjectContextReader,
    private readonly documentGenerator: DocumentGenerator,
    private readonly documentRepository: DocumentRepository,
    private readonly usageService: UsageService,
    private readonly operationLockService: OperationLockService
  ) {}

  async execute(command: GenerateDocumentCommand): Promise<PersistedGeneratedDocument> {
    const context = await this.projectContextReader.readProjectContext({
      userId: command.userId,
      contextId: command.contextId
    });

    if (!context) {
      throw new ProjectContextNotFoundForDocumentGenerationError(command.contextId);
    }

    await this.usageService.assertMonthlyQuota({
      userId: command.userId,
      resource: "documents",
      limit: V1_USAGE_LIMITS.documentsPerMonth
    });

    return this.operationLockService.withRenewingLocks(
      [userHeavyOperationLock(command.userId, V1_USAGE_LIMITS.lockLeaseMs.document)],
      async () => {
        const document = await this.documentGenerator.generate({
          projectContext: context.projectContext,
          documentType: command.documentType,
          format: command.format,
          generatorVersion: DOCUMENT_GENERATOR_VERSION
        });

        return this.documentRepository.save({
          projectContextId: context.projectContextId,
          document
        });
      }
    );
  }
}
