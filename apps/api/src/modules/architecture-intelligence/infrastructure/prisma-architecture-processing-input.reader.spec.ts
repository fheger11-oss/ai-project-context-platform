import { describe, expect, it, vi } from "vitest";

import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import { CONTEXT_ENGINE_VERSION } from "../../context/application/context-engine-version.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import { InvalidArchitectureProcessingInputError } from "../domain/errors/invalid-architecture-processing-input.error.js";
import { PrismaArchitectureProcessingInputReader } from "./prisma-architecture-processing-input.reader.js";

const request: ArchitectureProcessingRequestRecord = {
  id: "request-1",
  repositoryId: "repository-1",
  projectContextId: "context-1",
  processorVersion: "architecture-processor-2.0",
  status: "PROCESSING",
  attemptCount: 1,
  nextAttemptAt: new Date(),
  claimedBy: "worker-1",
  leaseUntil: new Date(),
  startedAt: new Date(),
  completedAt: null,
  lastFailureCategory: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("PrismaArchitectureProcessingInputReader", () => {
  it("loads matching ProjectContext and Analysis provenance without ScanFile access", async () => {
    const { reader, findFirst } = harness(storedContext());

    await expect(reader.read(request)).resolves.toMatchObject({
      repositoryId: "repository-1",
      projectContextId: "context-1",
      analysisId: "analysis-1",
      contextVersion: CONTEXT_ENGINE_VERSION,
      analyzerVersion: ANALYSIS_ENGINE_VERSION,
      architectureModel: { modules: [], dependencies: [] },
      unresolvedSemanticRelationshipCount: 0,
      architectureClaims: [],
      analysisRelationships: []
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "context-1", repositoryId: "repository-1" }
      })
    );
    expect(JSON.stringify(findFirst.mock.calls)).not.toContain("scanFile");
  });

  it("rejects a missing or cross-repository context", async () => {
    const { reader } = harness(null);
    await expect(reader.read(request)).rejects.toBeInstanceOf(
      InvalidArchitectureProcessingInputError
    );
  });

  it.each([
    ["analysis repository", { analysis: { repositoryId: "repository-2" } }],
    ["analysis identity", { analysisId: "analysis-other" }],
    ["context/analysis scan", { analysis: { scanId: "scan-other" } }],
    ["context/analysis commit", { analysis: { commitSha: "different" } }]
  ])("rejects inconsistent %s provenance", async (_label, overrides) => {
    const { reader } = harness(storedContext(overrides));
    await expect(reader.read(request)).rejects.toBeInstanceOf(
      InvalidArchitectureProcessingInputError
    );
  });

  it("rejects missing version provenance", async () => {
    const { reader } = harness(storedContext({ contextVersion: "" }));
    await expect(reader.read(request)).rejects.toThrow(/contextVersion is missing/);
  });

  it("rejects a malformed architecture claims boundary", async () => {
    const { reader } = harness(storedContext({ snapshot: { architecture: { claims: null } } }));
    await expect(reader.read(request)).rejects.toThrow(/claims must be an array/);
  });

  it("derives partial coverage only from unresolved preserved semantic relationships", async () => {
    const value = storedContext();
    const snapshot = value.snapshot as {
      semantic: { relationships: { resolved: boolean }[] };
    };
    snapshot.semantic.relationships = [{ resolved: true }, { resolved: false }];
    const { reader } = harness(value);

    await expect(reader.read(request)).resolves.toMatchObject({
      unresolvedSemanticRelationshipCount: 1
    });
  });

  it("keeps historical contexts readable with an empty canonical graph", async () => {
    const value = storedContext({ contextVersion: "context-engine@7" });
    const snapshot = value.snapshot as {
      architectureModel?: unknown;
      semantic?: unknown;
    };
    delete snapshot.architectureModel;
    delete snapshot.semantic;
    const { reader } = harness(value);

    await expect(reader.read(request)).resolves.toMatchObject({
      architectureModel: { modules: [], dependencies: [] },
      unresolvedSemanticRelationshipCount: 0
    });
  });
});

function storedContext(
  overrides: {
    analysisId?: string;
    contextVersion?: string;
    snapshot?: unknown;
    analysis?: Partial<ReturnType<typeof analysis>>;
  } = {}
) {
  const baseAnalysis = analysis();
  const contextVersion = overrides.contextVersion ?? CONTEXT_ENGINE_VERSION;
  const analysisId = overrides.analysisId ?? "analysis-1";
  return {
    id: "context-1",
    contextId: "context:analysis-1:context-engine@5.7.1",
    analysisId,
    scanId: "scan-1",
    repositoryId: "repository-1",
    commitSha: "abc123",
    contextVersion,
    generatedAt: new Date("2026-10-05T11:00:00.000Z"),
    snapshot: overrides.snapshot ?? {
      contextId: "context:analysis-1:context-engine@5.7.1",
      analysisId,
      scanId: "scan-1",
      repositoryId: "repository-1",
      commitSha: "abc123",
      contextVersion,
      generatedAt: "2026-10-05T11:00:00.000Z",
      architecture: { claims: [] },
      architectureModel: { modules: [], dependencies: [], publicSurfaces: [] },
      semantic: { relationships: [] }
    },
    analysis: { ...baseAnalysis, ...overrides.analysis }
  };
}

function analysis() {
  return {
    id: "analysis-1",
    scanId: "scan-1",
    repositoryId: "repository-1",
    commitSha: "abc123",
    analyzerVersion: ANALYSIS_ENGINE_VERSION,
    status: "COMPLETED",
    relationships: []
  };
}

function harness(value: ReturnType<typeof storedContext> | null) {
  const findFirst = vi.fn(async () => value);
  const reader = new PrismaArchitectureProcessingInputReader({
    projectContext: { findFirst }
  } as unknown as PrismaService);
  return { reader, findFirst };
}
