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
  const value = claimValueText(claim.value);

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

function claimValueText(value: unknown): string {
  if (!isRecord(value) || typeof value.type !== "string") {
    return stableSerialize(value);
  }

  switch (value.type) {
    case "APPLICATION_TYPE": {
      const applicationType = stringValue(value, "applicationType");

      return applicationType ? `application type is ${applicationType}` : stableSerialize(value);
    }
    case "PRIMARY_LANGUAGE": {
      const language = stringValue(value, "language");

      return language ? `primary language is ${language}` : stableSerialize(value);
    }
    case "ECOSYSTEM": {
      const ecosystem = stringValue(value, "ecosystem");

      return ecosystem ? `ecosystem ${ecosystem} is present` : stableSerialize(value);
    }
    case "LANGUAGE": {
      const language = stringValue(value, "language");
      const fileCount = numberValue(value, "fileCount");

      return language && fileCount !== null
        ? `${language} appears in ${countText(fileCount, "file")}`
        : stableSerialize(value);
    }
    case "FRAMEWORK": {
      const framework = stringValue(value, "framework");

      return framework ? `framework ${framework} is present` : stableSerialize(value);
    }
    case "PACKAGE_MANAGER": {
      const packageManager = stringValue(value, "packageManager");

      return packageManager
        ? `package manager ${packageManager} is present`
        : stableSerialize(value);
    }
    case "DEPENDENCY": {
      const name = stringValue(value, "name");

      return name ? `dependency ${name} is present` : stableSerialize(value);
    }
    case "SOURCE_GROUP":
      return sourceGroupText(value);
    case "MODULE_CANDIDATE":
      return moduleCandidateText(value);
    case "MODULE_RELATIONSHIP":
      return moduleRelationshipText(value);
    case "SOURCE_ENTRY_POINT_CANDIDATE":
      return sourceEntryPointText(value);
    case "TEST_FILE": {
      const path = stringValue(value, "path");

      return path ? `test file ${path} is present` : stableSerialize(value);
    }
    case "TEST_SOURCE_STRUCTURE":
      return testSourceStructureText(value);
    case "TESTING_ARTIFACTS_PRESENT":
      return testingArtifactsText(value);
    case "INFRASTRUCTURE_ARTIFACT": {
      const path = stringValue(value, "path");

      return path ? `infrastructure artifact ${path} is present` : stableSerialize(value);
    }
    case "CONFIGURATION_ARTIFACT": {
      const path = stringValue(value, "path");

      return path ? `configuration artifact ${path} is present` : stableSerialize(value);
    }
    case "INFRASTRUCTURE_ARTIFACTS_PRESENT": {
      const artifactCount = numberValue(value, "artifactCount");

      return artifactCount !== null
        ? `infrastructure artifacts include ${countText(artifactCount, "artifact")}`
        : stableSerialize(value);
    }
    case "CONFIGURATION_ARTIFACTS_PRESENT": {
      const artifactCount = numberValue(value, "artifactCount");

      return artifactCount !== null
        ? `configuration artifacts include ${countText(artifactCount, "artifact")}`
        : stableSerialize(value);
    }
    default:
      return stableSerialize(value);
  }
}

function sourceGroupText(value: Record<string, unknown>): string {
  const path = stringValue(value, "path");
  const sourceFileCount = numberValue(value, "sourceFileCount");
  const declarationCount = numberValue(value, "declarationCount");

  if (!path || sourceFileCount === null || declarationCount === null) {
    return stableSerialize(value);
  }

  return `source group ${path} contains ${countText(
    sourceFileCount,
    "source file"
  )} and ${countText(declarationCount, "declaration")}`;
}

function moduleCandidateText(value: Record<string, unknown>): string {
  const name = stringValue(value, "name");
  const path = stringValue(value, "path");
  const sourceFileCount = numberValue(value, "sourceFileCount");
  const declarationCount = numberValue(value, "declarationCount");
  const internalRelationshipCount = numberValue(value, "internalRelationshipCount");
  const incomingRelationshipCount = numberValue(value, "incomingRelationshipCount");
  const outgoingRelationshipCount = numberValue(value, "outgoingRelationshipCount");

  if (
    !name ||
    !path ||
    sourceFileCount === null ||
    declarationCount === null ||
    internalRelationshipCount === null ||
    incomingRelationshipCount === null ||
    outgoingRelationshipCount === null
  ) {
    return stableSerialize(value);
  }

  return `module candidate ${name} at ${path} contains ${countText(
    sourceFileCount,
    "source file"
  )}, ${countText(declarationCount, "declaration")}, ${countText(
    internalRelationshipCount,
    "internal relationship"
  )}, ${countText(incomingRelationshipCount, "incoming relationship")}, and ${countText(
    outgoingRelationshipCount,
    "outgoing relationship"
  )}`;
}

function moduleRelationshipText(value: Record<string, unknown>): string {
  const sourceModuleId = stringValue(value, "sourceModuleId");
  const targetModuleId = stringValue(value, "targetModuleId");
  const relationshipCount = numberValue(value, "relationshipCount");

  if (!sourceModuleId || !targetModuleId || relationshipCount === null) {
    return stableSerialize(value);
  }

  return `module ${sourceModuleId} relates to ${targetModuleId} through ${countText(
    relationshipCount,
    "relationship"
  )}`;
}

function sourceEntryPointText(value: Record<string, unknown>): string {
  const path = stringValue(value, "path");
  const connectedSourceFileCount = numberValue(value, "connectedSourceFileCount");
  const outgoingRelationshipCount = numberValue(value, "outgoingRelationshipCount");

  if (!path || connectedSourceFileCount === null || outgoingRelationshipCount === null) {
    return stableSerialize(value);
  }

  return `entry point candidate ${path} reaches ${countText(
    connectedSourceFileCount,
    "connected source file"
  )} with ${countText(outgoingRelationshipCount, "outgoing relationship")}`;
}

function testSourceStructureText(value: Record<string, unknown>): string {
  const path = stringValue(value, "path");
  const declarationCount = numberValue(value, "declarationCount");

  if (!path || declarationCount === null) {
    return stableSerialize(value);
  }

  return `test source structure ${path} contains ${countText(declarationCount, "declaration")}`;
}

function testingArtifactsText(value: Record<string, unknown>): string {
  const testFileCount = numberValue(value, "testFileCount");
  const structuredTestFileCount = numberValue(value, "structuredTestFileCount");

  if (testFileCount === null || structuredTestFileCount === null) {
    return stableSerialize(value);
  }

  return `testing artifacts include ${countText(testFileCount, "test file")} and ${countText(
    structuredTestFileCount,
    "structured test file"
  )}`;
}

function countText(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === "string" ? value[key] : null;
}

function numberValue(value: Record<string, unknown>, key: string): number | null {
  return typeof value[key] === "number" ? value[key] : null;
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
