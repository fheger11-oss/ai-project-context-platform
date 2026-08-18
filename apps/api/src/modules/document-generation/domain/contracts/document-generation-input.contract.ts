import type { ProjectContext } from "../../../context/domain/project-context.js";
import type { DocumentFormat } from "../document-format.js";
import type { DocumentType } from "../document-type.js";

export type DocumentGenerationInput = {
  projectContext: ProjectContext;
  documentType: DocumentType;
  format: DocumentFormat;
  generatorVersion: string;
};
