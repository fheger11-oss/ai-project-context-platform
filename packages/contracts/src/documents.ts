export type DocumentType = "PROJECT_OVERVIEW";

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
