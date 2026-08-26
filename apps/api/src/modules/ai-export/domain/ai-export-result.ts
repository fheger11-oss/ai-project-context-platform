import type { AiExportFormat } from "./ai-export-format.js";

export type AiExportResult = {
  format: AiExportFormat;
  contentType: string;
  filename: string;
  content: string;
};
