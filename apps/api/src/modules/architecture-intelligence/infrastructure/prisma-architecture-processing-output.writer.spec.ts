import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../prisma/prisma.service.js";
import type { ArchitectureProcessingOutput } from "../domain/contracts/architecture-processing-output-writer.contract.js";
import { PrismaArchitectureProcessingOutputWriter } from "./prisma-architecture-processing-output.writer.js";

const output: ArchitectureProcessingOutput = {
  measurements: [
    {
      repositoryId: "repository-1",
      projectContextId: "context-1",
      processingRequestId: "request-1",
      moduleId: "module:src/a",
      path: "src/a",
      confidence: "HIGH",
      sourceFileCount: 2,
      declarationCount: 3,
      fanIn: 1,
      fanOut: 1,
      totalDegree: 2,
      relationshipCount: 3
    }
  ],
  findings: [
    {
      repositoryId: "repository-1",
      projectContextId: "context-1",
      processingRequestId: "request-1",
      fingerprint: "fingerprint",
      ruleId: "architecture.circular-dependency",
      ruleVersion: "1.0",
      confidence: "HIGH",
      subject: { kind: "CYCLE", moduleIds: ["module:src/a", "module:src/b"] },
      evidence: [{ kind: "MODULE", moduleId: "module:src/a", confidence: "HIGH" }]
    }
  ]
};

describe("PrismaArchitectureProcessingOutputWriter", () => {
  it("persists measurements and immutable occurrences in one transaction", async () => {
    const h = harness();

    await h.writer.persist(output);

    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.measurementCreateMany).toHaveBeenCalledWith({
      data: [...output.measurements],
      skipDuplicates: true
    });
    expect(h.findingCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ fingerprint: "fingerprint" })],
      skipDuplicates: true
    });
  });

  it("is safe when a retry encounters already persisted output", async () => {
    const h = harness();

    await h.writer.persist(output);
    await h.writer.persist(output);

    expect(h.measurementCreateMany).toHaveBeenCalledTimes(2);
    expect(h.findingCreateMany).toHaveBeenCalledTimes(2);
    expect(h.measurementCreateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
    expect(h.findingCreateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
  });

  it("does not commit findings when measurement persistence fails", async () => {
    const h = harness();
    h.measurementCreateMany.mockRejectedValueOnce(new Error("measurement write failed"));

    await expect(h.writer.persist(output)).rejects.toThrow("measurement write failed");
    expect(h.findingCreateMany).not.toHaveBeenCalled();
  });

  it("rejects the shared output transaction when finding persistence fails", async () => {
    const h = harness();
    h.findingCreateMany.mockRejectedValueOnce(new Error("finding write failed"));

    await expect(h.writer.persist(output)).rejects.toThrow("finding write failed");
    expect(h.measurementCreateMany).toHaveBeenCalledTimes(1);
    expect(h.transaction).toHaveBeenCalledTimes(1);
  });
});

function harness() {
  const measurementCreateMany = vi.fn(async () => ({ count: 1 }));
  const findingCreateMany = vi.fn(async () => ({ count: 1 }));
  const transactionClient = {
    architectureModuleMeasurement: { createMany: measurementCreateMany },
    architectureFindingOccurrence: { createMany: findingCreateMany }
  };
  const transaction = vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
    callback(transactionClient)
  );
  return {
    writer: new PrismaArchitectureProcessingOutputWriter({
      $transaction: transaction
    } as unknown as PrismaService),
    transaction,
    measurementCreateMany,
    findingCreateMany
  };
}
