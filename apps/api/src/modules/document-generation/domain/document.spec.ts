import { describe, expect, it } from "vitest";

import { Document } from "./document.js";
import { InvalidDocumentFormatError } from "./errors/invalid-document-format.error.js";
import { InvalidDocumentTypeError } from "./errors/invalid-document-type.error.js";

describe("Document", () => {
  const generatedDocument = {
    contextId: "context_1",
    documentType: "PROJECT_OVERVIEW",
    format: "MARKDOWN",
    generatorVersion: "document-generator@1",
    content: "# Project Overview"
  } as const;

  it("constructs an immutable generated human-readable artifact", () => {
    const document = Document.create(generatedDocument);

    expect(document.contextId).toBe("context_1");
    expect(document.documentType).toBe("PROJECT_OVERVIEW");
    expect(document.format).toBe("MARKDOWN");
    expect(document.generatorVersion).toBe("document-generator@1");
    expect(document.content).toBe("# Project Overview");
    expect(document.toSnapshot()).toEqual(generatedDocument);
  });

  it("rejects unsupported document types", () => {
    expect(() =>
      Document.create({
        ...generatedDocument,
        documentType: "README" as "PROJECT_OVERVIEW"
      })
    ).toThrow(InvalidDocumentTypeError);
  });

  it("rejects unsupported document formats", () => {
    expect(() =>
      Document.create({
        ...generatedDocument,
        format: "HTML" as "MARKDOWN"
      })
    ).toThrow(InvalidDocumentFormatError);
  });
});
