import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import type { GenerateDocumentRequest } from "@ai-context/contracts";

import { SUPPORTED_DOCUMENT_FORMATS } from "../../domain/document-format.js";
import { SUPPORTED_DOCUMENT_TYPES, type DocumentType } from "../../domain/document-type.js";

export class GenerateDocumentDto implements GenerateDocumentRequest {
  @ApiProperty({ example: "project_context_1" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  contextId!: string;

  @ApiProperty({ enum: SUPPORTED_DOCUMENT_TYPES, example: "PROJECT_OVERVIEW" })
  @IsString()
  @IsIn(SUPPORTED_DOCUMENT_TYPES)
  documentType!: DocumentType;

  @ApiProperty({ enum: SUPPORTED_DOCUMENT_FORMATS, example: "MARKDOWN" })
  @IsString()
  @IsIn(SUPPORTED_DOCUMENT_FORMATS)
  format!: "MARKDOWN";

  @ApiProperty({ example: "document-generator@1" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  generatorVersion!: string;
}
