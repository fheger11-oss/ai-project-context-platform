import { describe, expectTypeOf, it } from "vitest";

import type {
  DocumentHistoryResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "./documents.js";

describe("Document API contracts", () => {
  it("exports the generate document request contract", () => {
    expectTypeOf<GenerateDocumentRequest>().toEqualTypeOf<{
      contextId: string;
      documentType: "PROJECT_OVERVIEW" | "TECHNICAL_DOCUMENTATION";
      format: "MARKDOWN";
      generatorVersion: string;
    }>();
  });

  it("models generated document responses as serialized transport values", () => {
    expectTypeOf<GeneratedDocumentResponse>().toEqualTypeOf<{
      id: string;
      projectContextId: string;
      contextId: string;
      documentType: "PROJECT_OVERVIEW" | "TECHNICAL_DOCUMENTATION";
      format: "MARKDOWN";
      generatorVersion: string;
      content: string;
      createdAt: string;
    }>();
  });

  it("models document history as serialized generated document artifacts", () => {
    expectTypeOf<DocumentHistoryResponse>().toEqualTypeOf<{
      documents: GeneratedDocumentResponse[];
    }>();
  });
});
