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

const CONFIDENCE_ORDER: Readonly<Record<ContextClaim["confidence"], number>> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

const CLAIM_KIND_ORDER: Readonly<Record<ContextClaim["kind"], number>> = {
  OBSERVED: 0,
  INFERRED: 1
};

const DISPLAY_LABELS: Readonly<Record<string, string>> = {
  BACKEND_APPLICATION: "Backend application",
  CSS: "CSS",
  DEPENDENCY: "Dependency",
  DEV_DEPENDENCY: "Dev dependency",
  FULLSTACK_APPLICATION: "Full-stack application",
  HTML: "HTML",
  JAVASCRIPT: "JavaScript",
  JSON: "JSON",
  NESTJS: "NestJS",
  NODE_JS: "Node.js",
  NPM: "npm",
  OPTIONAL_DEPENDENCY: "Optional dependency",
  PACKAGE_JSON: "package.json",
  PEER_DEPENDENCY: "Peer dependency",
  PNPM: "pnpm",
  REACT: "React",
  TSCONFIG: "tsconfig.json",
  TYPESCRIPT: "TypeScript",
  VITE: "Vite",
  YARN: "Yarn"
};

const MAX_OVERVIEW_AMBIGUITIES = 5;

export class ProjectOverviewDocumentGenerator implements DocumentGenerator {
  constructor(private readonly renderer: DocumentRenderer<DocumentModel>) {}

  async generate(input: DocumentGenerationInput): Promise<GeneratedDocument> {
    if (input.documentType !== "PROJECT_OVERVIEW") {
      throw new InvalidDocumentTypeError(input.documentType);
    }

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
        ...projectSection(snapshot),
        ...technologySection(snapshot),
        ...dependencySection(snapshot),
        ...scriptSection(snapshot),
        ...structureSection(snapshot),
        ...architectureSection(snapshot),
        ...entryPointSection(snapshot),
        ...testingInfrastructureSection(snapshot),
        ...ambiguitySection(snapshot)
      ]
    };
  }
}

function projectSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.project.claims, [
    "PROJECT_PACKAGE",
    "APPLICATION_TYPE",
    "PRIMARY_LANGUAGE"
  ]);
  const rows = claims.map(projectRow).filter(isPresent).sort(compareRows);

  return section("Project", [
    ...tableBlock(["Field", "Value", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function projectRow(
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

      const details = [name, version, code(path), isPrimary ? "primary package" : null]
        .filter(isPresent)
        .join(" — ");

      return ["Package", details, semanticsLabel(claim)];
    }
    case "APPLICATION_TYPE": {
      const applicationType = stringValue(claim.value, "applicationType");

      return applicationType
        ? ["Application type", displayLabel(applicationType), semanticsLabel(claim)]
        : null;
    }
    case "PRIMARY_LANGUAGE": {
      const language = stringValue(claim.value, "language");

      return language ? ["Primary language", displayLabel(language), semanticsLabel(claim)] : null;
    }
    default:
      return null;
  }
}

function technologySection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.technology.claims, [
    "ECOSYSTEM",
    "LANGUAGE",
    "FRAMEWORK",
    "PACKAGE_MANAGER",
    "MANIFEST"
  ]);
  const ecosystems = claims
    .filter((claim) => claim.value.type === "ECOSYSTEM")
    .map((claim) => {
      const ecosystem = stringValue(claim.value, "ecosystem");

      return ecosystem ? displayLabel(ecosystem) : null;
    })
    .filter(isPresent)
    .sort();
  const languages = claims
    .filter((claim) => claim.value.type === "LANGUAGE")
    .map((claim) => {
      const language = stringValue(claim.value, "language");
      const fileCount = numberValue(claim.value, "fileCount");

      return language && fileCount !== null
        ? {
            count: fileCount,
            label: [displayLabel(language), String(fileCount), semanticsLabel(claim)] as const
          }
        : null;
    })
    .filter(isPresent)
    .sort((left, right) => right.count - left.count || compareRows(left.label, right.label))
    .map((item) => item.label);
  const frameworks = claims
    .filter((claim) => claim.value.type === "FRAMEWORK")
    .map((claim) => {
      const framework = stringValue(claim.value, "framework");

      return framework ? displayLabel(framework) : null;
    })
    .filter(isPresent)
    .sort();
  const packageManagers = claims
    .filter((claim) => claim.value.type === "PACKAGE_MANAGER")
    .map((claim) => {
      const packageManager = stringValue(claim.value, "packageManager");

      return packageManager ? displayLabel(packageManager) : null;
    })
    .filter(isPresent)
    .sort();
  const manifests = claims
    .filter((claim) => claim.value.type === "MANIFEST")
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const manifestType = stringValue(claim.value, "manifestType");
      const isPrimary = booleanValue(claim.value, "isPrimary");

      if (!path || !manifestType || isPrimary === null) {
        return null;
      }

      return [path, displayLabel(manifestType), isPrimary ? "yes" : "no", semanticsLabel(claim)];
    })
    .filter(isPresent)
    .sort(compareRows);
  const blocks = [
    ...labeledList("Ecosystems", ecosystems),
    ...tableBlock(["Language", "Files", "Semantics"], languages),
    ...labeledList("Frameworks", frameworks),
    ...labeledList("Package Managers", packageManagers),
    ...tableBlock(["Manifest", "Type", "Primary", "Semantics"], manifests),
    ...sourceBlocks(claims)
  ];

  return section("Technology Stack", blocks);
}

function dependencySection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const dependencyClaims = typedClaims(snapshot.technology.claims, ["DEPENDENCY"]);
  const rows = dependencyClaims
    .map((claim) => {
      const name = stringValue(claim.value, "name");
      const version = nullableStringValue(claim.value, "version");
      const dependencyType = stringValue(claim.value, "dependencyType");
      const manifestPath = stringValue(claim.value, "manifestPath");

      if (!name || !dependencyType || !manifestPath) {
        return null;
      }

      return [name, version ?? "", displayLabel(dependencyType), manifestPath];
    })
    .filter(isPresent)
    .sort(compareRows);

  return section(
    "Dependencies",
    rows.length > 0
      ? [
          {
            kind: "table",
            columns: ["Package", "Version", "Type", "Manifest"],
            rows
          },
          ...sourceBlocks(dependencyClaims)
        ]
      : []
  );
}

function scriptSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const scriptClaims = typedClaims(snapshot.technology.claims, ["PACKAGE_SCRIPT"]);
  const rows = scriptClaims
    .map((claim) => {
      const manifestPath = stringValue(claim.value, "manifestPath");
      const name = stringValue(claim.value, "name");
      const command = stringValue(claim.value, "command");

      if (!manifestPath || !name || !command) {
        return null;
      }

      return [manifestPath, name, code(command)];
    })
    .filter(isPresent)
    .sort(compareRows);

  return section(
    "Available Scripts",
    rows.length > 0
      ? [
          {
            kind: "table",
            columns: ["Package", "Script", "Command"],
            rows
          },
          ...sourceBlocks(scriptClaims)
        ]
      : []
  );
}

function structureSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.structure.claims, ["SOURCE_GROUP"]);
  const rows = claims.map(sourceGroupRow).filter(isPresent).sort(compareRows);

  return section("Project Structure", [
    ...tableBlock(["Path", "Files", "Declarations", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function sourceGroupRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const path = stringValue(claim.value, "path");
  const sourceFileCount = numberValue(claim.value, "sourceFileCount");
  const declarationCount = numberValue(claim.value, "declarationCount");

  if (!path || sourceFileCount === null || declarationCount === null) {
    return null;
  }

  return [path, String(sourceFileCount), String(declarationCount), semanticsLabel(claim)];
}

function architectureSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.architecture.claims, [
    "MODULE_CANDIDATE",
    "MODULE_RELATIONSHIP"
  ]);
  const modules = claims
    .filter((claim) => claim.value.type === "MODULE_CANDIDATE")
    .map(moduleCandidateRow)
    .filter(isPresent)
    .sort(compareRows);
  const relationships = claims
    .filter((claim) => claim.value.type === "MODULE_RELATIONSHIP")
    .map(moduleRelationshipRow)
    .filter(isPresent)
    .sort(compareRows);
  const blocks = [
    ...tableBlock(
      ["Module", "Path", "Files", "Declarations", "Internal", "Incoming", "Outgoing", "Semantics"],
      modules
    ),
    ...tableBlock(["Source", "Target", "Relationships", "Semantics"], relationships),
    ...sourceBlocks(claims)
  ];

  return section("Architecture / Key Structure", blocks);
}

function moduleCandidateRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const name = stringValue(claim.value, "name");
  const path = stringValue(claim.value, "path");
  const sourceFileCount = numberValue(claim.value, "sourceFileCount");
  const declarationCount = numberValue(claim.value, "declarationCount");
  const internalRelationshipCount = numberValue(claim.value, "internalRelationshipCount");
  const incomingRelationshipCount = numberValue(claim.value, "incomingRelationshipCount");
  const outgoingRelationshipCount = numberValue(claim.value, "outgoingRelationshipCount");

  if (
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

  return [
    name,
    path,
    String(sourceFileCount),
    String(declarationCount),
    String(internalRelationshipCount),
    String(incomingRelationshipCount),
    String(outgoingRelationshipCount),
    semanticsLabel(claim)
  ];
}

function moduleRelationshipRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const sourceModuleId = stringValue(claim.value, "sourceModuleId");
  const targetModuleId = stringValue(claim.value, "targetModuleId");
  const relationshipCount = numberValue(claim.value, "relationshipCount");

  if (!sourceModuleId || !targetModuleId || relationshipCount === null) {
    return null;
  }

  return [sourceModuleId, targetModuleId, String(relationshipCount), semanticsLabel(claim)];
}

function entryPointSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.entryPoints.claims, ["SOURCE_ENTRY_POINT_CANDIDATE"]);
  const items = claims.map(sourceEntryPointItem).filter(isPresent).sort();

  return section("Key Entry Points", [...unorderedList(items), ...sourceBlocks(claims)]);
}

function sourceEntryPointItem(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): string | null {
  const path = stringValue(claim.value, "path");
  const connectedSourceFileCount = numberValue(claim.value, "connectedSourceFileCount");
  const outgoingRelationshipCount = numberValue(claim.value, "outgoingRelationshipCount");

  if (!path || connectedSourceFileCount === null || outgoingRelationshipCount === null) {
    return null;
  }

  return withQualifier(
    `${code(path)} — ${countText(connectedSourceFileCount, "connected source file")}, ${countText(
      outgoingRelationshipCount,
      "outgoing relationship"
    )}`,
    claim
  );
}

function testingInfrastructureSection(
  snapshot: ProjectContextSnapshot
): readonly DocumentSection[] {
  const testingClaims = typedClaims(snapshot.testing.claims, [
    "TESTING_ARTIFACTS_PRESENT",
    "TEST_FILE",
    "TEST_SOURCE_STRUCTURE"
  ]);
  const infrastructureClaims = typedClaims(snapshot.infrastructure.claims, [
    "INFRASTRUCTURE_ARTIFACTS_PRESENT",
    "CONFIGURATION_ARTIFACTS_PRESENT",
    "INFRASTRUCTURE_ARTIFACT",
    "CONFIGURATION_ARTIFACT"
  ]);
  const testingItems = testingClaims.map(testingItem).filter(isPresent).sort();
  const configurationItems = infrastructureClaims
    .filter((claim) => claim.value.type === "CONFIGURATION_ARTIFACT")
    .map(pathItem)
    .filter(isPresent)
    .sort();
  const infrastructureItems = infrastructureClaims
    .filter((claim) => claim.value.type === "INFRASTRUCTURE_ARTIFACT")
    .map(pathItem)
    .filter(isPresent)
    .sort();
  const summaryItems = infrastructureClaims
    .filter(
      (claim) =>
        claim.value.type === "CONFIGURATION_ARTIFACTS_PRESENT" ||
        claim.value.type === "INFRASTRUCTURE_ARTIFACTS_PRESENT"
    )
    .map(artifactSummaryItem)
    .filter(isPresent)
    .sort();
  const allClaims = [...testingClaims, ...infrastructureClaims];
  const blocks = [
    ...tableBlock(["Testing Fact", "Semantics"], testingItems),
    ...tableBlock(["Configuration Artifact", "Semantics"], configurationItems),
    ...tableBlock(["Infrastructure Artifact", "Semantics"], infrastructureItems),
    ...tableBlock(["Artifact Type", "Count", "Semantics"], summaryItems),
    ...sourceBlocks(allClaims)
  ];

  return section("Testing and Infrastructure", blocks);
}

function testingItem(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  switch (claim.value.type) {
    case "TEST_FILE": {
      const path = stringValue(claim.value, "path");

      return path ? [path, semanticsLabel(claim)] : null;
    }
    case "TEST_SOURCE_STRUCTURE": {
      const path = stringValue(claim.value, "path");
      const declarationCount = numberValue(claim.value, "declarationCount");

      return path && declarationCount !== null
        ? [`${path} — ${countText(declarationCount, "declaration")}`, semanticsLabel(claim)]
        : null;
    }
    case "TESTING_ARTIFACTS_PRESENT": {
      const testFileCount = numberValue(claim.value, "testFileCount");
      const structuredTestFileCount = numberValue(claim.value, "structuredTestFileCount");

      return testFileCount !== null && structuredTestFileCount !== null
        ? [
            `${countText(testFileCount, "test file")}; ${countText(
              structuredTestFileCount,
              "structured test file"
            )}`,
            semanticsLabel(claim)
          ]
        : null;
    }
    default:
      return null;
  }
}

function pathItem(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const path = stringValue(claim.value, "path");

  return path ? [path, semanticsLabel(claim)] : null;
}

function artifactSummaryItem(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const artifactCount = numberValue(claim.value, "artifactCount");

  if (artifactCount === null) {
    return null;
  }

  const label =
    claim.value.type === "CONFIGURATION_ARTIFACTS_PRESENT"
      ? "configuration artifact"
      : "infrastructure artifact";

  return [label, String(artifactCount), semanticsLabel(claim)];
}

function ambiguitySection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = [...snapshot.ambiguities].sort(compareClaims);
  const items = uniqueBy(claims.map(ambiguityItem).filter(isPresent), (item) => item).sort();
  const visibleItems = items.slice(0, MAX_OVERVIEW_AMBIGUITIES);
  const remainingCount = items.length - visibleItems.length;
  const blocks: DocumentBlock[] = [
    ...unorderedList(visibleItems),
    ...(remainingCount > 0
      ? [
          {
            kind: "paragraph" as const,
            text: `${countText(remainingCount, "additional ambiguity")} present in ProjectContext.`
          }
        ]
      : []),
    ...sourceBlocks(claims)
  ];

  return section("Ambiguities", blocks);
}

function ambiguityItem(claim: ContextClaim): string | null {
  if (!isRecord(claim.value) || claim.value.type !== "ANALYSIS_ISSUE") {
    return withQualifier(stableSerialize(claim.value), claim);
  }

  const stage = stringValue(claim.value, "stage");
  const path = nullableStringValue(claim.value, "path");
  const codeValue = stringValue(claim.value, "code");
  const message = nullableStringValue(claim.value, "message");

  if (!stage || !codeValue) {
    return withQualifier(stableSerialize(claim.value), claim);
  }

  const location = path ? ` at ${code(path)}` : "";
  const details = message ? `: ${message}` : "";

  return withQualifier(
    `${displayLabel(codeValue)} during ${displayLabel(stage)}${location}${details}`,
    claim
  );
}

function section(heading: string, blocks: readonly DocumentBlock[]): readonly DocumentSection[] {
  if (blocks.length === 0) {
    return [];
  }

  return [{ heading, blocks }];
}

function labeledList(label: string, items: readonly string[]): readonly DocumentBlock[] {
  return items.length > 0
    ? [
        { kind: "paragraph", text: label },
        { kind: "unordered-list", items }
      ]
    : [];
}

function unorderedList(items: readonly string[]): readonly DocumentBlock[] {
  return items.length > 0 ? [{ kind: "unordered-list", items }] : [];
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
    .slice(0, 3)
    .join("; ");
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

function withQualifier(text: string, claim: ContextClaim): string {
  const qualifier = semanticQualifier(claim);

  return qualifier ? `${text} (${qualifier})` : text;
}

function semanticQualifier(claim: ContextClaim): string | null {
  if (claim.kind === "OBSERVED" && claim.confidence === "HIGH") {
    return null;
  }

  if (claim.kind === "OBSERVED") {
    return "low confidence";
  }

  if (claim.confidence === "HIGH") {
    return "inferred";
  }

  if (claim.confidence === "MEDIUM") {
    return "likely inferred";
  }

  return "low-confidence inference";
}

function semanticsLabel(claim: ContextClaim): string {
  return semanticQualifier(claim) ?? "Observed";
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

function countText(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function compareRows(left: readonly string[], right: readonly string[]): number {
  return left.join("\u0000").localeCompare(right.join("\u0000"));
}

function code(value: string): string {
  const delimiter = value.includes("`") ? "``" : "`";

  return `${delimiter}${value}${delimiter}`;
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

function uniqueBy<TValue>(values: readonly TValue[], keyOf: (value: TValue) => string): TValue[] {
  const seen = new Set<string>();
  const result: TValue[] = [];

  for (const value of values) {
    const key = keyOf(value);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
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
