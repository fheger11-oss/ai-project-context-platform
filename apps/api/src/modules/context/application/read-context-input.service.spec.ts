import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { AnalysisContextReader } from "../domain/contracts/analysis-context-reader.contract.js";
import { ReadContextInputService } from "./read-context-input.service.js";

const analysis: AnalysisResult = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine@4",
  generatedAt: new Date("2026-08-17T10:00:00.000Z"),
  project: {
    ecosystems: [],
    languages: [],
    packageManager: { status: "UNKNOWN", evidence: [] },
    frameworks: [],
    manifests: [],
    packages: [],
    dependencies: [],
    issues: []
  },
  files: [],
  sourceStructures: [],
  relationships: [],
  dependencies: [],
  issues: []
};

function createService(input: { analysis: AnalysisResult } | null = { analysis }) {
  const analysisContextReader = {
    readAnalysisForContext: vi.fn(async () => input)
  } as unknown as AnalysisContextReader;

  return {
    analysisContextReader,
    service: new ReadContextInputService(analysisContextReader)
  };
}

describe("ReadContextInputService", () => {
  it("reads ContextInput through the AnalysisContextReader boundary", async () => {
    const { service, analysisContextReader } = createService();

    await expect(service.read({ userId: "user_1", analysisId: "analysis_1" })).resolves.toEqual({
      analysis
    });
    expect(analysisContextReader.readAnalysisForContext).toHaveBeenCalledWith({
      userId: "user_1",
      analysisId: "analysis_1"
    });
  });

  it("returns the project's not-found behavior when Analysis is unavailable", async () => {
    const { service } = createService(null);

    await expect(service.read({ userId: "user_1", analysisId: "missing" })).rejects.toThrow(
      NotFoundException
    );
  });

  it("does not require scan content, providers, or credentials", async () => {
    const { service } = createService();

    const input = await service.read({ userId: "user_1", analysisId: "analysis_1" });

    expect(input).not.toHaveProperty("scan");
    expect(input).not.toHaveProperty("scanFile");
    expect(input).not.toHaveProperty("contentReader");
    expect(input).not.toHaveProperty("repositoryProvider");
    expect(input).not.toHaveProperty("credential");
    expect(input).not.toHaveProperty("token");
  });
});
