import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";
import { DocumentNotFoundError } from "./errors/document-not-found.error.js";

export type GetDocumentCommand = {
  userId: string;
  documentId: string;
};

export class GetDocumentUseCase {
  constructor(
    private readonly projectContextReader: ProjectContextReader,
    private readonly documentRepository: DocumentRepository
  ) {}

  async execute(command: GetDocumentCommand): Promise<PersistedGeneratedDocument> {
    const document = await this.documentRepository.findById(command.documentId);

    if (!document) {
      throw new DocumentNotFoundError(command.documentId);
    }

    const context = await this.projectContextReader.readProjectContext({
      userId: command.userId,
      contextId: document.projectContextId
    });

    if (!context) {
      throw new ProjectContextNotFoundForDocumentGenerationError(document.projectContextId);
    }

    return document;
  }
}
