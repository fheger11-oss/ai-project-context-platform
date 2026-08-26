export const AI_EXPORT_FORMAT_AI_CONTEXT = "AI_CONTEXT";

export const SUPPORTED_AI_EXPORT_FORMATS = [AI_EXPORT_FORMAT_AI_CONTEXT] as const;

export type AiExportFormat = (typeof SUPPORTED_AI_EXPORT_FORMATS)[number];
