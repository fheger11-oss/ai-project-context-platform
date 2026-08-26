import type { ContextClaim, ContextEvidence } from "../../context/domain/context-claim.js";
import type { ProjectContext } from "../../context/domain/project-context.js";
import { AI_EXPORT_ENGINE_VERSION } from "./ai-export-engine-version.js";
import {
  CANONICAL_AI_EXPORT_SECTION_ORDER,
  type CanonicalAiExport,
  type CanonicalAiExportClaim,
  type CanonicalAiExportSection,
  type CanonicalAiExportSectionKey,
  type CanonicalAiExportSummary
} from "../domain/canonical-ai-export.js";
import type { AiExportProjector } from "../domain/contracts/ai-export-projector.contract.js";

const SECTION_TITLES: Readonly<Record<CanonicalAiExportSectionKey, string>> = {
  project: "Project",
  technology: "Technology",
  structure: "Structure",
  architecture: "Architecture",
  entryPoints: "Entry Points",
  testing: "Testing",
  infrastructure: "Infrastructure"
};

const CLAIM_KIND_ORDER: Readonly<Record<ContextClaim["kind"], number>> = {
  OBSERVED: 0,
  INFERRED: 1
};

const CONFIDENCE_ORDER: Readonly<Record<ContextClaim["confidence"], number>> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

export class ProjectContextAiExportProjector implements AiExportProjector {
  project(projectContext: ProjectContext): CanonicalAiExport {
    const snapshot = projectContext.toSnapshot();
    const sections = CANONICAL_AI_EXPORT_SECTION_ORDER.map((key) => ({
      key,
      title: SECTION_TITLES[key],
      claims: orderedClaims(snapshot[key].claims)
    }));
    const ambiguities = orderedClaims(snapshot.ambiguities);

    return {
      metadata: {
        contextId: snapshot.contextId,
        analysisId: snapshot.analysisId,
        scanId: snapshot.scanId,
        repositoryId: snapshot.repositoryId,
        commitSha: snapshot.commitSha,
        contextVersion: snapshot.contextVersion,
        generatedAt: snapshot.generatedAt.toISOString(),
        exportVersion: AI_EXPORT_ENGINE_VERSION
      },
      sections,
      ambiguities,
      summary: summarize(sections, ambiguities)
    };
  }
}

function orderedClaims(claims: readonly ContextClaim[]): CanonicalAiExportClaim[] {
  return [...claims].sort(compareClaims).map((claim) => ({
    ...claimType(claim),
    value: cloneUnknown(claim.value),
    kind: claim.kind,
    confidence: claim.confidence,
    evidence: [...claim.evidence].sort(compareEvidence).map(cloneEvidence)
  }));
}

function claimType(claim: ContextClaim): { type?: string } {
  if (
    typeof claim.value === "object" &&
    claim.value !== null &&
    !Array.isArray(claim.value) &&
    Object.hasOwn(claim.value, "type")
  ) {
    const type = (claim.value as { type?: unknown }).type;

    if (typeof type === "string") {
      return { type };
    }
  }

  return {};
}

function summarize(
  sections: readonly CanonicalAiExportSection[],
  ambiguities: readonly CanonicalAiExportClaim[]
): CanonicalAiExportSummary {
  const sectionClaims = sections.flatMap((section) => section.claims);
  const claims = [...sectionClaims, ...ambiguities];

  return {
    sectionCount: sections.length,
    populatedSectionCount: sections.filter((section) => section.claims.length > 0).length,
    sectionClaimCount: sectionClaims.length,
    ambiguityCount: ambiguities.length,
    totalClaimCount: claims.length,
    observedClaimCount: claims.filter((claim) => claim.kind === "OBSERVED").length,
    inferredClaimCount: claims.filter((claim) => claim.kind === "INFERRED").length,
    evidenceCount: claims.reduce((total, claim) => total + claim.evidence.length, 0)
  };
}

function compareClaims(left: ContextClaim, right: ContextClaim): number {
  return (
    compareStrings(claimType(left).type ?? "", claimType(right).type ?? "") ||
    compareStrings(claimStableKey(left), claimStableKey(right)) ||
    CLAIM_KIND_ORDER[left.kind] - CLAIM_KIND_ORDER[right.kind] ||
    CONFIDENCE_ORDER[left.confidence] - CONFIDENCE_ORDER[right.confidence] ||
    compareStrings(stableStringify(left.value), stableStringify(right.value)) ||
    compareStrings(stableStringify(left.evidence), stableStringify(right.evidence))
  );
}

function claimStableKey(claim: ContextClaim): string {
  const value = claim.value;

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return stableStringify(value);
  }

  const record = value as Record<string, unknown>;

  switch (record.type) {
    case "PROJECT_PACKAGE":
      return joinKey(record.path, record.name, record.version, record.isPrimary);
    case "APPLICATION_TYPE":
      return joinKey(record.applicationType);
    case "PRIMARY_LANGUAGE":
      return joinKey(record.language);
    case "ECOSYSTEM":
      return joinKey(record.ecosystem);
    case "LANGUAGE":
      return joinKey(record.language, record.fileCount);
    case "FRAMEWORK":
      return joinKey(record.framework);
    case "PACKAGE_MANAGER":
      return joinKey(record.packageManager);
    case "MANIFEST":
      return joinKey(record.path, record.manifestType, record.isPrimary);
    case "DEPENDENCY":
      return joinKey(record.manifestPath, record.dependencyType, record.name, record.version);
    case "PACKAGE_SCRIPT":
      return joinKey(record.manifestPath, record.name, record.command);
    case "SOURCE_GROUP":
      return joinKey(record.path, record.moduleId);
    case "MODULE_CANDIDATE":
      return joinKey(record.moduleId, record.path);
    case "MODULE_RELATIONSHIP":
      return joinKey(record.sourceModuleId, record.targetModuleId);
    case "SOURCE_ENTRY_POINT_CANDIDATE":
      return joinKey(record.entryPointId, record.path);
    case "TESTING_ARTIFACTS_PRESENT":
      return joinKey(record.testFileCount, record.structuredTestFileCount);
    case "TEST_FILE":
    case "TEST_SOURCE_STRUCTURE":
    case "INFRASTRUCTURE_ARTIFACT":
    case "CONFIGURATION_ARTIFACT":
      return joinKey(record.path);
    case "INFRASTRUCTURE_ARTIFACTS_PRESENT":
    case "CONFIGURATION_ARTIFACTS_PRESENT":
      return joinKey(record.artifactCount);
    case "ANALYSIS_ISSUE":
      return joinKey(record.stage, record.path, record.code, record.specifier, record.message);
    default:
      return stableStringify(value);
  }
}

function compareEvidence(left: ContextEvidence, right: ContextEvidence): number {
  return (
    compareStrings(left.kind, right.kind) ||
    compareStrings(evidenceStableKey(left), evidenceStableKey(right)) ||
    compareStrings(stableStringify(left.reference), stableStringify(right.reference))
  );
}

function evidenceStableKey(evidence: ContextEvidence): string {
  const reference = evidence.reference;

  switch (reference.kind) {
    case "PROJECT_METADATA":
      return joinKey(reference.field);
    case "MANIFEST":
    case "FILE_CLASSIFICATION":
    case "SOURCE_STRUCTURE":
      return joinKey(reference.path);
    case "DEPENDENCY":
      return joinKey(reference.manifestPath, reference.name);
    case "RELATIONSHIP":
      return joinKey(reference.sourcePath, reference.specifier);
    case "ISSUE":
      return joinKey(reference.stage, reference.path, reference.code);
  }
}

function cloneEvidence(evidence: ContextEvidence): ContextEvidence {
  return cloneUnknown(evidence) as ContextEvidence;
}

function cloneUnknown<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item)) as T;
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, cloneUnknown(entryValue)])
    ) as T;
  }

  return value;
}

function joinKey(...values: readonly unknown[]): string {
  return values.map(stableStringify).join("\u0000");
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof Date) {
    return `Date(${value.toISOString()})`;
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort(compareStrings)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`
      )
      .join(",")}}`;
  }

  return String(value);
}

function compareStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}
