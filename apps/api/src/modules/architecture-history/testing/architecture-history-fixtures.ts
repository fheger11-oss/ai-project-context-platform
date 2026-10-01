import type { ArchitectureHistorySnapshotSource } from "../domain/contracts/architecture-history-reader.contract.js";

export function moduleClaim(path: string, overrides: Record<string, unknown> = {}) {
  return {
    kind: "INFERRED",
    confidence: "MEDIUM",
    evidence: [],
    value: {
      type: "MODULE_CANDIDATE",
      moduleId: `module:${path}`,
      name: path.split("/").at(-1),
      path,
      sourceFileCount: 2,
      declarationCount: 2,
      internalRelationshipCount: 1,
      incomingRelationshipCount: 0,
      outgoingRelationshipCount: 0,
      ...overrides
    }
  };
}

export function relationshipClaim(source: string, target: string, overrides = {}) {
  return {
    kind: "INFERRED",
    confidence: "HIGH",
    evidence: [],
    value: {
      type: "MODULE_RELATIONSHIP",
      sourceModuleId: source,
      targetModuleId: target,
      relationshipCount: 2,
      ...overrides
    }
  };
}

export function snapshot(claims: unknown[]) {
  return { architecture: { claims } };
}

export function historySource(
  overrides: Partial<ArchitectureHistorySnapshotSource> = {}
): ArchitectureHistorySnapshotSource {
  return {
    historyId: "history0001",
    repositoryId: "repository01",
    promotedAt: new Date("2026-09-01T00:00:00.000Z"),
    projectContextId: "context00001",
    analysisId: "analysis00001",
    scanId: "scan0000001",
    commitSha: "a".repeat(40),
    generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    contextVersion: "context-engine@5.7.1",
    analyzerVersion: "analysis-engine-4.10",
    snapshot: snapshot([moduleClaim("src/a")]),
    ...overrides
  };
}
