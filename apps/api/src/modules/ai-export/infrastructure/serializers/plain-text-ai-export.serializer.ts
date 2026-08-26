import type {
  CanonicalAiExport,
  CanonicalAiExportClaim
} from "../../domain/canonical-ai-export.js";
import { AI_EXPORT_FORMAT_TEXT } from "../../domain/ai-export-format.js";
import type { AiExportResult } from "../../domain/ai-export-result.js";
import type { AiExportSerializer } from "../../domain/contracts/ai-export-serializer.contract.js";

const TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";
const TEXT_FILENAME = "ai-context.txt";

export class PlainTextAiExportSerializer implements AiExportSerializer {
  readonly format = AI_EXPORT_FORMAT_TEXT;

  serialize(input: CanonicalAiExport): AiExportResult {
    return {
      format: this.format,
      contentType: TEXT_CONTENT_TYPE,
      filename: TEXT_FILENAME,
      content: `${renderPlainText(input)}\n`
    };
  }
}

function renderPlainText(input: CanonicalAiExport): string {
  return [
    "AI PROJECT CONTEXT",
    renderMetadata(input),
    ...input.sections.map(renderSection),
    renderAmbiguities(input.ambiguities),
    renderSummary(input)
  ].join("\n\n");
}

function renderMetadata(input: CanonicalAiExport): string {
  return [
    "CONTEXT METADATA",
    `Context ID: ${input.metadata.contextId}`,
    `Analysis ID: ${input.metadata.analysisId}`,
    `Scan ID: ${input.metadata.scanId}`,
    `Repository ID: ${input.metadata.repositoryId}`,
    `Commit SHA: ${input.metadata.commitSha}`,
    `Context Version: ${input.metadata.contextVersion}`,
    `Export Version: ${input.metadata.exportVersion}`,
    `Generated At: ${input.metadata.generatedAt}`
  ].join("\n");
}

function renderSection(section: CanonicalAiExport["sections"][number]): string {
  return [plainHeading(section.title), indentBlock(renderClaims(section.claims), "  ")].join("\n");
}

function renderAmbiguities(ambiguities: readonly CanonicalAiExportClaim[]): string {
  return ["AMBIGUITIES", indentBlock(renderClaims(ambiguities), "  ")].join("\n");
}

function renderClaims(claims: readonly CanonicalAiExportClaim[]): string {
  if (claims.length === 0) {
    return "Claims: []";
  }

  return claims.map((claim, index) => renderClaim(claim, index + 1)).join("\n\n");
}

function renderClaim(claim: CanonicalAiExportClaim, ordinal: number): string {
  return [
    `CLAIM ${ordinal}`,
    ...(claim.type ? [`  Type: ${claim.type}`] : []),
    `  State: ${claim.kind}`,
    `  Confidence: ${claim.confidence}`,
    "  Value:",
    indentBlock(jsonValue(claim.value), "    "),
    "  Evidence:",
    indentBlock(renderEvidence(claim.evidence), "    ")
  ].join("\n");
}

function renderEvidence(evidence: CanonicalAiExportClaim["evidence"]): string {
  if (evidence.length === 0) {
    return "Evidence: []";
  }

  return evidence
    .map((item, index) =>
      [
        `Evidence ${index + 1}`,
        `  Kind: ${item.kind}`,
        "  Reference:",
        indentBlock(jsonValue(item.reference), "    ")
      ].join("\n")
    )
    .join("\n");
}

function renderSummary(input: CanonicalAiExport): string {
  return [
    "EXPORT SUMMARY",
    `Section Count: ${input.summary.sectionCount}`,
    `Populated Section Count: ${input.summary.populatedSectionCount}`,
    `Section Claim Count: ${input.summary.sectionClaimCount}`,
    `Ambiguity Count: ${input.summary.ambiguityCount}`,
    `Total Claim Count: ${input.summary.totalClaimCount}`,
    `Observed Claim Count: ${input.summary.observedClaimCount}`,
    `Inferred Claim Count: ${input.summary.inferredClaimCount}`,
    `Evidence Count: ${input.summary.evidenceCount}`
  ].join("\n");
}

function jsonValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);

  if (serialized === undefined) {
    throw new TypeError("Canonical AI export value is not JSON serializable.");
  }

  return serialized;
}

function indentBlock(value: string, indentation: string): string {
  return value
    .split("\n")
    .map((line) => `${indentation}${line}`)
    .join("\n");
}

function plainHeading(value: string): string {
  return value.trim().toUpperCase();
}
