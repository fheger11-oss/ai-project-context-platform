import type { DocumentFormat } from "./document-format.js";
import type { DocumentType } from "./document-type.js";

export type GeneratedDocument = {
  contextId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  generatorVersion: string;
  content: string;
};
