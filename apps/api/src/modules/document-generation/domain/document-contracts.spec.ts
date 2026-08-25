import { describe, expect, expectTypeOf, it } from "vitest";

import type { ProjectContext } from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "./contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "./contracts/document-generation-input.contract.js";
import type {
  DocumentRepository,
  PersistedGeneratedDocument,
  SaveGeneratedDocumentInput
} from "./contracts/document-repository.contract.js";
import type { DocumentRenderer } from "./contracts/document-renderer.contract.js";
import {
  assertSupportedDocumentFormat,
  isSupportedDocumentFormat,
  SUPPORTED_DOCUMENT_FORMATS,
  type DocumentFormat
} from "./document-format.js";
import {
  assertSupportedDocumentType,
  isSupportedDocumentType,
  SUPPORTED_DOCUMENT_TYPES,
  type DocumentType
} from "./document-type.js";
import { InvalidDocumentFormatError } from "./errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "./errors/invalid-document-type.error.js";
import type { GeneratedDocument } from "./generated-document.js";

describe("Document generation contracts", () => {
  it("defines the supported MVP document types", () => {
    expect(SUPPORTED_DOCUMENT_TYPES).toEqual([
      "PROJECT_OVERVIEW",
      "TECHNICAL_DOCUMENTATION",
      "ARCHITECTURE_DOCUMENT",
      "MODULE_DOCUMENTATION",
      "README"
    ]);
    expectTypeOf<DocumentType>().toEqualTypeOf<
      | "PROJECT_OVERVIEW"
      | "TECHNICAL_DOCUMENTATION"
      | "ARCHITECTURE_DOCUMENT"
      | "MODULE_DOCUMENTATION"
      | "README"
    >();
    expect(isSupportedDocumentType("PROJECT_OVERVIEW")).toBe(true);
    expect(isSupportedDocumentType("TECHNICAL_DOCUMENTATION")).toBe(true);
    expect(isSupportedDocumentType("ARCHITECTURE_DOCUMENT")).toBe(true);
    expect(isSupportedDocumentType("MODULE_DOCUMENTATION")).toBe(true);
    expect(isSupportedDocumentType("README")).toBe(true);
  });

  it("defines MARKDOWN as the supported MVP document format", () => {
    expect(SUPPORTED_DOCUMENT_FORMATS).toEqual(["MARKDOWN"]);
    expectTypeOf<DocumentFormat>().toEqualTypeOf<"MARKDOWN">();
    expect(isSupportedDocumentFormat("MARKDOWN")).toBe(true);
  });

  it("rejects invalid document type and format values", () => {
    expect(() => assertSupportedDocumentType("NOT_A_DOCUMENT")).toThrow(InvalidDocumentTypeError);
    expect(() => assertSupportedDocumentFormat("PDF")).toThrow(InvalidDocumentFormatError);
  });

  it("models DocumentGenerationInput as a ProjectContext generation boundary", () => {
    expectTypeOf<DocumentGenerationInput>().toEqualTypeOf<{
      projectContext: ProjectContext;
      documentType: DocumentType;
      format: DocumentFormat;
      generatorVersion: string;
    }>();
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("contextRepository");
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("scan");
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("analysis");
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("repositoryContent");
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("sourceCode");
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("request");
    expectTypeOf<DocumentGenerationInput>().not.toHaveProperty("provider");
  });

  it("models GeneratedDocument as the generation output artifact", () => {
    expectTypeOf<GeneratedDocument>().toEqualTypeOf<{
      contextId: string;
      documentType: DocumentType;
      format: DocumentFormat;
      generatorVersion: string;
      content: string;
    }>();
    expectTypeOf<GeneratedDocument>().not.toHaveProperty("id");
    expectTypeOf<GeneratedDocument>().not.toHaveProperty("createdAt");
    expectTypeOf<GeneratedDocument>().not.toHaveProperty("prisma");
  });

  it("defines GeneratedDocument persistence without exposing Prisma records", () => {
    expectTypeOf<SaveGeneratedDocumentInput>().toEqualTypeOf<{
      projectContextId: string;
      document: GeneratedDocument;
    }>();
    expectTypeOf<PersistedGeneratedDocument>().toEqualTypeOf<
      GeneratedDocument & {
        id: string;
        projectContextId: string;
        createdAt: Date;
      }
    >();
    expectTypeOf<DocumentRepository>().toMatchTypeOf<{
      save(input: SaveGeneratedDocumentInput): Promise<PersistedGeneratedDocument>;
      findById(id: string): Promise<PersistedGeneratedDocument | null>;
      listByProjectContextId(projectContextId: string): Promise<PersistedGeneratedDocument[]>;
    }>();
    expectTypeOf<DocumentRepository>().not.toHaveProperty("update");
    expectTypeOf<DocumentRepository>().not.toHaveProperty("delete");
    expectTypeOf<DocumentRepository>().not.toHaveProperty("listAll");
    expectTypeOf<PersistedGeneratedDocument>().not.toHaveProperty("prisma");
  });

  it("defines a DocumentGenerator contract implementable without infrastructure", async () => {
    const projectContext = {
      contextId: "context_1",
      toSnapshot: () => ({ contextId: "context_1" })
    } as ProjectContext;
    const generator: DocumentGenerator = {
      async generate(input) {
        return {
          contextId: input.projectContext.contextId,
          documentType: input.documentType,
          format: input.format,
          generatorVersion: input.generatorVersion,
          content: "# Project Overview"
        };
      }
    };

    await expect(
      generator.generate({
        projectContext,
        documentType: "PROJECT_OVERVIEW",
        format: "MARKDOWN",
        generatorVersion: "document-generator@1"
      })
    ).resolves.toEqual({
      contextId: "context_1",
      documentType: "PROJECT_OVERVIEW",
      format: "MARKDOWN",
      generatorVersion: "document-generator@1",
      content: "# Project Overview"
    });
  });

  it("defines a DocumentRenderer contract implementable without infrastructure", async () => {
    type ProjectOverviewModel = {
      title: string;
    };
    const renderer: DocumentRenderer<ProjectOverviewModel> = {
      async render(model) {
        return `# ${model.title}`;
      }
    };

    await expect(renderer.render({ title: "Project Overview" })).resolves.toBe(
      "# Project Overview"
    );
  });

  it("represents generatorVersion explicitly on input and output", () => {
    expectTypeOf<DocumentGenerationInput>()
      .toHaveProperty("generatorVersion")
      .toEqualTypeOf<string>();
    expectTypeOf<GeneratedDocument>().toHaveProperty("generatorVersion").toEqualTypeOf<string>();
  });
});
