import { ApiProperty } from "@nestjs/swagger";
import type { DocumentHistoryResponse as DocumentHistoryResponseContract } from "@ai-context/contracts";

import type { PersistedGeneratedDocument } from "../../domain/contracts/document-repository.contract.js";
import {
  GeneratedDocumentResponseDto,
  toGeneratedDocumentResponse
} from "./generated-document-response.dto.js";

export type DocumentHistoryResponse = DocumentHistoryResponseContract;

export class DocumentHistoryResponseDto implements DocumentHistoryResponseContract {
  @ApiProperty({ type: [GeneratedDocumentResponseDto] })
  documents!: GeneratedDocumentResponseDto[];
}

export function toDocumentHistoryResponse(
  documents: readonly PersistedGeneratedDocument[]
): DocumentHistoryResponse {
  return {
    documents: documents.map((document) => toGeneratedDocumentResponse(document))
  };
}
