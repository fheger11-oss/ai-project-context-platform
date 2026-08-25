import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import type { ProjectContextSnapshot } from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "../domain/contracts/document-generation-input.contract.js";
import type { DocumentRenderer } from "../domain/contracts/document-renderer.contract.js";
import { Document } from "../domain/document.js";
import { assertSupportedDocumentFormat } from "../domain/document-format.js";
import type { DocumentBlock, DocumentModel, DocumentSection } from "../domain/document-model.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import type { GeneratedDocument } from "../domain/generated-document.js";

const DISPLAY_LABELS: Readonly<Record<string, string>> = {
  LOW_CONFIDENCE_MODULE: "Low confidence module",
  RELATIONSHIP_ANALYSIS: "Relationship analysis",
  SOURCE_STRUCTURE: "Source structure",
  UNRESOLVED_IMPORT: "Unresolved import"
};

const MODULE_ISSUE_STAGES = new Set(["SOURCE_STRUCTURE", "RELATIONSHIP_ANALYSIS"]);

const CONFIDENCE_ORDER: Readonly<Record<ContextClaim["confidence"], number>> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const CLAIM_KIND_ORDER: Readonly<Record<ContextClaim["kind"], number>> = {
  OBSERVED: 0,
  INFERRED: 1
};

export class ModuleDocumentationGenerator implements DocumentGenerator {
  constructor(private readonly renderer: DocumentRenderer<DocumentModel>) {}

  async generate(input: DocumentGenerationInput): Promise<GeneratedDocument> {
    if (input.documentType !== "MODULE_DOCUMENTATION") {
      throw new InvalidDocumentTypeError(input.documentType);
    }

    assertSupportedDocumentFormat(input.format);

    const model = composeModuleDocumentation(input.projectContext.toSnapshot());
    const content = await this.renderer.render(model);

    return Document.create({
      contextId: input.projectContext.contextId,
      documentType: input.documentType,
      format: input.format,
      generatorVersion: input.generatorVersion,
      content
    }).toSnapshot();
  }
}

function composeModuleDocumentation(snapshot: ProjectContextSnapshot): DocumentModel {
  const moduleClaims = typedClaims(snapshot.architecture.claims, ["MODULE_CANDIDATE"]);

  return {
    title: "Module Documentation",
    sections: [...moduleIndexSection(moduleClaims), ...moduleSections(snapshot, moduleClaims)]
  };
}

function moduleIndexSection(
  moduleClaims: readonly ContextClaim<Record<string, unknown> & { type: string }>[]
): readonly DocumentSection[] {
  const rows = moduleClaims
    .map((claim) => {
      const name = stringValue(claim.value, "name");
      const path = stringValue(claim.value, "path");
      const sourceFileCount = numberValue(claim.value, "sourceFileCount");
      const declarationCount = numberValue(claim.value, "declarationCount");

      return name && path && sourceFileCount !== null && declarationCount !== null
        ? [name, path, String(sourceFileCount), String(declarationCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Module Index", [
    ...tableBlock(["Module", "Path", "Source Files", "Declarations", "Semantics"], rows),
    ...sourceBlocks(moduleClaims)
  ]);
}

function moduleSections(
  snapshot: ProjectContextSnapshot,
  moduleClaims: readonly ContextClaim<Record<string, unknown> & { type: string }>[]
): readonly DocumentSection[] {
  return moduleClaims
    .map((moduleClaim) => moduleSection(snapshot, moduleClaim))
    .filter(isPresent)
    .sort((left, right) => left.heading.localeCompare(right.heading));
}

function moduleSection(
  snapshot: ProjectContextSnapshot,
  moduleClaim: ContextClaim<Record<string, unknown> & { type: string }>
): DocumentSection | null {
  const moduleId = stringValue(moduleClaim.value, "moduleId");
  const name = stringValue(moduleClaim.value, "name");
  const path = stringValue(moduleClaim.value, "path");
  const sourceFileCount = numberValue(moduleClaim.value, "sourceFileCount");
  const declarationCount = numberValue(moduleClaim.value, "declarationCount");
  const internalRelationshipCount = numberValue(moduleClaim.value, "internalRelationshipCount");
  const incomingRelationshipCount = numberValue(moduleClaim.value, "incomingRelationshipCount");
  const outgoingRelationshipCount = numberValue(moduleClaim.value, "outgoingRelationshipCount");

  if (
    !moduleId ||
    !name ||
    !path ||
    sourceFileCount === null ||
    declarationCount === null ||
    internalRelationshipCount === null ||
    incomingRelationshipCount === null ||
    outgoingRelationshipCount === null
  ) {
    return null;
  }

  const relationships = moduleRelationshipClaims(snapshot, moduleId);
  const sourceGroups = sourceGroupClaims(snapshot, moduleId, path);
  const ambiguities = moduleAmbiguityClaims(snapshot, path);
  const blocks = [
    ...tableBlock(
      ["Field", "Value"],
      [
        ["Path", path],
        ["Source file count", String(sourceFileCount)],
        ["Declaration count", String(declarationCount)],
        ["Internal relationships", String(internalRelationshipCount)],
        ["Incoming relationships", String(incomingRelationshipCount)],
        ["Outgoing relationships", String(outgoingRelationshipCount)],
        ["Semantics", qualifier(moduleClaim)]
      ]
    ),
    ...relationshipBlocks(relationships, moduleId),
    ...sourceGroupBlocks(sourceGroups),
    ...ambiguityBlocks(ambiguities),
    ...sourceBlocks([moduleClaim, ...relationships, ...sourceGroups, ...ambiguities])
  ];

  return {
    heading: `Module: ${name}`,
    blocks
  };
}

function moduleRelationshipClaims(
  snapshot: ProjectContextSnapshot,
  moduleId: string
): ContextClaim<Record<string, unknown> & { type: string }>[] {
  return typedClaims(snapshot.architecture.claims, ["MODULE_RELATIONSHIP"]).filter((claim) => {
    const sourceModuleId = stringValue(claim.value, "sourceModuleId");
    const targetModuleId = stringValue(claim.value, "targetModuleId");

    return sourceModuleId === moduleId || targetModuleId === moduleId;
  });
}

function sourceGroupClaims(
  snapshot: ProjectContextSnapshot,
  moduleId: string,
  modulePath: string
): ContextClaim<Record<string, unknown> & { type: string }>[] {
  return typedClaims(snapshot.structure.claims, ["SOURCE_GROUP"]).filter((claim) => {
    const sourceGroupModuleId = stringValue(claim.value, "moduleId");
    const sourceGroupPath = stringValue(claim.value, "path");

    return sourceGroupModuleId === moduleId || sourceGroupPath === modulePath;
  });
}

function moduleAmbiguityClaims(
  snapshot: ProjectContextSnapshot,
  modulePath: string
): ContextClaim<Record<string, unknown> & { type: string }>[] {
  return typedClaims(snapshot.ambiguities, ["ANALYSIS_ISSUE"]).filter((claim) => {
    const stage = stringValue(claim.value, "stage");
    const path = nullableStringValue(claim.value, "path");

    return Boolean(stage && MODULE_ISSUE_STAGES.has(stage) && path?.startsWith(modulePath));
  });
}

function relationshipBlocks(
  claims: readonly ContextClaim<Record<string, unknown> & { type: string }>[],
  moduleId: string
): readonly DocumentBlock[] {
  const rows = claims
    .map((claim) => {
      const sourceModuleId = stringValue(claim.value, "sourceModuleId");
      const targetModuleId = stringValue(claim.value, "targetModuleId");
      const relationshipCount = numberValue(claim.value, "relationshipCount");

      if (!sourceModuleId || !targetModuleId || relationshipCount === null) {
        return null;
      }

      const direction =
        sourceModuleId === moduleId && targetModuleId === moduleId
          ? "Internal"
          : sourceModuleId === moduleId
            ? "Outgoing"
            : "Incoming";

      return [
        direction,
        sourceModuleId,
        targetModuleId,
        String(relationshipCount),
        qualifier(claim)
      ];
    })
    .filter(isPresent)
    .sort(compareRows);

  return tableBlock(["Direction", "Source", "Target", "Relationships", "Semantics"], rows);
}

function sourceGroupBlocks(
  claims: readonly ContextClaim<Record<string, unknown> & { type: string }>[]
): readonly DocumentBlock[] {
  const rows = claims
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const sourceFileCount = numberValue(claim.value, "sourceFileCount");
      const declarationCount = numberValue(claim.value, "declarationCount");

      return path && sourceFileCount !== null && declarationCount !== null
        ? [path, String(sourceFileCount), String(declarationCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return tableBlock(["Source Group", "Source Files", "Declarations", "Semantics"], rows);
}

function ambiguityBlocks(
  claims: readonly ContextClaim<Record<string, unknown> & { type: string }>[]
): readonly DocumentBlock[] {
  const rows = claims
    .map((claim) => {
      const stage = stringValue(claim.value, "stage");
      const path = nullableStringValue(claim.value, "path");
      const issueCode = stringValue(claim.value, "code");
      const message = nullableStringValue(claim.value, "message");

      return stage && issueCode
        ? [
            displayLabel(stage),
            path ?? "",
            displayLabel(issueCode),
            message ?? "",
            qualifier(claim)
          ]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return tableBlock(["Stage", "Path", "Issue", "Message", "Semantics"], rows);
}

function section(heading: string, blocks: readonly DocumentBlock[]): readonly DocumentSection[] {
  if (blocks.length === 0) {
    return [];
  }

  return [{ heading, blocks }];
}

function tableBlock(
  columns: readonly string[],
  rows: readonly (readonly string[])[]
): readonly DocumentBlock[] {
  return rows.length > 0 ? [{ kind: "table", columns, rows }] : [];
}

function sourceBlocks(claims: readonly ContextClaim[]): readonly DocumentBlock[] {
  const sources = compactEvidenceSummary(claims);

  return sources ? [{ kind: "paragraph", text: `Sources: ${sources}.` }] : [];
}

function compactEvidenceSummary(claims: readonly ContextClaim[]): string {
  return [...new Set(claims.flatMap((claim) => claim.evidence.map(evidenceLabel)))]
    .sort()
    .slice(0, 5)
    .join("; ");
}

function typedClaims(
  claims: readonly ContextClaim[],
  types: readonly string[]
): ContextClaim<Record<string, unknown> & { type: string }>[] {
  const supportedTypes = new Set(types);

  return [...claims]
    .filter((claim): claim is ContextClaim<Record<string, unknown> & { type: string }> =>
      isTypedClaim(claim, supportedTypes)
    )
    .sort(compareClaims);
}

function isTypedClaim(
  claim: ContextClaim,
  supportedTypes: ReadonlySet<string>
): claim is ContextClaim<Record<string, unknown> & { type: string }> {
  return (
    isRecord(claim.value) &&
    typeof claim.value.type === "string" &&
    supportedTypes.has(claim.value.type)
  );
}

function compareClaims(left: ContextClaim, right: ContextClaim): number {
  return (
    CLAIM_KIND_ORDER[left.kind] - CLAIM_KIND_ORDER[right.kind] ||
    CONFIDENCE_ORDER[left.confidence] - CONFIDENCE_ORDER[right.confidence] ||
    stableClaimKey(left).localeCompare(stableClaimKey(right))
  );
}

function stableClaimKey(claim: ContextClaim): string {
  return `${claim.kind}:${claim.confidence}:${stableSerialize(claim.value)}:${claim.evidence
    .map(evidenceLabel)
    .sort()
    .join("|")}`;
}

function qualifier(claim: ContextClaim): string {
  if (claim.kind === "OBSERVED" && claim.confidence === "HIGH") {
    return "Observed";
  }

  if (claim.kind === "OBSERVED") {
    return "Observed, low confidence";
  }

  if (claim.confidence === "HIGH") {
    return "Inferred";
  }

  if (claim.confidence === "MEDIUM") {
    return "Likely inferred";
  }

  return "Low-confidence inference";
}

function displayLabel(value: string): string {
  return DISPLAY_LABELS[value] ?? titleCaseIdentifier(value);
}

function titleCaseIdentifier(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function compareRows(left: readonly string[], right: readonly string[]): number {
  return left.join("\u0000").localeCompare(right.join("\u0000"));
}

function isPresent<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === "string" ? value[key] : null;
}

function nullableStringValue(value: Record<string, unknown>, key: string): string | null {
  const item = value[key];

  return item === undefined || item === null || typeof item === "string" ? (item ?? null) : null;
}

function numberValue(value: Record<string, unknown>, key: string): number | null {
  return typeof value[key] === "number" ? value[key] : null;
}

function evidenceLabel(evidence: ContextEvidence): string {
  switch (evidence.reference.kind) {
    case "PROJECT_METADATA":
      return `project metadata ${evidence.reference.field}`;
    case "MANIFEST":
      return `manifest ${evidence.reference.path}`;
    case "DEPENDENCY":
      return `dependency ${evidence.reference.name} in ${evidence.reference.manifestPath}`;
    case "FILE_CLASSIFICATION":
      return `file classification ${evidence.reference.path}`;
    case "SOURCE_STRUCTURE":
      return `source structure ${evidence.reference.path}`;
    case "RELATIONSHIP":
      return `relationship ${evidence.reference.sourcePath} -> ${evidence.reference.specifier}`;
    case "ISSUE":
      return `issue ${evidence.reference.stage}/${evidence.reference.path}/${evidence.reference.code}`;
  }
}

function stableSerialize(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(", ")}]`;
  }

  return `{ ${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${key}: ${stableSerialize(item)}`)
    .join(", ")} }`;
}
