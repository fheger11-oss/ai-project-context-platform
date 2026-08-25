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
  BACKEND: "Backend application",
  BACKEND_APPLICATION: "Backend application",
  CSS: "CSS",
  DEPENDENCY: "Dependency",
  DEV_DEPENDENCY: "Dev dependency",
  FRONTEND: "Frontend application",
  FULLSTACK: "Full-stack application",
  FULLSTACK_APPLICATION: "Full-stack application",
  HTML: "HTML",
  JAVASCRIPT: "JavaScript",
  JSON: "JSON",
  MALFORMED_PACKAGE_JSON: "Malformed package.json",
  MISSING_MANIFEST_CONTENT: "Missing manifest content",
  NESTJS: "NestJS",
  NODE_JS: "Node.js",
  NPM: "npm",
  OPTIONAL_DEPENDENCY: "Optional dependency",
  PACKAGE_JSON: "package.json",
  PEER_DEPENDENCY: "Peer dependency",
  PNPM: "pnpm",
  PROJECT_DETECTION: "Project detection",
  REACT: "React",
  RELATIONSHIP_ANALYSIS: "Relationship analysis",
  SOURCE_STRUCTURE: "Source structure",
  TSCONFIG: "tsconfig.json",
  TYPESCRIPT: "TypeScript",
  VITE: "Vite",
  YARN: "Yarn"
};

const CONFIDENCE_ORDER: Readonly<Record<ContextClaim["confidence"], number>> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const CLAIM_KIND_ORDER: Readonly<Record<ContextClaim["kind"], number>> = {
  OBSERVED: 0,
  INFERRED: 1
};

export class TechnicalDocumentationGenerator implements DocumentGenerator {
  constructor(private readonly renderer: DocumentRenderer<DocumentModel>) {}

  async generate(input: DocumentGenerationInput): Promise<GeneratedDocument> {
    if (input.documentType !== "TECHNICAL_DOCUMENTATION") {
      throw new InvalidDocumentTypeError(input.documentType);
    }

    assertSupportedDocumentFormat(input.format);

    const model = composeTechnicalDocumentation(input.projectContext.toSnapshot());
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

function composeTechnicalDocumentation(snapshot: ProjectContextSnapshot): DocumentModel {
  return {
    title: "Technical Documentation",
    sections: [
      ...projectIdentitySection(snapshot),
      ...technologyStackSection(snapshot),
      ...packagesAndDependenciesSection(snapshot),
      ...availableScriptsSection(snapshot),
      ...projectStructureSection(snapshot),
      ...modulesSection(snapshot),
      ...moduleRelationshipsSection(snapshot),
      ...entryPointCandidatesSection(snapshot),
      ...configurationInfrastructureSection(snapshot),
      ...testingContextSection(snapshot),
      ...technicalAmbiguitiesSection(snapshot)
    ]
  };
}

function projectIdentitySection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const projectClaims = typedClaims(snapshot.project.claims, [
    "PROJECT_PACKAGE",
    "APPLICATION_TYPE",
    "PRIMARY_LANGUAGE"
  ]);
  const technologyClaims = typedClaims(snapshot.technology.claims, ["PACKAGE_MANAGER", "MANIFEST"]);
  const primaryManifestClaims = technologyClaims.filter((claim) => {
    if (claim.value.type !== "MANIFEST") {
      return false;
    }

    return booleanValue(claim.value, "isPrimary") === true;
  });
  const claims = [...projectClaims, ...technologyClaims];
  const rows = [
    ...projectClaims.map(projectIdentityRow),
    ...technologyClaims
      .filter((claim) => claim.value.type === "PACKAGE_MANAGER")
      .map(packageManagerIdentityRow),
    ...primaryManifestClaims.map(primaryManifestIdentityRow)
  ]
    .filter(isPresent)
    .sort(compareRows);

  return section("Project Identity", [
    ...tableBlock(["Field", "Value", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function projectIdentityRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  switch (claim.value.type) {
    case "PROJECT_PACKAGE": {
      const path = stringValue(claim.value, "path");
      const name = nullableStringValue(claim.value, "name");
      const version = nullableStringValue(claim.value, "version");
      const isPrimary = booleanValue(claim.value, "isPrimary");

      if (!path || isPrimary === null) {
        return null;
      }

      return [
        isPrimary ? "Primary package" : "Package",
        [name, version, path].filter(isPresent).join(" — "),
        qualifier(claim)
      ];
    }
    case "APPLICATION_TYPE": {
      const applicationType = stringValue(claim.value, "applicationType");

      return applicationType
        ? ["Application type", displayLabel(applicationType), qualifier(claim)]
        : null;
    }
    case "PRIMARY_LANGUAGE": {
      const language = stringValue(claim.value, "language");

      return language ? ["Primary language", displayLabel(language), qualifier(claim)] : null;
    }
    default:
      return null;
  }
}

function packageManagerIdentityRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const packageManager = stringValue(claim.value, "packageManager");

  return packageManager
    ? ["Package manager", displayLabel(packageManager), qualifier(claim)]
    : null;
}

function primaryManifestIdentityRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const path = stringValue(claim.value, "path");
  const manifestType = stringValue(claim.value, "manifestType");

  return path && manifestType
    ? ["Primary manifest", `${path} — ${displayLabel(manifestType)}`, qualifier(claim)]
    : null;
}

function technologyStackSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.technology.claims, [
    "ECOSYSTEM",
    "LANGUAGE",
    "FRAMEWORK",
    "PACKAGE_MANAGER",
    "MANIFEST"
  ]);
  const ecosystemRows = typedClaims(snapshot.technology.claims, ["ECOSYSTEM"])
    .map((claim) => {
      const ecosystem = stringValue(claim.value, "ecosystem");

      return ecosystem ? [displayLabel(ecosystem), qualifier(claim)] : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const languageRows = typedClaims(snapshot.technology.claims, ["LANGUAGE"])
    .map((claim) => {
      const language = stringValue(claim.value, "language");
      const fileCount = numberValue(claim.value, "fileCount");

      return language && fileCount !== null
        ? [displayLabel(language), String(fileCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || compareRows(left, right));
  const frameworkRows = typedClaims(snapshot.technology.claims, ["FRAMEWORK"])
    .map((claim) => {
      const framework = stringValue(claim.value, "framework");

      return framework ? [displayLabel(framework), qualifier(claim)] : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const packageManagerRows = typedClaims(snapshot.technology.claims, ["PACKAGE_MANAGER"])
    .map((claim) => {
      const packageManager = stringValue(claim.value, "packageManager");

      return packageManager ? [displayLabel(packageManager), qualifier(claim)] : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const manifestRows = typedClaims(snapshot.technology.claims, ["MANIFEST"])
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const manifestType = stringValue(claim.value, "manifestType");
      const isPrimary = booleanValue(claim.value, "isPrimary");

      return path && manifestType && isPrimary !== null
        ? [path, displayLabel(manifestType), isPrimary ? "yes" : "no", qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const blocks = [
    ...tableBlock(["Ecosystem", "Semantics"], ecosystemRows),
    ...tableBlock(["Language", "Files", "Semantics"], languageRows),
    ...tableBlock(["Framework", "Semantics"], frameworkRows),
    ...tableBlock(["Package Manager", "Semantics"], packageManagerRows),
    ...tableBlock(["Manifest", "Type", "Primary", "Semantics"], manifestRows),
    ...sourceBlocks(claims)
  ];

  return section("Technology Stack", blocks);
}

function packagesAndDependenciesSection(
  snapshot: ProjectContextSnapshot
): readonly DocumentSection[] {
  const packageClaims = typedClaims(snapshot.project.claims, ["PROJECT_PACKAGE"]);
  const dependencyClaims = typedClaims(snapshot.technology.claims, ["DEPENDENCY"]);
  const packageRows = packageClaims
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const name = nullableStringValue(claim.value, "name");
      const version = nullableStringValue(claim.value, "version");
      const isPrimary = booleanValue(claim.value, "isPrimary");

      return path && isPrimary !== null
        ? [path, name ?? "", version ?? "", isPrimary ? "yes" : "no", qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const dependencyRows = dependencyClaims
    .map((claim) => {
      const name = stringValue(claim.value, "name");
      const version = nullableStringValue(claim.value, "version");
      const dependencyType = stringValue(claim.value, "dependencyType");
      const manifestPath = stringValue(claim.value, "manifestPath");

      return name && dependencyType && manifestPath
        ? [manifestPath, name, version ?? "", displayLabel(dependencyType), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const blocks = [
    ...tableBlock(["Manifest", "Name", "Version", "Primary", "Semantics"], packageRows),
    ...tableBlock(["Manifest", "Package", "Version", "Type", "Semantics"], dependencyRows),
    ...sourceBlocks([...packageClaims, ...dependencyClaims])
  ];

  return section("Packages and Dependencies", blocks);
}

function availableScriptsSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const scriptClaims = typedClaims(snapshot.technology.claims, ["PACKAGE_SCRIPT"]);
  const rows = scriptClaims
    .map((claim) => {
      const manifestPath = stringValue(claim.value, "manifestPath");
      const name = stringValue(claim.value, "name");
      const command = stringValue(claim.value, "command");

      return manifestPath && name && command ? [manifestPath, name, code(command)] : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Available Scripts", [
    ...tableBlock(["Package", "Script", "Command"], rows),
    ...sourceBlocks(scriptClaims)
  ]);
}

function projectStructureSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.structure.claims, ["SOURCE_GROUP"]);
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

  return section("Project Structure", [
    ...tableBlock(["Path", "Files", "Declarations", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function modulesSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.architecture.claims, ["MODULE_CANDIDATE"]);
  const rows = claims
    .map((claim) => {
      const name = stringValue(claim.value, "name");
      const path = stringValue(claim.value, "path");
      const sourceFileCount = numberValue(claim.value, "sourceFileCount");
      const declarationCount = numberValue(claim.value, "declarationCount");
      const internalRelationshipCount = numberValue(claim.value, "internalRelationshipCount");
      const incomingRelationshipCount = numberValue(claim.value, "incomingRelationshipCount");
      const outgoingRelationshipCount = numberValue(claim.value, "outgoingRelationshipCount");

      return name &&
        path &&
        sourceFileCount !== null &&
        declarationCount !== null &&
        internalRelationshipCount !== null &&
        incomingRelationshipCount !== null &&
        outgoingRelationshipCount !== null
        ? [
            name,
            path,
            String(sourceFileCount),
            String(declarationCount),
            String(internalRelationshipCount),
            String(incomingRelationshipCount),
            String(outgoingRelationshipCount),
            qualifier(claim)
          ]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Modules", [
    ...tableBlock(
      ["Module", "Path", "Files", "Declarations", "Internal", "Incoming", "Outgoing", "Semantics"],
      rows
    ),
    ...sourceBlocks(claims)
  ]);
}

function moduleRelationshipsSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.architecture.claims, ["MODULE_RELATIONSHIP"]);
  const rows = claims
    .map((claim) => {
      const sourceModuleId = stringValue(claim.value, "sourceModuleId");
      const targetModuleId = stringValue(claim.value, "targetModuleId");
      const relationshipCount = numberValue(claim.value, "relationshipCount");

      return sourceModuleId && targetModuleId && relationshipCount !== null
        ? [sourceModuleId, targetModuleId, String(relationshipCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Module Relationships", [
    ...tableBlock(["Source", "Target", "Relationships", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function entryPointCandidatesSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.entryPoints.claims, ["SOURCE_ENTRY_POINT_CANDIDATE"]);
  const rows = claims
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const connectedSourceFileCount = numberValue(claim.value, "connectedSourceFileCount");
      const outgoingRelationshipCount = numberValue(claim.value, "outgoingRelationshipCount");

      return path && connectedSourceFileCount !== null && outgoingRelationshipCount !== null
        ? [
            path,
            String(connectedSourceFileCount),
            String(outgoingRelationshipCount),
            qualifier(claim)
          ]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Entry Point Candidates", [
    ...tableBlock(["Path", "Connected Files", "Outgoing Relationships", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function configurationInfrastructureSection(
  snapshot: ProjectContextSnapshot
): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.infrastructure.claims, [
    "CONFIGURATION_ARTIFACTS_PRESENT",
    "CONFIGURATION_ARTIFACT",
    "INFRASTRUCTURE_ARTIFACTS_PRESENT",
    "INFRASTRUCTURE_ARTIFACT"
  ]);
  const configurationRows = claims
    .filter((claim) => claim.value.type === "CONFIGURATION_ARTIFACT")
    .map(pathRow)
    .filter(isPresent)
    .sort(compareRows);
  const infrastructureRows = claims
    .filter((claim) => claim.value.type === "INFRASTRUCTURE_ARTIFACT")
    .map(pathRow)
    .filter(isPresent)
    .sort(compareRows);
  const summaryRows = claims
    .filter(
      (claim) =>
        claim.value.type === "CONFIGURATION_ARTIFACTS_PRESENT" ||
        claim.value.type === "INFRASTRUCTURE_ARTIFACTS_PRESENT"
    )
    .map((claim) => {
      const artifactCount = numberValue(claim.value, "artifactCount");
      const label =
        claim.value.type === "CONFIGURATION_ARTIFACTS_PRESENT"
          ? "Configuration artifacts"
          : "Infrastructure artifacts";

      return artifactCount !== null ? [label, String(artifactCount), qualifier(claim)] : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const blocks = [
    ...tableBlock(["Configuration Artifact", "Semantics"], configurationRows),
    ...tableBlock(["Infrastructure Artifact", "Semantics"], infrastructureRows),
    ...tableBlock(["Artifact Type", "Count", "Semantics"], summaryRows),
    ...sourceBlocks(claims)
  ];

  return section("Configuration and Infrastructure", blocks);
}

function testingContextSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.testing.claims, [
    "TESTING_ARTIFACTS_PRESENT",
    "TEST_FILE",
    "TEST_SOURCE_STRUCTURE"
  ]);
  const testFileRows = claims
    .filter((claim) => claim.value.type === "TEST_FILE")
    .map(pathRow)
    .filter(isPresent)
    .sort(compareRows);
  const structuredTestRows = claims
    .filter((claim) => claim.value.type === "TEST_SOURCE_STRUCTURE")
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const declarationCount = numberValue(claim.value, "declarationCount");

      return path && declarationCount !== null
        ? [path, String(declarationCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const summaryRows = claims
    .filter((claim) => claim.value.type === "TESTING_ARTIFACTS_PRESENT")
    .map((claim) => {
      const testFileCount = numberValue(claim.value, "testFileCount");
      const structuredTestFileCount = numberValue(claim.value, "structuredTestFileCount");

      return testFileCount !== null && structuredTestFileCount !== null
        ? [String(testFileCount), String(structuredTestFileCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);
  const blocks = [
    ...tableBlock(["Test File", "Semantics"], testFileRows),
    ...tableBlock(["Structured Test File", "Declarations", "Semantics"], structuredTestRows),
    ...tableBlock(["Test Files", "Structured Test Files", "Semantics"], summaryRows),
    ...sourceBlocks(claims)
  ];

  return section("Testing", blocks);
}

function technicalAmbiguitiesSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = [...snapshot.ambiguities].sort(compareClaims);
  const rows = uniqueRows(
    claims.map((claim) => {
      if (!isRecord(claim.value) || claim.value.type !== "ANALYSIS_ISSUE") {
        return [stableSerialize(claim.value), "", "", "", qualifier(claim)];
      }

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
  ).sort(compareRows);

  return section("Technical Ambiguities", [
    ...tableBlock(["Stage", "Path", "Issue", "Message", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function pathRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const path = stringValue(claim.value, "path");

  return path ? [path, qualifier(claim)] : null;
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

function uniqueRows(rows: readonly (readonly string[] | null | undefined)[]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];

  for (const row of rows) {
    if (!row) {
      continue;
    }

    const key = row.join("\u0000");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push([...row]);
  }

  return unique;
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

function code(value: string): string {
  const delimiter = value.includes("`") ? "``" : "`";

  return `${delimiter}${value}${delimiter}`;
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

function booleanValue(value: Record<string, unknown>, key: string): boolean | null {
  return typeof value[key] === "boolean" ? value[key] : null;
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
