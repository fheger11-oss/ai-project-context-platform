import type {
  ArchitectureComparisonDiagnostic,
  ArchitectureModule,
  ArchitectureRelationship,
  SuppressedArchitectureClaim
} from "@ai-context/contracts";

type ParsedModule = Omit<ArchitectureModule, "confidence"> & {
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sourceFileCount: number;
  declarationCount: number;
  internalRelationshipCount: number;
  incomingRelationshipCount: number;
  outgoingRelationshipCount: number;
};

type ParsedRelationship = Omit<ArchitectureRelationship, "confidence"> & {
  confidence: "HIGH" | "MEDIUM" | "LOW";
  relationshipCount: number;
};

export type NormalizedArchitectureSnapshot = {
  modules: Map<string, ParsedModule>;
  relationships: Map<string, ParsedRelationship>;
  lowConfidenceModuleIds: Set<string>;
  lowConfidenceRelationshipIds: Set<string>;
  suppressedClaims: SuppressedArchitectureClaim[];
};

export type ArchitectureSnapshotParseResult =
  | { valid: true; snapshot: NormalizedArchitectureSnapshot }
  | { valid: false; diagnostics: ArchitectureComparisonDiagnostic[] };

export function parseArchitectureSnapshot(value: unknown): ArchitectureSnapshotParseResult {
  const diagnostics: ArchitectureComparisonDiagnostic[] = [];
  const architecture = record(value)?.architecture;
  const claims = record(architecture)?.claims;

  if (!Array.isArray(claims)) {
    return invalid("INVALID_ARCHITECTURE_SECTION", "Architecture claims must be an array.");
  }

  const modules = new Map<string, ParsedModule>();
  const relationships = new Map<string, ParsedRelationship>();
  const lowConfidenceModuleIds = new Set<string>();
  const lowConfidenceRelationshipIds = new Set<string>();

  claims.forEach((claim, index) => {
    const claimRecord = record(claim);
    const claimValue = record(claimRecord?.value);
    const type = claimValue?.type;

    if (type === "MODULE_CANDIDATE" && claimValue) {
      const parsed = parseModule(claimRecord, claimValue, index, diagnostics);
      if (!parsed) return;
      if (parsed.confidence === "LOW") lowConfidenceModuleIds.add(parsed.module.moduleId);
      addUnique(modules, parsed.module.moduleId, parsed.module, "module", diagnostics);
      return;
    }

    if (type === "MODULE_RELATIONSHIP" && claimValue) {
      const parsed = parseRelationship(claimRecord, claimValue, index, diagnostics);
      if (!parsed) return;
      const identity = relationshipIdentity(parsed.relationship);
      if (parsed.confidence === "LOW") lowConfidenceRelationshipIds.add(identity);
      addUnique(relationships, identity, parsed.relationship, "relationship", diagnostics);
      return;
    }

    diagnostics.push({
      code: "UNSUPPORTED_ARCHITECTURE_CLAIM",
      message: `Architecture claim ${index} has an unsupported structural type.`
    });
  });

  const allModuleIds = new Set(modules.keys());
  for (const relationship of relationships.values()) {
    if (
      !allModuleIds.has(relationship.sourceModuleId) ||
      !allModuleIds.has(relationship.targetModuleId)
    ) {
      diagnostics.push({
        code: "ORPHAN_ARCHITECTURE_RELATIONSHIP",
        message: `Relationship ${relationshipIdentity(relationship)} references a missing module.`
      });
    }
  }

  if (diagnostics.length > 0) return { valid: false, diagnostics };

  for (const [identity, relationship] of relationships) {
    if (
      lowConfidenceModuleIds.has(relationship.sourceModuleId) ||
      lowConfidenceModuleIds.has(relationship.targetModuleId)
    ) {
      lowConfidenceRelationshipIds.add(identity);
    }
  }

  const eligibleModules = new Map(
    [...modules].filter(([, module]) => module.confidence !== "LOW").sort(compareEntries)
  );
  const eligibleRelationships = new Map(
    [...relationships]
      .filter(
        ([identity, relationship]) =>
          relationship.confidence !== "LOW" && !lowConfidenceRelationshipIds.has(identity)
      )
      .sort(compareEntries)
  );
  const suppressedClaims: SuppressedArchitectureClaim[] = [
    ...[...lowConfidenceModuleIds].map((identity) => ({
      identity,
      reason: "LOW_CONFIDENCE" as const
    })),
    ...[...lowConfidenceRelationshipIds].map((identity) => ({
      identity,
      reason: "LOW_CONFIDENCE" as const
    }))
  ].sort((left, right) => left.identity.localeCompare(right.identity));

  return {
    valid: true,
    snapshot: {
      modules: eligibleModules,
      relationships: eligibleRelationships,
      lowConfidenceModuleIds,
      lowConfidenceRelationshipIds,
      suppressedClaims
    }
  };
}

function parseModule(
  claim: Record<string, unknown> | null,
  value: Record<string, unknown>,
  index: number,
  diagnostics: ArchitectureComparisonDiagnostic[]
): { module: ParsedModule; confidence: "HIGH" | "MEDIUM" | "LOW" } | null {
  const confidence = parseClaimEnvelope(claim, index, diagnostics);
  const moduleId = string(value.moduleId);
  const name = string(value.name);
  const path = string(value.path);
  const counts = [
    value.sourceFileCount,
    value.declarationCount,
    value.internalRelationshipCount,
    value.incomingRelationshipCount,
    value.outgoingRelationshipCount
  ];

  if (
    !confidence ||
    !moduleId ||
    !name ||
    !path ||
    !validModulePath(path) ||
    moduleId !== `module:${path}` ||
    !counts.every(nonNegativeInteger)
  ) {
    diagnostics.push({
      code: "INVALID_MODULE_CANDIDATE",
      message: `Architecture claim ${index} is not a valid module candidate.`
    });
    return null;
  }

  return {
    confidence,
    module: {
      moduleId,
      name,
      path,
      confidence,
      sourceFileCount: counts[0] as number,
      declarationCount: counts[1] as number,
      internalRelationshipCount: counts[2] as number,
      incomingRelationshipCount: counts[3] as number,
      outgoingRelationshipCount: counts[4] as number
    }
  };
}

function parseRelationship(
  claim: Record<string, unknown> | null,
  value: Record<string, unknown>,
  index: number,
  diagnostics: ArchitectureComparisonDiagnostic[]
): { relationship: ParsedRelationship; confidence: "HIGH" | "MEDIUM" | "LOW" } | null {
  const confidence = parseClaimEnvelope(claim, index, diagnostics);
  const sourceModuleId = string(value.sourceModuleId);
  const targetModuleId = string(value.targetModuleId);

  if (
    !confidence ||
    !sourceModuleId ||
    !targetModuleId ||
    !positiveInteger(value.relationshipCount)
  ) {
    diagnostics.push({
      code: "INVALID_MODULE_RELATIONSHIP",
      message: `Architecture claim ${index} is not a valid module relationship.`
    });
    return null;
  }

  return {
    confidence,
    relationship: {
      sourceModuleId,
      targetModuleId,
      relationshipCount: value.relationshipCount,
      confidence
    }
  };
}

function parseClaimEnvelope(
  claim: Record<string, unknown> | null,
  index: number,
  diagnostics: ArchitectureComparisonDiagnostic[]
): "HIGH" | "MEDIUM" | "LOW" | null {
  if (
    claim?.kind !== "INFERRED" ||
    (claim.confidence !== "HIGH" && claim.confidence !== "MEDIUM" && claim.confidence !== "LOW") ||
    !Array.isArray(claim.evidence)
  ) {
    diagnostics.push({
      code: "INVALID_ARCHITECTURE_CLAIM_ENVELOPE",
      message: `Architecture claim ${index} has an invalid claim envelope.`
    });
    return null;
  }
  return claim.confidence;
}

function addUnique<T>(
  values: Map<string, T>,
  identity: string,
  value: T,
  label: string,
  diagnostics: ArchitectureComparisonDiagnostic[]
): void {
  const existing = values.get(identity);
  if (!existing) {
    values.set(identity, value);
    return;
  }
  if (JSON.stringify(existing) !== JSON.stringify(value)) {
    diagnostics.push({
      code: "CONFLICTING_ARCHITECTURE_IDENTITY",
      message: `Architecture ${label} ${identity} has conflicting duplicate claims.`
    });
  }
}

function validModulePath(path: string): boolean {
  if (path.startsWith("/") || path.endsWith("/") || path.includes("\\")) return false;
  const segments = path.split("/");
  return (
    segments.length > 0 &&
    segments.every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function relationshipIdentity(value: { sourceModuleId: string; targetModuleId: string }): string {
  return `${value.sourceModuleId}\0${value.targetModuleId}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function positiveInteger(value: unknown): value is number {
  return nonNegativeInteger(value) && value > 0;
}

function invalid(code: string, message: string): ArchitectureSnapshotParseResult {
  return { valid: false, diagnostics: [{ code, message }] };
}

function compareEntries<T>(left: [string, T], right: [string, T]): number {
  return left[0].localeCompare(right[0]);
}

export function architectureRelationshipIdentity(value: {
  sourceModuleId: string;
  targetModuleId: string;
}): string {
  return relationshipIdentity(value);
}
