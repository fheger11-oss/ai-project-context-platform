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
  NEXT_JS: "Next.js",
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

const MAX_README_DEPENDENCIES = 12;
const MAX_README_AMBIGUITIES = 5;

export class ReadmeDocumentGenerator implements DocumentGenerator {
  constructor(private readonly renderer: DocumentRenderer<DocumentModel>) {}

  async generate(input: DocumentGenerationInput): Promise<GeneratedDocument> {
    if (input.documentType !== "README") {
      throw new InvalidDocumentTypeError(input.documentType);
    }

    assertSupportedDocumentFormat(input.format);

    const snapshot = input.projectContext.toSnapshot();
    const model = composeReadme(snapshot);
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

function composeReadme(snapshot: ProjectContextSnapshot): DocumentModel {
  return {
    title: readmeTitle(snapshot),
    sections: [
      ...overviewSection(snapshot),
      ...techStackSection(snapshot),
      ...projectStructureSection(snapshot),
      ...architectureSection(snapshot),
      ...entryPointsSection(snapshot),
      ...scriptsSection(snapshot),
      ...dependenciesSection(snapshot),
      ...configurationSection(snapshot),
      ...testingSection(snapshot),
      ...knownLimitationsSection(snapshot),
      ...projectInformationSection(snapshot)
    ]
  };
}

function readmeTitle(snapshot: ProjectContextSnapshot): string {
  const primaryPackage = typedClaims(snapshot.project.claims, ["PROJECT_PACKAGE"]).find(
    (claim) => booleanValue(claim.value, "isPrimary") === true
  );
  const name = primaryPackage ? nullableStringValue(primaryPackage.value, "name") : null;

  return name ?? "README";
}

function overviewSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const projectClaims = typedClaims(snapshot.project.claims, [
    "PROJECT_PACKAGE",
    "APPLICATION_TYPE",
    "PRIMARY_LANGUAGE"
  ]);
  const technologyClaims = typedClaims(snapshot.technology.claims, ["PACKAGE_MANAGER", "MANIFEST"]);
  const rows = [
    ...projectClaims.map(overviewRow),
    ...technologyClaims
      .filter((claim) => claim.value.type === "PACKAGE_MANAGER")
      .map(packageManagerRow),
    ...technologyClaims
      .filter(
        (claim) =>
          claim.value.type === "MANIFEST" && booleanValue(claim.value, "isPrimary") === true
      )
      .map(primaryManifestRow)
  ]
    .filter(isPresent)
    .sort(compareRows);

  return section("Overview", [
    ...tableBlock(["Fact", "Value"], rows),
    ...sourceBlocks([...projectClaims, ...technologyClaims])
  ]);
}

function overviewRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  switch (claim.value.type) {
    case "PROJECT_PACKAGE": {
      const name = nullableStringValue(claim.value, "name");
      const version = nullableStringValue(claim.value, "version");
      const path = stringValue(claim.value, "path");
      const isPrimary = booleanValue(claim.value, "isPrimary");

      if (!path || isPrimary === null) {
        return null;
      }

      return [
        isPrimary ? "Primary package" : "Package",
        withSemantics([name, version, code(path)].filter(isPresent).join(" - "), claim)
      ];
    }
    case "APPLICATION_TYPE": {
      const applicationType = stringValue(claim.value, "applicationType");

      return applicationType
        ? ["Application type", withSemantics(displayLabel(applicationType), claim)]
        : null;
    }
    case "PRIMARY_LANGUAGE": {
      const language = stringValue(claim.value, "language");

      return language ? ["Primary language", withSemantics(displayLabel(language), claim)] : null;
    }
    default:
      return null;
  }
}

function packageManagerRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const packageManager = stringValue(claim.value, "packageManager");

  return packageManager
    ? ["Package manager", withSemantics(displayLabel(packageManager), claim)]
    : null;
}

function primaryManifestRow(
  claim: ContextClaim<Record<string, unknown> & { type: string }>
): readonly string[] | null {
  const path = stringValue(claim.value, "path");
  const manifestType = stringValue(claim.value, "manifestType");

  return path && manifestType
    ? ["Primary manifest", withSemantics(`${code(path)} (${displayLabel(manifestType)})`, claim)]
    : null;
}

function techStackSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.technology.claims, [
    "ECOSYSTEM",
    "LANGUAGE",
    "FRAMEWORK",
    "MANIFEST"
  ]);
  const ecosystems = claims
    .filter((claim) => claim.value.type === "ECOSYSTEM")
    .map((claim) => stringValue(claim.value, "ecosystem"))
    .filter(isPresent)
    .map(displayLabel)
    .sort();
  const frameworks = claims
    .filter((claim) => claim.value.type === "FRAMEWORK")
    .map((claim) => stringValue(claim.value, "framework"))
    .filter(isPresent)
    .map(displayLabel)
    .sort();
  const languageRows = claims
    .filter((claim) => claim.value.type === "LANGUAGE")
    .map((claim) => {
      const language = stringValue(claim.value, "language");
      const fileCount = numberValue(claim.value, "fileCount");

      return language && fileCount !== null
        ? [displayLabel(language), String(fileCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || compareRows(left, right));
  const manifestItems = claims
    .filter((claim) => claim.value.type === "MANIFEST")
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const manifestType = stringValue(claim.value, "manifestType");
      const isPrimary = booleanValue(claim.value, "isPrimary");

      if (!path || !manifestType || isPrimary === null) {
        return null;
      }

      return `${code(path)} - ${displayLabel(manifestType)}${isPrimary ? " (primary)" : ""}`;
    })
    .filter(isPresent)
    .sort();
  const blocks = [
    ...labeledList("Ecosystems", ecosystems),
    ...labeledList("Frameworks", frameworks),
    ...tableBlock(["Language", "Files", "Semantics"], languageRows),
    ...labeledList("Manifests", manifestItems),
    ...sourceBlocks(claims)
  ];

  return section("Tech Stack", blocks);
}

function projectStructureSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.structure.claims, ["SOURCE_GROUP"]);
  const rows = claims
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const sourceFileCount = numberValue(claim.value, "sourceFileCount");
      const declarationCount = numberValue(claim.value, "declarationCount");

      return path && sourceFileCount !== null && declarationCount !== null
        ? [code(path), String(sourceFileCount), String(declarationCount), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Project Structure", [
    ...tableBlock(["Path", "Files", "Declarations", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function architectureSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const moduleClaims = typedClaims(snapshot.architecture.claims, ["MODULE_CANDIDATE"]);
  const relationshipClaims = typedClaims(snapshot.architecture.claims, ["MODULE_RELATIONSHIP"]);
  const moduleItems = moduleClaims
    .map((claim) => {
      const name = stringValue(claim.value, "name");
      const path = stringValue(claim.value, "path");

      return name && path ? `${name} - ${code(path)} (${qualifier(claim).toLowerCase()})` : null;
    })
    .filter(isPresent)
    .sort();
  const rows = [
    moduleClaims.length > 0 ? ["Module candidates", String(moduleClaims.length)] : null,
    relationshipClaims.length > 0
      ? ["Module relationships", String(relationshipClaims.length)]
      : null
  ].filter(isPresent);
  const blocks = [
    ...tableBlock(["Architecture Fact", "Count"], rows),
    ...labeledList("Module Candidates", moduleItems),
    ...sourceBlocks([...moduleClaims, ...relationshipClaims])
  ];

  return section("Architecture", blocks);
}

function entryPointsSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.entryPoints.claims, ["SOURCE_ENTRY_POINT_CANDIDATE"]);
  const rows = claims
    .map((claim) => {
      const path = stringValue(claim.value, "path");
      const connectedSourceFileCount = numberValue(claim.value, "connectedSourceFileCount");
      const outgoingRelationshipCount = numberValue(claim.value, "outgoingRelationshipCount");

      return path && connectedSourceFileCount !== null && outgoingRelationshipCount !== null
        ? [
            code(path),
            String(connectedSourceFileCount),
            String(outgoingRelationshipCount),
            qualifier(claim)
          ]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Key Entry Points", [
    ...tableBlock(["Candidate", "Connected Files", "Outgoing Relationships", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function scriptsSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.technology.claims, ["PACKAGE_SCRIPT"]);
  const rows = claims
    .map((claim) => {
      const manifestPath = stringValue(claim.value, "manifestPath");
      const name = stringValue(claim.value, "name");
      const command = stringValue(claim.value, "command");

      return manifestPath && name && command
        ? [code(name), code(command), code(manifestPath), qualifier(claim)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows);

  return section("Available Scripts", [
    ...tableBlock(["Script", "Command", "Manifest", "Semantics"], rows),
    ...sourceBlocks(claims)
  ]);
}

function dependenciesSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.technology.claims, ["DEPENDENCY"]);
  const rows = claims
    .map((claim) => {
      const name = stringValue(claim.value, "name");
      const version = nullableStringValue(claim.value, "version");
      const dependencyType = stringValue(claim.value, "dependencyType");
      const manifestPath = stringValue(claim.value, "manifestPath");

      return name && dependencyType && manifestPath
        ? [name, version ?? "", displayLabel(dependencyType), code(manifestPath)]
        : null;
    })
    .filter(isPresent)
    .sort(compareRows)
    .slice(0, MAX_README_DEPENDENCIES);
  const blocks = [
    ...tableBlock(["Package", "Version", "Type", "Manifest"], rows),
    ...dependencyLimitNote(claims.length, rows.length),
    ...sourceBlocks(claims)
  ];

  return section("Dependencies", blocks);
}

function dependencyLimitNote(totalCount: number, renderedCount: number): readonly DocumentBlock[] {
  return totalCount > renderedCount
    ? [
        {
          kind: "paragraph",
          text: `Showing ${renderedCount} of ${totalCount} dependencies in deterministic order.`
        }
      ]
    : [];
}

function configurationSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.infrastructure.claims, [
    "CONFIGURATION_ARTIFACT",
    "INFRASTRUCTURE_ARTIFACT"
  ]);
  const configurationItems = claims
    .filter((claim) => claim.value.type === "CONFIGURATION_ARTIFACT")
    .map(pathItem)
    .filter(isPresent)
    .sort();
  const infrastructureItems = claims
    .filter((claim) => claim.value.type === "INFRASTRUCTURE_ARTIFACT")
    .map(pathItem)
    .filter(isPresent)
    .sort();
  const blocks = [
    ...labeledList("Configuration Artifacts", configurationItems),
    ...labeledList("Infrastructure Artifacts", infrastructureItems),
    ...sourceBlocks(claims)
  ];

  return section("Configuration", blocks);
}

function testingSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.testing.claims, [
    "TESTING_ARTIFACTS_PRESENT",
    "TEST_FILE",
    "TEST_SOURCE_STRUCTURE"
  ]);
  const testFileItems = claims
    .filter((claim) => claim.value.type === "TEST_FILE")
    .map(pathItem)
    .filter(isPresent)
    .sort();
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
    ...tableBlock(["Test Files", "Structured Test Files", "Semantics"], summaryRows),
    ...labeledList("Test Files", testFileItems),
    ...sourceBlocks(claims)
  ];

  return section("Testing", blocks);
}

function knownLimitationsSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const claims = typedClaims(snapshot.ambiguities, ["ANALYSIS_ISSUE"]);
  const rows = uniqueRows(
    claims.map((claim) => {
      const stage = stringValue(claim.value, "stage");
      const path = nullableStringValue(claim.value, "path");
      const issueCode = stringValue(claim.value, "code");
      const message = nullableStringValue(claim.value, "message");

      return stage && issueCode
        ? [
            displayLabel(stage),
            path ? code(path) : "",
            displayLabel(issueCode),
            message ?? "",
            qualifier(claim)
          ]
        : null;
    })
  )
    .sort(compareRows)
    .slice(0, MAX_README_AMBIGUITIES);
  const blocks = [
    ...tableBlock(["Stage", "Path", "Issue", "Message", "Semantics"], rows),
    ...ambiguityLimitNote(claims.length, rows.length),
    ...sourceBlocks(claims)
  ];

  return section("Known Limitations / Ambiguities", blocks);
}

function ambiguityLimitNote(totalCount: number, renderedCount: number): readonly DocumentBlock[] {
  return totalCount > renderedCount
    ? [
        {
          kind: "paragraph",
          text: `Showing ${renderedCount} of ${totalCount} ambiguity records in deterministic order.`
        }
      ]
    : [];
}

function projectInformationSection(snapshot: ProjectContextSnapshot): readonly DocumentSection[] {
  const rows = [
    ["Context ID", snapshot.contextId],
    ["Analysis ID", snapshot.analysisId],
    ["Source snapshot ID", snapshot.scanId],
    ["Repository ID", snapshot.repositoryId],
    ["Commit", snapshot.commitSha],
    ["Context version", snapshot.contextVersion],
    ["Generated at", snapshot.generatedAt.toISOString()]
  ] satisfies [string, string][];
  const presentRows = rows.filter(([, value]) => value.length > 0);

  return section("Project Information", tableBlock(["Field", "Value"], presentRows));
}

function pathItem(claim: ContextClaim<Record<string, unknown> & { type: string }>): string | null {
  const path = stringValue(claim.value, "path");

  return path ? code(path) : null;
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

function labeledList(label: string, items: readonly string[]): readonly DocumentBlock[] {
  return items.length > 0
    ? [
        { kind: "paragraph", text: label },
        { kind: "unordered-list", items }
      ]
    : [];
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

function withSemantics(value: string, claim: ContextClaim): string {
  const semantics = qualifier(claim);

  return semantics === "Observed" ? value : `${value} (${semantics.toLowerCase()})`;
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

function booleanValue(value: Record<string, unknown>, key: string): boolean | null {
  return typeof value[key] === "boolean" ? value[key] : null;
}

function code(value: string): string {
  return `\`${value}\``;
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
