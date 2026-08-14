import "reflect-metadata";

import { describe, expect, it, vi } from "vitest";

import type { CompletedScanResolver } from "../domain/contracts/completed-scan-resolver.contract.js";
import type { ScanContentReader } from "../domain/contracts/scan-content-reader.contract.js";
import { AnalysisInputService } from "./analysis-input.service.js";
import { ScanNotReadyForAnalysisError } from "./errors/scan-not-ready-for-analysis.error.js";

function createService(completedScanResolver?: Partial<CompletedScanResolver>) {
  const reader = {
    listFiles: vi.fn(),
    readFile: vi.fn()
  } as unknown as ScanContentReader;
  const resolver = {
    resolveCompletedScan: vi.fn().mockResolvedValue({
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123"
    }),
    ...completedScanResolver
  } as CompletedScanResolver;

  return {
    reader,
    resolver,
    service: new AnalysisInputService(resolver, reader)
  };
}

describe("AnalysisInputService", () => {
  it("creates AnalysisInput for a completed scan through the Analysis-side content reader", async () => {
    const { reader, resolver, service } = createService();

    await expect(service.prepareAnalysisInput({ scanId: "scan_1" })).resolves.toEqual({
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      contentReader: reader
    });
    expect(resolver.resolveCompletedScan).toHaveBeenCalledWith("scan_1");
  });

  it("rejects non-completed or missing scans at the application boundary", async () => {
    const { service } = createService({
      resolveCompletedScan: vi.fn().mockResolvedValue(null)
    });

    await expect(service.prepareAnalysisInput({ scanId: "pending_scan" })).rejects.toThrow(
      ScanNotReadyForAnalysisError
    );
  });

  it("does not require credentials, HTTP values, or GitHub values to prepare input", async () => {
    const { service } = createService();
    const input = await service.prepareAnalysisInput({ scanId: "scan_1" });

    expect(input).not.toHaveProperty("authorization");
    expect(input).not.toHaveProperty("credential");
    expect(input).not.toHaveProperty("token");
    expect(input).not.toHaveProperty("request");
    expect(input).not.toHaveProperty("headers");
  });
});
