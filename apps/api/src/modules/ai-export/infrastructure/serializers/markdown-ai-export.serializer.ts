import type {
  CanonicalAiExport,
  CanonicalAiExportClaim
} from "../../domain/canonical-ai-export.js";
import { AI_EXPORT_FORMAT_MARKDOWN } from "../../domain/ai-export-format.js";
import type { AiExportResult } from "../../domain/ai-export-result.js";
import type { AiExportSerializer } from "../../domain/contracts/ai-export-serializer.contract.js";

const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const MARKDOWN_FILENAME = "ai-context.md";

export class MarkdownAiExportSerializer implements AiExportSerializer {
  readonly format = AI_EXPORT_FORMAT_MARKDOWN;

  serialize(input: CanonicalAiExport): AiExportResult {
    return {
      format: this.format,
      contentType: MARKDOWN_CONTENT_TYPE,
      filename: MARKDOWN_FILENAME,
      content: `${renderMarkdown(input)}\n`
    };
  }
}

function renderMarkdown(input: CanonicalAiExport): string {
  return [
    "# AI Project Context",
    renderMetadata(input),
    ...input.sections.map(renderSection),
    renderAmbiguities(input.ambiguities),
    renderSummary(input)
  ].join("\n\n");
}

function renderMetadata(input: CanonicalAiExport): string {
  return [
    "## Context Metadata",
    "",
    `- Context ID: ${inlineCode(input.metadata.contextId)}`,
    `- Analysis ID: ${inlineCode(input.metadata.analysisId)}`,
    `- Scan ID: ${inlineCode(input.metadata.scanId)}`,
    `- Repository ID: ${inlineCode(input.metadata.repositoryId)}`,
    `- Commit SHA: ${inlineCode(input.metadata.commitSha)}`,
    `- Context Version: ${inlineCode(input.metadata.contextVersion)}`,
    `- Export Version: ${inlineCode(input.metadata.exportVersion)}`,
    `- Generated At: ${inlineCode(input.metadata.generatedAt)}`
  ].join("\n");
}

function renderSection(section: CanonicalAiExport["sections"][number]): string {
  return [`## ${escapeHeading(section.title)}`, "", renderClaims(section.claims)].join("\n");
}

function renderAmbiguities(ambiguities: readonly CanonicalAiExportClaim[]): string {
  return ["## Ambiguities", "", renderClaims(ambiguities)].join("\n");
}

function renderClaims(claims: readonly CanonicalAiExportClaim[]): string {
  if (claims.length === 0) {
    return "Claims: []";
  }

  return claims.map((claim, index) => renderClaim(claim, index + 1)).join("\n\n");
}

function renderClaim(claim: CanonicalAiExportClaim, ordinal: number): string {
  return [
    `### Claim ${ordinal}${claim.type ? `: ${escapeHeading(claim.type)}` : ""}`,
    "",
    `- State: ${inlineCode(claim.kind)}`,
    `- Confidence: ${inlineCode(claim.confidence)}`,
    "- Value:",
    renderValue(claim.value),
    "- Evidence:",
    renderEvidence(claim.evidence)
  ].join("\n");
}

function renderEvidence(evidence: CanonicalAiExportClaim["evidence"]): string {
  if (evidence.length === 0) {
    return "  - Evidence: []";
  }

  return evidence
    .map((item, index) =>
      [
        `  - Evidence ${index + 1}`,
        `    - Kind: ${inlineCode(item.kind)}`,
        "    - Reference:",
        indentBlock(fencedJson(item.reference), "      ")
      ].join("\n")
    )
    .join("\n");
}

function renderSummary(input: CanonicalAiExport): string {
  return [
    "## Export Summary",
    "",
    `- Section Count: ${inlineCode(input.summary.sectionCount)}`,
    `- Populated Section Count: ${inlineCode(input.summary.populatedSectionCount)}`,
    `- Section Claim Count: ${inlineCode(input.summary.sectionClaimCount)}`,
    `- Ambiguity Count: ${inlineCode(input.summary.ambiguityCount)}`,
    `- Total Claim Count: ${inlineCode(input.summary.totalClaimCount)}`,
    `- Observed Claim Count: ${inlineCode(input.summary.observedClaimCount)}`,
    `- Inferred Claim Count: ${inlineCode(input.summary.inferredClaimCount)}`,
    `- Evidence Count: ${inlineCode(input.summary.evidenceCount)}`
  ].join("\n");
}

function renderValue(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return inlineCode(value);
  }

  return fencedJson(value);
}

function fencedJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  const fence = fenceFor(json);

  return `${fence}json\n${json}\n${fence}`;
}

function fenceFor(content: string): string {
  const matches = content.match(/`{3,}/g) ?? [];
  const longestRun = matches.reduce((longest, match) => Math.max(longest, match.length), 2);

  return "`".repeat(longestRun + 1);
}

function inlineCode(value: unknown): string {
  const text = String(value);
  const ticks = "`".repeat(longestBacktickRun(text) + 1);

  return `${ticks}${text}${ticks}`;
}

function longestBacktickRun(value: string): number {
  const matches = value.match(/`+/g) ?? [];

  return matches.reduce((longest, match) => Math.max(longest, match.length), 0);
}

function indentBlock(value: string, indentation: string): string {
  return value
    .split("\n")
    .map((line) => `${indentation}${line}`)
    .join("\n");
}

function escapeHeading(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("#", "\\#").trim();
}
