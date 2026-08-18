import type { ProjectContextReader } from "../../context/domain/contracts/project-context-reader.contract.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentFormat } from "../domain/document-format.js";
import type { DocumentType } from "../domain/document-type.js";
import type { GeneratedDocument } from "../domain/generated-document.js";
import { ProjectContextNotFoundForDocumentGenerationError } from "./errors/project-context-not-found-for-document-generation.error.js";

export type GenerateDocumentCommand = {
  contextId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  generatorVersion: string;
};

export class GenerateDocumentUseCase {
  constructor(
    private readonly projectContextReader: ProjectContextReader,
    private readonly documentGenerator: DocumentGenerator
  ) {}

  async execute(command: GenerateDocumentCommand): Promise<GeneratedDocument> {
    const projectContext = await this.projectContextReader.readProjectContext({
      contextId: command.contextId
    });

    if (!projectContext) {
      throw new ProjectContextNotFoundForDocumentGenerationError(command.contextId);
    }

    return this.documentGenerator.generate({
      projectContext,
      documentType: command.documentType,
      format: command.format,
      generatorVersion: command.generatorVersion
    });
  }
}
