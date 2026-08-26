export const AI_EXPORT_FORMAT_AI_CONTEXT = "AI_CONTEXT";
export const AI_EXPORT_FORMAT_MARKDOWN = "MARKDOWN";
export const AI_EXPORT_FORMAT_TEXT = "TEXT";

export const SUPPORTED_AI_EXPORT_FORMATS = [
  AI_EXPORT_FORMAT_AI_CONTEXT,
  AI_EXPORT_FORMAT_MARKDOWN,
  AI_EXPORT_FORMAT_TEXT
] as const;

export type AiExportFormat = (typeof SUPPORTED_AI_EXPORT_FORMATS)[number];

export function isSupportedAiExportFormat(value: string): value is AiExportFormat {
  return SUPPORTED_AI_EXPORT_FORMATS.includes(value as AiExportFormat);
}
