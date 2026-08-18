import type { GeneratedDocument } from "../generated-document.js";

export type SaveGeneratedDocumentInput = {
  projectContextId: string;
  document: GeneratedDocument;
};

export type PersistedGeneratedDocument = GeneratedDocument & {
  id: string;
  projectContextId: string;
  createdAt: Date;
};

export const DOCUMENT_REPOSITORY = Symbol("DOCUMENT_REPOSITORY");

export interface DocumentRepository {
  save(input: SaveGeneratedDocumentInput): Promise<PersistedGeneratedDocument>;
  findById(id: string): Promise<PersistedGeneratedDocument | null>;
}
