import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument
} from "../domain/contracts/document-repository.contract.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";

export type ListDocumentHistoryCommand = {
  userId: string;
  contextId: string;
};

export class ListDocumentHistoryUseCase {
  constructor(
    private readonly projectContextReader: ProjectContextReader,
    private readonly documentRepository: DocumentRepository
  ) {}

  async execute(command: ListDocumentHistoryCommand): Promise<PersistedGeneratedDocument[]> {
    const context = await this.projectContextReader.readProjectContext({
      userId: command.userId,
      contextId: command.contextId
    });

    if (!context) {
      throw new ProjectContextNotFoundForDocumentGenerationError(command.contextId);
    }

    return this.documentRepository.listByProjectContextId(context.projectContextId);
  }
}
