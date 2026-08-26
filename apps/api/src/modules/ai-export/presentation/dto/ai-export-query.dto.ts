import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { SUPPORTED_AI_EXPORT_FORMATS, type AiExportFormat } from "../../domain/ai-export-format.js";

export class AiExportQueryDto {
  @ApiProperty({ enum: SUPPORTED_AI_EXPORT_FORMATS, example: "AI_CONTEXT" })
  @IsString()
  @IsIn(SUPPORTED_AI_EXPORT_FORMATS)
  format!: AiExportFormat;

  @ApiPropertyOptional({ default: false, enum: ["true", "false"] })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  download = false;
}

function toOptionalBoolean(value: unknown): boolean | unknown {
  if (value === undefined) {
    return false;
  }

  if (value === true || value === false) {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}
