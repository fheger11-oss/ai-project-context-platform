import { describe, expectTypeOf, it } from "vitest";
import type { AnalysisResultResponse } from "@ai-context/contracts";

import type { AnalysisResult } from "../../domain/contracts/analysis-result.contract.js";
import type { toAnalysisResultResponse } from "./analysis-result-response.dto.js";

describe("AnalysisResultResponseDto", () => {
  it("maps the domain AnalysisResult to the shared API response contract", () => {
    expectTypeOf<
      ReturnType<typeof toAnalysisResultResponse>
    >().toEqualTypeOf<AnalysisResultResponse>();
  });

  it("keeps generatedAt as Date in the domain and string in the API response", () => {
    expectTypeOf<AnalysisResult["generatedAt"]>().toEqualTypeOf<Date>();
    expectTypeOf<AnalysisResultResponse["generatedAt"]>().toEqualTypeOf<string>();
  });
});
