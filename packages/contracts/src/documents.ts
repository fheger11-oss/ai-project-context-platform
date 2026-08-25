export type DocumentType =
  "PROJECT_OVERVIEW" | "TECHNICAL_DOCUMENTATION" | "ARCHITECTURE_DOCUMENT" | "MODULE_DOCUMENTATION";

export type DocumentFormat = "MARKDOWN";

export type GenerateDocumentRequest = {
  contextId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  generatorVersion: string;
};

export type GeneratedDocumentResponse = {
  id: string;
  projectContextId: string;
  contextId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  generatorVersion: string;
  content: string;
  createdAt: string;
};

export type DocumentHistoryResponse = {
  documents: GeneratedDocumentResponse[];
};
