import { describe, expectTypeOf, it } from "vitest";

import type {
  AnalysisHistoryResponse,
  AnalysisResultResponse,
  CreateAnalysisRequest,
  DocumentHistoryResponse,
  GeneratedDocumentResponse,
  GenerateDocumentRequest
} from "./index.js";

describe("contracts package exports", () => {
  it("exports Analysis API contracts from the public entrypoint", () => {
    expectTypeOf<CreateAnalysisRequest>().toMatchTypeOf<{ scanId: string }>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("analysisId").toEqualTypeOf<string>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("generatedAt").toEqualTypeOf<string>();
    expectTypeOf<AnalysisHistoryResponse["items"]>().toMatchTypeOf<readonly unknown[]>();
  });

  it("exports Document API contracts from the public entrypoint", () => {
    expectTypeOf<GenerateDocumentRequest>().toHaveProperty("contextId").toEqualTypeOf<string>();
    expectTypeOf<GenerateDocumentRequest>()
      .toHaveProperty("documentType")
      .toEqualTypeOf<
        | "PROJECT_OVERVIEW"
        | "TECHNICAL_DOCUMENTATION"
        | "ARCHITECTURE_DOCUMENT"
        | "MODULE_DOCUMENTATION"
      >();
    expectTypeOf<GeneratedDocumentResponse>().toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf<GeneratedDocumentResponse>().toHaveProperty("content").toEqualTypeOf<string>();
    expectTypeOf<DocumentHistoryResponse["documents"]>().toMatchTypeOf<readonly unknown[]>();
  });
});
