import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "../domain/contracts/document-generation-input.contract.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import type { GeneratedDocument } from "../domain/generated-document.js";

export class DocumentGeneratorRouter implements DocumentGenerator {
  constructor(
    private readonly projectOverviewGenerator: DocumentGenerator,
    private readonly technicalDocumentationGenerator: DocumentGenerator,
    private readonly architectureDocumentationGenerator: DocumentGenerator,
    private readonly moduleDocumentationGenerator: DocumentGenerator
  ) {}

  generate(input: DocumentGenerationInput): Promise<GeneratedDocument> {
    switch (input.documentType) {
      case "PROJECT_OVERVIEW":
        return this.projectOverviewGenerator.generate(input);
      case "TECHNICAL_DOCUMENTATION":
        return this.technicalDocumentationGenerator.generate(input);
      case "ARCHITECTURE_DOCUMENT":
        return this.architectureDocumentationGenerator.generate(input);
      case "MODULE_DOCUMENTATION":
        return this.moduleDocumentationGenerator.generate(input);
      default:
        return Promise.reject(new InvalidDocumentTypeError(input.documentType));
    }
  }
}
