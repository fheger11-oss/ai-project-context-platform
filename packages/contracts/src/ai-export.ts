export type AiExportFormat = "AI_CONTEXT" | "MARKDOWN" | "TEXT";

export type AiExportResponse = {
  projectContextId: string;
  contextId: string;
  format: AiExportFormat;
  exportVersion: string;
  contextVersion: string;
  contentType: string;
  filename: string;
  content: string;
};
