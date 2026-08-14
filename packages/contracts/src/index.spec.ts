import { describe, expectTypeOf, it } from "vitest";

import type { AnalysisResultResponse, CreateAnalysisRequest } from "./index.js";

describe("contracts package exports", () => {
  it("exports Analysis API contracts from the public entrypoint", () => {
    expectTypeOf<CreateAnalysisRequest>().toMatchTypeOf<{ scanId: string }>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("analysisId").toEqualTypeOf<string>();
    expectTypeOf<AnalysisResultResponse>().toHaveProperty("generatedAt").toEqualTypeOf<string>();
  });
});
