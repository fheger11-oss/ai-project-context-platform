import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import type { GeneratedDocument } from "../domain/generated-document.js";
import { PrismaDocumentRepository } from "./prisma-document.repository.js";

const createdAt = new Date("2026-08-18T10:00:00.000Z");

const markdownContent = [
  "# Project Overview",
  "",
  "## Technology",
  "",
  "- Observed: framework NESTJS is present. Evidence: dependency @nestjs/core in package.json.",
  "- Likely inferred: application type is BACKEND.",
  ""
].join("\n");

const generatedDocument: GeneratedDocument = {
  contextId: "context:analysis_1:context-engine@1",
  documentType: "PROJECT_OVERVIEW",
  format: "MARKDOWN",
  generatorVersion: "document-generator@1",
  content: markdownContent
};

function stored(overrides: Partial<ReturnType<typeof baseStored>> = {}) {
  return {
    ...baseStored(),
    ...overrides
  };
}

function baseStored() {
  return {
    id: "document_1",
    projectContextId: "project_context_1",
    contextId: generatedDocument.contextId,
    documentType: generatedDocument.documentType,
    format: generatedDocument.format,
    generatorVersion: generatedDocument.generatorVersion,
    content: generatedDocument.content,
    createdAt
  };
}

function createRepository(
  options: {
    createResult?: unknown;
    findUniqueResult?: unknown;
  } = {}
) {
  const create = vi.fn(async () =>
    Object.hasOwn(options, "createResult") ? options.createResult : stored()
  );
  const findUnique = vi.fn(async () =>
    Object.hasOwn(options, "findUniqueResult") ? options.findUniqueResult : stored()
  );
  const documentDelegate = {
    create,
    findUnique
  };
  const prisma = {
    document: documentDelegate
  } as unknown as PrismaService;

  return {
    document: documentDelegate,
    repository: new PrismaDocumentRepository(prisma)
  };
}

describe("PrismaDocumentRepository", () => {
  it("persists a GeneratedDocument artifact without changing its content", async () => {
    const { repository, document } = createRepository();

    const persisted = await repository.save({
      projectContextId: "project_context_1",
      document: generatedDocument
    });

    expect(document.create).toHaveBeenCalledWith({
      data: {
        projectContextId: "project_context_1",
        contextId: "context:analysis_1:context-engine@1",
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1",
        content: markdownContent
      }
    });
    expect(persisted).toEqual({
      id: "document_1",
      projectContextId: "project_context_1",
      createdAt,
      ...generatedDocument
    });
    expect(persisted.content).toBe(markdownContent);
  });

  it("maps retrieved Prisma-shaped records back to persisted domain documents", async () => {
    const { repository, document } = createRepository({
      findUniqueResult: stored({
        id: "document_2",
        projectContextId: "project_context_2"
      })
    });

    const persisted = await repository.findById("document_2");

    expect(document.findUnique).toHaveBeenCalledWith({
      where: { id: "document_2" }
    });
    expect(persisted).toEqual({
      id: "document_2",
      projectContextId: "project_context_2",
      createdAt,
      ...generatedDocument
    });
  });

  it("returns null when a persisted document is unavailable", async () => {
    const { repository } = createRepository({ findUniqueResult: null });

    await expect(repository.findById("missing")).resolves.toBeNull();
  });

  it("does not expose update behavior through the immutable repository adapter", async () => {
    const { repository, document } = createRepository();

    await repository.save({
      projectContextId: "project_context_1",
      document: generatedDocument
    });

    expect(repository).not.toHaveProperty("update");
    expect(repository).not.toHaveProperty("delete");
    expect(JSON.stringify(document.create.mock.calls)).not.toMatch(/upsert|update|delete/i);
  });

  it("keeps document persistence as a single artifact table without normalized document parts", () => {
    const schema = readFileSync(
      new URL("../../../../prisma/schema.prisma", import.meta.url),
      "utf8"
    );
    const migration = readFileSync(
      new URL(
        "../../../../prisma/migrations/20260818121500_document_persistence/migration.sql",
        import.meta.url
      ),
      "utf8"
    );

    expect(schema).toMatch(/model Document \{/);
    expect(schema).toMatch(/projectContext\s+ProjectContext/);
    expect(schema).toMatch(/content\s+String\s+@db\.Text/);
    expect(schema).not.toMatch(/model DocumentSection|model DocumentBlock/);
    expect(schema).not.toMatch(
      /model DocumentParagraph|model DocumentClaim|model DocumentEvidence/
    );
    expect(migration).toMatch(/CREATE TABLE "documents"/);
    expect(migration).not.toMatch(
      /document_sections|document_blocks|document_claims|document_evidence/
    );
  });
});
