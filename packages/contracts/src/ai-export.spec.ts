import { expectTypeOf, describe, expect, it } from "vitest";

import type { AiExportFormat, AiExportResponse } from "./ai-export.js";

describe("AI Export contracts", () => {
  it("defines the supported API-facing export formats", () => {
    expectTypeOf<AiExportFormat>().toEqualTypeOf<"AI_CONTEXT" | "MARKDOWN" | "TEXT">();
  });

  it("defines the JSON API response shape", () => {
    const response = {
      projectContextId: "project_context_1",
      contextId: "context_1",
      format: "AI_CONTEXT",
      exportVersion: "ai-export@1",
      contextVersion: "context-engine@5.7.1",
      contentType: "application/json; charset=utf-8",
      filename: "ai-context.json",
      content: "{}"
    } satisfies AiExportResponse;

    expect(response).toMatchObject({
      format: "AI_CONTEXT",
      filename: "ai-context.json"
    });
  });
});
