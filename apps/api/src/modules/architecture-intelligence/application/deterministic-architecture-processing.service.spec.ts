import { describe, expect, it, vi } from "vitest";

import type { ArchitectureProcessingInputReader } from "../domain/contracts/architecture-processing-input-reader.contract.js";
import type {
  ArchitectureProcessingOutput,
  ArchitectureProcessingOutputWriter
} from "../domain/contracts/architecture-processing-output-writer.contract.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import { InvalidArchitectureProcessingInputError } from "../domain/errors/invalid-architecture-processing-input.error.js";
import {
  canonicalDependency,
  canonicalModule,
  moduleClaim,
  processingInput,
  relationshipClaim
} from "../testing/architecture-intelligence-fixtures.js";
import { DeterministicArchitectureProcessingService } from "./deterministic-architecture-processing.service.js";

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

describe("DeterministicArchitectureProcessingService", () => {
  it("projects, measures, detects, and persists an evidence-backed cycle", async () => {
    const aToB = relationshipClaim("src/a", "src/b");
    const bToA = relationshipClaim("src/b", "src/a");
    const h = harness(
      processingInput(
        [moduleClaim("src/a"), moduleClaim("src/b"), aToB.claim, bToA.claim],
        [aToB.analysisRelationship, bToA.analysisRelationship],
        {
          architectureModel: {
            modules: [canonicalModule("module:a"), canonicalModule("module:b")],
            dependencies: [
              canonicalDependency("dependency:a-b", "module:a", "module:b", ["relationship:a-b"]),
              canonicalDependency("dependency:b-a", "module:b", "module:a", ["relationship:b-a"])
            ]
          }
        }
      )
    );

    await expect(h.service.process(request)).resolves.toBe("COMPLETED");
    const persisted = h.persist.mock.calls[0]?.[0] as ArchitectureProcessingOutput;
    expect(persisted.measurements).toHaveLength(2);
    expect(persisted.findings).toHaveLength(1);
    expect(persisted.findings[0]).toMatchObject({
      repositoryId: "repository-1",
      projectContextId: "context-1",
      processingRequestId: "request-1",
      ruleId: "architecture.circular-dependency",
      ruleVersion: "2.0",
      applicability: "APPLICABLE",
      confidence: "HIGH",
      subject: { kind: "CYCLE", moduleIds: ["module:a", "module:b"] }
    });
    expect(persisted.findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        {
          kind: "CANONICAL_ARCHITECTURE_DEPENDENCIES",
          dependencyIds: ["dependency:a-b", "dependency:b-a"],
          relationshipIds: ["relationship:a-b", "relationship:b-a"]
        }
      ])
    );
  });

  it.each([
    ["processor", { processorVersion: "architecture-processor-1.0" }, {}],
    ["context", {}, { contextVersion: "context-engine@older" }],
    ["analyzer", {}, { analyzerVersion: "analysis-engine-older" }]
  ])(
    "returns INCOMPATIBLE for a mismatched %s version",
    async (_label, requestOverrides, inputOverrides) => {
      const h = harness(processingInput([], [], inputOverrides));

      await expect(h.service.process({ ...request, ...requestOverrides })).resolves.toBe(
        "INCOMPATIBLE"
      );
      expect(h.persist).not.toHaveBeenCalled();
    }
  );

  it("propagates malformed architecture input for worker retry/failure handling", async () => {
    const h = harness(processingInput([moduleClaim("src/a", { sourceFileCount: -1 })], []));

    await expect(h.service.process(request)).rejects.toBeInstanceOf(
      InvalidArchitectureProcessingInputError
    );
    expect(h.persist).not.toHaveBeenCalled();
  });

  it("propagates output infrastructure failures", async () => {
    const h = harness(processingInput([], []), new Error("database unavailable"));

    await expect(h.service.process(request)).rejects.toThrow("database unavailable");
  });

  it("uses only the architecture input reader and never requests raw source", async () => {
    const h = harness(processingInput([], []));

    await h.service.process(request);

    expect(h.read).toHaveBeenCalledWith(request);
    expect(JSON.stringify(h.read.mock.calls)).not.toContain("content");
  });
});

function harness(input: ReturnType<typeof processingInput>, persistenceError?: Error) {
  const read = vi.fn(async () => input);
  const persist = vi.fn(async (_output: ArchitectureProcessingOutput) => {
    if (persistenceError) throw persistenceError;
  });
  const reader = { read } as ArchitectureProcessingInputReader;
  const writer = { persist } as ArchitectureProcessingOutputWriter;
  return {
    service: new DeterministicArchitectureProcessingService(reader, writer),
    read,
    persist
  };
}
