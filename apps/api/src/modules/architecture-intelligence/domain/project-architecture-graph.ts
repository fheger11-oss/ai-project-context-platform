import type { ArchitectureProcessingInput } from "./contracts/architecture-processing-input-reader.contract.js";
import type {
  ArchitectureGraph,
  ArchitectureGraphEdge,
  ArchitectureGraphNode,
  ArchitectureGraphRelationshipEvidence
} from "./architecture-graph.js";
import type { ArchitectureConfidence } from "./architecture-confidence.js";
import type { ArchitectureSourceLocation } from "./architecture-finding-evidence.js";
import { InvalidArchitectureProcessingInputError } from "./errors/invalid-architecture-processing-input.error.js";

type RelationshipSelector = { sourcePath: string; specifier: string };
type ParsedAnalysisRelationship = ArchitectureGraphRelationshipEvidence & {
  targetKind: "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED";
  resolved: boolean;
  locations: readonly ArchitectureSourceLocation[];
};

export function projectArchitectureGraph(input: ArchitectureProcessingInput): ArchitectureGraph {
  const relationships = parseAnalysisRelationships(input.analysisRelationships);
  const modules = new Map<string, ArchitectureGraphNode>();
  const edges = new Map<string, ArchitectureGraphEdge>();

  input.architectureClaims.forEach((rawClaim, index) => {
    const claim = requiredRecord(rawClaim, `Architecture claim ${index}`);
    const value = requiredRecord(claim.value, `Architecture claim ${index}.value`);
    const confidence = claimConfidence(claim, index);
    const evidence = requiredArray(claim.evidence, `Architecture claim ${index}.evidence`);

    if (value.type === "MODULE_CANDIDATE") {
      const node = parseModule(value, confidence, index);
      addUnique(modules, node.moduleId, node, "module");
      return;
    }
    if (value.type === "MODULE_RELATIONSHIP") {
      const edge = parseModuleRelationship(value, confidence, evidence, relationships, index);
      addUnique(edges, edgeIdentity(edge), edge, "module relationship");
      return;
    }
    throw invalid(`Architecture claim ${index} has unsupported type.`);
  });

  for (const edge of edges.values()) {
    if (!modules.has(edge.sourceModuleId) || !modules.has(edge.targetModuleId)) {
      throw invalid(
        `Module relationship ${edge.sourceModuleId} -> ${edge.targetModuleId} references a missing module.`
      );
    }
  }

  return {
    nodes: [...modules.values()].sort((left, right) => left.moduleId.localeCompare(right.moduleId)),
    edges: [...edges.values()].sort(compareEdges)
  };
}

function parseModule(
  value: Record<string, unknown>,
  confidence: ArchitectureConfidence,
  index: number
): ArchitectureGraphNode {
  const moduleId = requiredString(value.moduleId, `Module claim ${index}.moduleId`);
  const path = requiredString(value.path, `Module claim ${index}.path`);
  if (!validModulePath(path) || moduleId !== `module:${path}`) {
    throw invalid(`Module claim ${index} has inconsistent module identity.`);
  }
  return {
    moduleId,
    path,
    confidence,
    sourceFileCount: nonNegativeInteger(
      value.sourceFileCount,
      `Module claim ${index}.sourceFileCount`
    ),
    declarationCount: nonNegativeInteger(
      value.declarationCount,
      `Module claim ${index}.declarationCount`
    ),
    internalRelationshipCount: nonNegativeInteger(
      value.internalRelationshipCount,
      `Module claim ${index}.internalRelationshipCount`
    ),
    incomingRelationshipCount: nonNegativeInteger(
      value.incomingRelationshipCount,
      `Module claim ${index}.incomingRelationshipCount`
    ),
    outgoingRelationshipCount: nonNegativeInteger(
      value.outgoingRelationshipCount,
      `Module claim ${index}.outgoingRelationshipCount`
    )
  };
}

function parseModuleRelationship(
  value: Record<string, unknown>,
  confidence: ArchitectureConfidence,
  rawEvidence: readonly unknown[],
  analysisRelationships: readonly ParsedAnalysisRelationship[],
  index: number
): ArchitectureGraphEdge {
  const sourceModuleId = requiredString(
    value.sourceModuleId,
    `Relationship claim ${index}.sourceModuleId`
  );
  const targetModuleId = requiredString(
    value.targetModuleId,
    `Relationship claim ${index}.targetModuleId`
  );
  if (sourceModuleId === targetModuleId) {
    throw invalid(`Relationship claim ${index} is a self-module relationship.`);
  }
  const selectors = rawEvidence.flatMap((raw, evidenceIndex) => {
    const evidence = requiredRecord(raw, `Relationship claim ${index}.evidence.${evidenceIndex}`);
    if (evidence.kind !== "RELATIONSHIP") return [];
    const reference = requiredRecord(
      evidence.reference,
      `Relationship claim ${index}.evidence.${evidenceIndex}.reference`
    );
    if (reference.kind !== "RELATIONSHIP") {
      throw invalid(`Relationship claim ${index} has inconsistent evidence kind.`);
    }
    return [
      {
        sourcePath: requiredString(reference.sourcePath, "Relationship evidence sourcePath"),
        specifier: requiredString(reference.specifier, "Relationship evidence specifier")
      }
    ];
  });
  if (selectors.length === 0) {
    throw invalid(`Relationship claim ${index} has no Analysis relationship evidence.`);
  }

  // Selectors prove the persisted claim resolves to this module edge. Once proven, retain every
  // persisted local Analysis relationship for the same directed module pair as explanation.
  for (const selector of selectors) {
    evidenceForSelector(selector, sourceModuleId, targetModuleId, analysisRelationships);
  }
  const evidence = analysisRelationships
    .filter(
      (relationship) =>
        relationship.targetKind === "LOCAL_FILE" &&
        relationship.resolved &&
        moduleIdForSourcePath(relationship.sourcePath) === sourceModuleId &&
        moduleIdForSourcePath(relationship.targetPath) === targetModuleId
    )
    .flatMap((relationship) =>
      relationship.locations.length === 0
        ? [toGraphEvidence(relationship)]
        : relationship.locations.map((location) => toGraphEvidence(relationship, location))
    );
  return {
    sourceModuleId,
    targetModuleId,
    relationshipCount: positiveInteger(
      value.relationshipCount,
      `Relationship claim ${index}.relationshipCount`
    ),
    confidence,
    evidence: uniqueRelationshipEvidence(evidence).sort(compareRelationshipEvidence)
  };
}

function evidenceForSelector(
  selector: RelationshipSelector,
  sourceModuleId: string,
  targetModuleId: string,
  relationships: readonly ParsedAnalysisRelationship[]
): ArchitectureGraphRelationshipEvidence[] {
  const matches = relationships.filter(
    (relationship) =>
      relationship.sourcePath === selector.sourcePath &&
      relationship.specifier === selector.specifier &&
      relationship.targetKind === "LOCAL_FILE" &&
      relationship.resolved &&
      moduleIdForSourcePath(relationship.sourcePath) === sourceModuleId &&
      moduleIdForSourcePath(relationship.targetPath) === targetModuleId
  );
  if (matches.length === 0) {
    throw invalid(
      `Relationship evidence ${selector.sourcePath}:${selector.specifier} does not resolve to its module relationship.`
    );
  }
  return matches.flatMap((relationship) =>
    relationship.locations.length === 0
      ? [toGraphEvidence(relationship)]
      : relationship.locations.map((location) => toGraphEvidence(relationship, location))
  );
}

function parseAnalysisRelationships(values: readonly unknown[]): ParsedAnalysisRelationship[] {
  return values.map((raw, index) => {
    const value = requiredRecord(raw, `Analysis relationship ${index}`);
    const sourcePath = requiredString(
      value.sourcePath,
      `Analysis relationship ${index}.sourcePath`
    );
    const specifier = requiredString(value.specifier, `Analysis relationship ${index}.specifier`);
    const relationshipKind = relationshipKindValue(value.kind, index);
    const targetKind = targetKindValue(value.targetKind, index);
    if (typeof value.resolved !== "boolean") {
      throw invalid(`Analysis relationship ${index}.resolved must be boolean.`);
    }
    const targetPath = nullableString(
      value.targetPath,
      `Analysis relationship ${index}.targetPath`
    );
    if (targetKind === "LOCAL_FILE" && value.resolved && !targetPath) {
      throw invalid(`Resolved local Analysis relationship ${index} requires targetPath.`);
    }
    const rawEvidence = requiredArray(value.evidence, `Analysis relationship ${index}.evidence`);
    const locations = rawEvidence.map((rawItem, evidenceIndex) => {
      const item = requiredRecord(
        rawItem,
        `Analysis relationship ${index}.evidence.${evidenceIndex}`
      );
      if (item.kind !== "IMPORT_DECLARATION" && item.kind !== "EXPORT_DECLARATION") {
        throw invalid(`Analysis relationship ${index} has invalid evidence kind.`);
      }
      requiredStringArray(item.names, `Analysis relationship ${index} evidence names`);
      if (typeof item.typeOnly !== "boolean") {
        throw invalid(`Analysis relationship ${index} evidence typeOnly must be boolean.`);
      }
      return sourceLocation(item.location, `Analysis relationship ${index} evidence location`);
    });
    return {
      sourcePath,
      targetPath: targetPath ?? "",
      relationshipKind,
      specifier,
      targetKind,
      resolved: value.resolved,
      locations
    };
  });
}

function toGraphEvidence(
  relationship: ParsedAnalysisRelationship,
  location?: ArchitectureSourceLocation
): ArchitectureGraphRelationshipEvidence {
  return {
    sourcePath: relationship.sourcePath,
    targetPath: relationship.targetPath,
    relationshipKind: relationship.relationshipKind,
    specifier: relationship.specifier,
    ...(location ? { location } : {})
  };
}

function moduleIdForSourcePath(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  const sourceRootIndex = segments.indexOf("src");
  if (sourceRootIndex >= 0) {
    const moduleSegment = segments[sourceRootIndex + 1];
    return moduleSegment ? `module:${segments.slice(0, sourceRootIndex + 2).join("/")}` : null;
  }
  const firstSegment = segments[0];
  return segments.length > 1 && firstSegment ? `module:${firstSegment}` : null;
}

function addUnique<T>(values: Map<string, T>, identity: string, value: T, label: string) {
  const existing = values.get(identity);
  if (!existing) {
    values.set(identity, value);
    return;
  }
  if (JSON.stringify(existing) !== JSON.stringify(value)) {
    throw invalid(`Conflicting duplicate ${label} ${identity}.`);
  }
}

function claimConfidence(claim: Record<string, unknown>, index: number): ArchitectureConfidence {
  if (claim.kind !== "INFERRED") {
    throw invalid(`Architecture claim ${index} must be inferred.`);
  }
  if (claim.confidence === "HIGH" || claim.confidence === "MEDIUM" || claim.confidence === "LOW") {
    return claim.confidence;
  }
  throw invalid(`Architecture claim ${index} has invalid confidence.`);
}

function relationshipKindValue(value: unknown, index: number): "IMPORTS" | "RE_EXPORTS" {
  if (value === "IMPORTS" || value === "RE_EXPORTS") return value;
  throw invalid(`Analysis relationship ${index} has invalid kind.`);
}

function targetKindValue(value: unknown, index: number): "LOCAL_FILE" | "PACKAGE" | "UNRESOLVED" {
  if (value === "LOCAL_FILE" || value === "PACKAGE" || value === "UNRESOLVED") return value;
  throw invalid(`Analysis relationship ${index} has invalid target kind.`);
}

function sourceLocation(value: unknown, label: string): ArchitectureSourceLocation {
  const location = requiredRecord(value, label);
  const result = {
    start: nonNegativeInteger(location.start, `${label}.start`),
    end: nonNegativeInteger(location.end, `${label}.end`),
    startLine: nonNegativeInteger(location.startLine, `${label}.startLine`),
    startColumn: nonNegativeInteger(location.startColumn, `${label}.startColumn`),
    endLine: nonNegativeInteger(location.endLine, `${label}.endLine`),
    endColumn: nonNegativeInteger(location.endColumn, `${label}.endColumn`)
  };
  if (result.end < result.start) throw invalid(`${label} has invalid offsets.`);
  return result;
}

function requiredRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw invalid(`${label} must be an array.`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw invalid(`${label} must be a string.`);
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requiredString(value, label);
}

function requiredStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw invalid(`${label} must be a string array.`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw invalid(`${label} must be a non-negative integer.`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = nonNegativeInteger(value, label);
  if (parsed === 0) throw invalid(`${label} must be positive.`);
  return parsed;
}

function validModulePath(path: string): boolean {
  if (path.startsWith("/") || path.endsWith("/") || path.includes("\\")) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function edgeIdentity(edge: Pick<ArchitectureGraphEdge, "sourceModuleId" | "targetModuleId">) {
  return `${edge.sourceModuleId}\0${edge.targetModuleId}`;
}

function compareEdges(left: ArchitectureGraphEdge, right: ArchitectureGraphEdge): number {
  return (
    left.sourceModuleId.localeCompare(right.sourceModuleId) ||
    left.targetModuleId.localeCompare(right.targetModuleId)
  );
}

function compareRelationshipEvidence(
  left: ArchitectureGraphRelationshipEvidence,
  right: ArchitectureGraphRelationshipEvidence
) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function uniqueRelationshipEvidence(
  evidence: readonly ArchitectureGraphRelationshipEvidence[]
): ArchitectureGraphRelationshipEvidence[] {
  return [...new Map(evidence.map((item) => [JSON.stringify(item), item])).values()];
}

function invalid(message: string): InvalidArchitectureProcessingInputError {
  return new InvalidArchitectureProcessingInputError(message);
}
