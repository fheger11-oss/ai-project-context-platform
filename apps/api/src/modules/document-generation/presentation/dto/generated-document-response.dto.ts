import { ApiProperty } from "@nestjs/swagger";
import type { GeneratedDocumentResponse as GeneratedDocumentResponseContract } from "@ai-context/contracts";

import type { PersistedGeneratedDocument } from "../../domain/contracts/document-repository.contract.js";
import { SUPPORTED_DOCUMENT_FORMATS } from "../../domain/document-format.js";
import { SUPPORTED_DOCUMENT_TYPES } from "../../domain/document-type.js";

export type GeneratedDocumentResponse = GeneratedDocumentResponseContract;

export class GeneratedDocumentResponseDto implements GeneratedDocumentResponseContract {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectContextId!: string;

  @ApiProperty()
  contextId!: string;

  @ApiProperty({ enum: SUPPORTED_DOCUMENT_TYPES })
  documentType!: "PROJECT_OVERVIEW";

  @ApiProperty({ enum: SUPPORTED_DOCUMENT_FORMATS })
  format!: "MARKDOWN";

  @ApiProperty()
  generatorVersion!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export function toGeneratedDocumentResponse(
  document: PersistedGeneratedDocument
): GeneratedDocumentResponse {
  return {
    id: document.id,
    projectContextId: document.projectContextId,
    contextId: document.contextId,
    documentType: document.documentType,
    format: document.format,
    generatorVersion: document.generatorVersion,
    content: document.content,
    createdAt: document.createdAt.toISOString()
  };
}
