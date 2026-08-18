import { InvalidDocumentFormatError } from "./errors/invalid-document-format.error.js";

export const SUPPORTED_DOCUMENT_FORMATS = ["MARKDOWN"] as const;

export type DocumentFormat = (typeof SUPPORTED_DOCUMENT_FORMATS)[number];

export function isSupportedDocumentFormat(value: string): value is DocumentFormat {
  return SUPPORTED_DOCUMENT_FORMATS.includes(value as DocumentFormat);
}

export function assertSupportedDocumentFormat(value: string): asserts value is DocumentFormat {
  if (!isSupportedDocumentFormat(value)) {
    throw new InvalidDocumentFormatError(value);
  }
}
