import { describe, expect, it, vi } from "vitest";

import type { CanonicalAiExport } from "../../domain/canonical-ai-export.js";
import {
  AI_EXPORT_FORMAT_AI_CONTEXT,
  AI_EXPORT_FORMAT_MARKDOWN,
  AI_EXPORT_FORMAT_TEXT,
  type AiExportFormat
} from "../../domain/ai-export-format.js";
import type { AiExportSerializer } from "../../domain/contracts/ai-export-serializer.contract.js";
import { InvalidAiExportFormatError } from "../../domain/errors/invalid-ai-export-format.error.js";
import { AiExportSerializerRouter } from "./ai-export-serializer.router.js";

const canonical = {
  metadata: {
    contextId: "context_1",
    analysisId: "analysis_1",
    scanId: "scan_1",
    repositoryId: "repository_1",
    commitSha: "abc123",
    contextVersion: "context-engine@5.7.1",
    generatedAt: "2026-08-26T10:00:00.000Z",
    exportVersion: "ai-export@1"
  },
  sections: [],
  ambiguities: [],
  summary: {
    sectionCount: 0,
    populatedSectionCount: 0,
    sectionClaimCount: 0,
    ambiguityCount: 0,
    totalClaimCount: 0,
    observedClaimCount: 0,
    inferredClaimCount: 0,
    evidenceCount: 0
  }
} satisfies CanonicalAiExport;

function serializer(format: AiExportFormat, content: string): AiExportSerializer {
  return {
    format,
    serialize: vi.fn(() => ({
      format,
      contentType: "text/plain; charset=utf-8",
      filename: `${format}.txt`,
      content
    }))
  };
}

describe("AiExportSerializerRouter", () => {
  it("routes serialization by format without mutating input or serializing directly", () => {
    const aiContext = serializer(AI_EXPORT_FORMAT_AI_CONTEXT, "{}");
    const markdown = serializer(AI_EXPORT_FORMAT_MARKDOWN, "# AI Project Context\n");
    const text = serializer(AI_EXPORT_FORMAT_TEXT, "AI PROJECT CONTEXT\n");
    const router = new AiExportSerializerRouter([aiContext, markdown, text]);
    const before = structuredClone(canonical);

    expect(router.serialize(canonical, AI_EXPORT_FORMAT_TEXT)).toEqual({
      format: "TEXT",
      contentType: "text/plain; charset=utf-8",
      filename: "TEXT.txt",
      content: "AI PROJECT CONTEXT\n"
    });
    expect(text.serialize).toHaveBeenCalledWith(canonical);
    expect(markdown.serialize).not.toHaveBeenCalled();
    expect(aiContext.serialize).not.toHaveBeenCalled();
    expect(canonical).toEqual(before);
  });

  it("rejects unsupported registered format gaps clearly", () => {
    const router = new AiExportSerializerRouter([serializer(AI_EXPORT_FORMAT_AI_CONTEXT, "{}")]);

    expect(() => router.serialize(canonical, AI_EXPORT_FORMAT_TEXT)).toThrow(
      InvalidAiExportFormatError
    );
  });
});
