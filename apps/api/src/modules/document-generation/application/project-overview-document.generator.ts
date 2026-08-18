import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import type {
  ProjectContextSections,
  ProjectContextSnapshot
} from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "../domain/contracts/document-generation-input.contract.js";
import type { DocumentRenderer } from "../domain/contracts/document-renderer.contract.js";
import { Document } from "../domain/document.js";
import { assertSupportedDocumentFormat } from "../domain/document-format.js";
import type { DocumentModel, DocumentSection } from "../domain/document-model.js";
import { assertSupportedDocumentType } from "../domain/document-type.js";
import type { GeneratedDocument } from "../domain/generated-document.js";

type ContextSectionKey = Exclude<keyof ProjectContextSections, "ambiguities">;

const SECTION_ORDER: readonly { key: ContextSectionKey; heading: string }[] = [
  { key: "project", heading: "Project" },
  { key: "technology", heading: "Technology" },
  { key: "structure", heading: "Structure" },
  { key: "architecture", heading: "Architecture" },
  { key: "entryPoints", heading: "Entry Points" },
  { key: "testing", heading: "Testing" },
  { key: "infrastructure", heading: "Infrastructure" }
];

const CONFIDENCE_ORDER: Readonly<Record<ContextClaim["confidence"], number>> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const CLAIM_KIND_ORDER: Readonly<Record<ContextClaim["kind"], number>> = {
  OBSERVED: 0,
  INFERRED: 1
};

export class ProjectOverviewDocumentGenerator implements DocumentGenerator {
  constructor(private readonly renderer: DocumentRenderer<DocumentModel>) {}

  async generate(input: DocumentGenerationInput): Promise<GeneratedDocument> {
    assertSupportedDocumentType(input.documentType);
    assertSupportedDocumentFormat(input.format);

    const model = this.compose(input.projectContext.toSnapshot());
    const content = await this.renderer.render(model);

    return Document.create({
      contextId: input.projectContext.contextId,
      documentType: input.documentType,
      format: input.format,
      generatorVersion: input.generatorVersion,
      content
    }).toSnapshot();
  }

  private compose(snapshot: ProjectContextSnapshot): DocumentModel {
    return {
      title: "Project Overview",
      sections: [
        ...SECTION_ORDER.flatMap(({ key, heading }) =>
          this.sectionFromClaims(heading, snapshot[key].claims)
        ),
        ...this.sectionFromClaims("Ambiguities", snapshot.ambiguities)
      ]
    };
  }

  private sectionFromClaims(
    heading: string,
    claims: readonly ContextClaim[]
  ): readonly DocumentSection[] {
    const items = [...claims].sort(compareClaims).map((claim) => claimListItem(claim));

    if (items.length === 0) {
      return [];
    }

    return [
      {
        heading,
        blocks: [
          {
            kind: "unordered-list",
            items
          }
        ]
      }
    ];
  }
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

function claimListItem(claim: ContextClaim): string {
  const statement = claimStatement(claim);
  const evidence = evidenceSummary(claim.evidence);

  return evidence ? `${statement} Evidence: ${evidence}.` : statement;
}

function claimStatement(claim: ContextClaim): string {
  const value = stableSerialize(claim.value);

  if (claim.kind === "OBSERVED" && claim.confidence === "LOW") {
    return `Observed with low confidence: ${value}.`;
  }

  if (claim.kind === "OBSERVED") {
    return `Observed: ${value}.`;
  }

  if (claim.confidence === "HIGH") {
    return `Inferred: ${value}.`;
  }

  if (claim.confidence === "MEDIUM") {
    return `Likely inferred: ${value}.`;
  }

  return `Possible inference with low confidence: ${value}.`;
}

function evidenceSummary(evidence: readonly ContextEvidence[]): string {
  return evidence.map(evidenceLabel).sort().slice(0, 3).join("; ");
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
