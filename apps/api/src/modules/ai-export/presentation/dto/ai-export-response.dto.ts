import { ApiProperty } from "@nestjs/swagger";
import type { AiExportResponse as AiExportResponseContract } from "@ai-context/contracts";

import type { GeneratedAiExport } from "../../application/generate-ai-export.use-case.js";
import { SUPPORTED_AI_EXPORT_FORMATS } from "../../domain/ai-export-format.js";

export type AiExportResponse = AiExportResponseContract;

export class AiExportResponseDto implements AiExportResponseContract {
  @ApiProperty()
  projectContextId!: string;

  @ApiProperty()
  contextId!: string;

  @ApiProperty({ enum: SUPPORTED_AI_EXPORT_FORMATS })
  format!: AiExportResponseContract["format"];

  @ApiProperty()
  exportVersion!: string;

  @ApiProperty()
  contextVersion!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  content!: string;
}

export function toAiExportResponse(exported: GeneratedAiExport): AiExportResponse {
  return {
    projectContextId: exported.projectContextId,
    contextId: exported.contextId,
    format: exported.result.format,
    exportVersion: exported.exportVersion,
    contextVersion: exported.contextVersion,
    contentType: exported.result.contentType,
    filename: exported.result.filename,
    content: exported.result.content
  };
}
