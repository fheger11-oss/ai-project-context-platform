import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisHistoryResponse, AnalysisResultResponse } from "@ai-context/contracts";
import { readFileSync } from "node:fs";

import {
  AnalysisApiRequestError,
  getAnalysisHistory,
  getAnalysisResult,
  startAnalysis
} from "./analysis-api";

const analysisResult: AnalysisResultResponse = {
  analysisId: "analysis_1",
  scanId: "scan_1",
  repositoryId: "repository_1",
  commitSha: "abc123",
  analyzerVersion: "analysis-engine-4.10",
  generatedAt: "2026-08-14T12:00:00.000Z",
  project: {
    ecosystems: ["NODE_JS", "TYPESCRIPT"],
    languages: [{ language: "TYPESCRIPT", fileCount: 2 }],
    packageManager: {
      status: "DETECTED",
      packageManager: "PNPM",
      evidence: ["pnpm-lock.yaml"]
    },
    frameworks: [{ framework: "REACT", evidence: ["package.json"] }],
    manifests: [{ path: "package.json", type: "PACKAGE_JSON", isPrimary: true }],
    packages: [
      {
        path: "package.json",
        isPrimary: true,
        name: "app",
        version: "1.0.0",
        dependencies: []
      }
    ],
    dependencies: [
      {
        manifestPath: "package.json",
        name: "react",
        version: "^19.0.0",
        type: "DEPENDENCY"
      }
    ],
    issues: []
  },
  files: [{ path: "src/main.ts", category: "SOURCE" }],
  sourceStructures: [],
  relationships: [],
  dependencies: [],
  issues: []
};

const analysisHistory: AnalysisHistoryResponse = {
  items: [
    {
      analysisId: "analysis_2",
      scanId: "scan_1",
      analyzerVersion: "analysis-engine-4.13",
      generatedAt: "2026-08-14T12:05:00.000Z",
      commitSha: "abc123"
    },
    {
      analysisId: "analysis_1",
      scanId: "scan_1",
      analyzerVersion: "analysis-engine-4.13",
      generatedAt: "2026-08-14T12:00:00.000Z",
      commitSha: "abc123"
    }
  ]
};

function mockFetch(response: unknown, init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), init));
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("analysis-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts analysis with the authenticated Analysis API endpoint", async () => {
    const fetchMock = mockFetch(analysisResult, { status: 201 });

    const result = await startAnalysis("access_token", "scan_1");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/v1/analyses", {
      method: "POST",
      headers: {
        Authorization: "Bearer access_token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scanId: "scan_1"
      })
    });
    expect(result).toEqual(analysisResult);
  });

  it("retrieves a persisted analysis result", async () => {
    const fetchMock = mockFetch(analysisResult);

    const result = await getAnalysisResult("access_token", "analysis/with space");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/analyses/analysis%2Fwith%20space",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result.analysisId).toBe("analysis_1");
  });

  it("retrieves lightweight analysis history for a scan", async () => {
    const fetchMock = mockFetch(analysisHistory);

    const result = await getAnalysisHistory("access_token", "scan/with space");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/scans/scan%2Fwith%20space/analyses",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer access_token",
          "Content-Type": "application/json"
        }
      }
    );
    expect(result.items[0]?.analysisId).toBe("analysis_2");
  });

  it("propagates safe API errors without exposing tokens", async () => {
    mockFetch({ message: "Scan is not ready for analysis" }, { status: 400 });

    const request = startAnalysis("access_token", "scan_pending");

    await expect(request).rejects.toBeInstanceOf(AnalysisApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 400,
      message: "Scan is not ready for analysis"
    });
  });

  it("does not maintain a duplicated local AnalysisResult contract", () => {
    const source = readFileSync(new URL("./analysis-api.ts", import.meta.url), "utf8");

    expect(source).toContain("@ai-context/contracts");
    expect(source).not.toMatch(/export type AnalysisResult\s*=/);
    expect(source).not.toMatch(/export type ProjectProfile\s*=/);
    expect(source).not.toMatch(/export type SourceFileStructure\s*=/);
    expect(source).not.toMatch(/export type SourceRelationship\s*=/);
    expect(source).not.toMatch(/export type DependencyEdge\s*=/);
    expect(source).not.toMatch(/export type AnalysisHistoryItem\s*=/);
  });
});
