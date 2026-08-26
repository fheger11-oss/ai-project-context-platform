import type { CanonicalAiExport } from "../canonical-ai-export.js";
import type { AiExportFormat } from "../ai-export-format.js";
import type { AiExportResult } from "../ai-export-result.js";

export const AI_EXPORT_SERIALIZER = Symbol("AI_EXPORT_SERIALIZER");

export interface AiExportSerializer {
  readonly format: AiExportFormat;

  serialize(input: CanonicalAiExport): AiExportResult;
}
