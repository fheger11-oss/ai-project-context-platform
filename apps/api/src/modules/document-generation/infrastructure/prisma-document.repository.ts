import { Inject, Injectable } from "@nestjs/common";

import type { DocumentModel as PrismaDocumentModel } from "../../../generated/prisma/models.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument,
  SaveGeneratedDocumentInput
} from "../domain/contracts/document-repository.contract.js";
import { Document } from "../domain/document.js";

@Injectable()
export class PrismaDocumentRepository implements DocumentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(input: SaveGeneratedDocumentInput): Promise<PersistedGeneratedDocument> {
    const stored = await this.prisma.document.create({
      data: {
        projectContextId: input.projectContextId,
        contextId: input.document.contextId,
        documentType: input.document.documentType,
        format: input.document.format,
        generatorVersion: input.document.generatorVersion,
        content: input.document.content
      }
    });

    return toPersistedGeneratedDocument(stored);
  }

  async findById(id: string): Promise<PersistedGeneratedDocument | null> {
    const stored = await this.prisma.document.findUnique({
      where: { id }
    });

    return stored ? toPersistedGeneratedDocument(stored) : null;
  }
}

function toPersistedGeneratedDocument(stored: PrismaDocumentModel): PersistedGeneratedDocument {
  const document = Document.create({
    contextId: stored.contextId,
    documentType: stored.documentType,
    format: stored.format,
    generatorVersion: stored.generatorVersion,
    content: stored.content
  }).toSnapshot();

  return {
    id: stored.id,
    projectContextId: stored.projectContextId,
    createdAt: stored.createdAt,
    ...document
  };
}
