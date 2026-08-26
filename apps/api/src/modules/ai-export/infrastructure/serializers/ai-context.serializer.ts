import type {
  CanonicalAiExport,
  CanonicalAiExportClaim,
  CanonicalAiExportSectionKey
} from "../../domain/canonical-ai-export.js";
import { AI_EXPORT_FORMAT_AI_CONTEXT } from "../../domain/ai-export-format.js";
import type { AiExportResult } from "../../domain/ai-export-result.js";
import type { AiExportSerializer } from "../../domain/contracts/ai-export-serializer.contract.js";

const AI_CONTEXT_CONTENT_TYPE = "application/json; charset=utf-8";
const AI_CONTEXT_FILENAME = "ai-context.json";
const AI_CONTEXT_TYPE = "AI_PROJECT_CONTEXT";

type AiContextJson = {
  type: typeof AI_CONTEXT_TYPE;
  version: string;
  context: {
    contextId: string;
    analysisId: string;
    scanId: string;
    repositoryId: string;
    commitSha: string;
    contextVersion: string;
    generatedAt: string;
  };
  sections: Partial<
    Record<
      CanonicalAiExportSectionKey,
      {
        title: string;
        claims: readonly CanonicalAiExportClaim[];
      }
    >
  >;
  ambiguities: readonly CanonicalAiExportClaim[];
  summary: CanonicalAiExport["summary"];
};

export class AiContextSerializer implements AiExportSerializer {
  readonly format = AI_EXPORT_FORMAT_AI_CONTEXT;

  serialize(input: CanonicalAiExport): AiExportResult {
    return {
      format: this.format,
      contentType: AI_CONTEXT_CONTENT_TYPE,
      filename: AI_CONTEXT_FILENAME,
      content: `${JSON.stringify(toAiContextJson(input), null, 2)}\n`
    };
  }
}

function toAiContextJson(input: CanonicalAiExport): AiContextJson {
  return {
    type: AI_CONTEXT_TYPE,
    version: input.metadata.exportVersion,
    context: {
      contextId: input.metadata.contextId,
      analysisId: input.metadata.analysisId,
      scanId: input.metadata.scanId,
      repositoryId: input.metadata.repositoryId,
      commitSha: input.metadata.commitSha,
      contextVersion: input.metadata.contextVersion,
      generatedAt: input.metadata.generatedAt
    },
    sections: Object.fromEntries(
      input.sections.map((section) => [
        section.key,
        {
          title: section.title,
          claims: section.claims
        }
      ])
    ),
    ambiguities: input.ambiguities,
    summary: input.summary
  };
}
