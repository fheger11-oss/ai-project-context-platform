import { InvalidDocumentTypeError } from "./errors/invalid-document-type.error.js";

export const SUPPORTED_DOCUMENT_TYPES = ["PROJECT_OVERVIEW"] as const;

export type DocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];

export function isSupportedDocumentType(value: string): value is DocumentType {
  return SUPPORTED_DOCUMENT_TYPES.includes(value as DocumentType);
}

export function assertSupportedDocumentType(value: string): asserts value is DocumentType {
  if (!isSupportedDocumentType(value)) {
    throw new InvalidDocumentTypeError(value);
  }
}
