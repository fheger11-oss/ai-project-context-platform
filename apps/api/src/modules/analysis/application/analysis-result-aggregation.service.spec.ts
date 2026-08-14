import { describe, expect, it } from "vitest";

import type { AnalysisResultAggregationInput } from "../domain/results/analysis-result-aggregator.js";
import { AnalysisResultAggregationService } from "./analysis-result-aggregation.service.js";

describe("AnalysisResultAggregationService", () => {
  it("delegates to the domain aggregator without reading scan content", () => {
    const input: AnalysisResultAggregationInput = {
      analysisId: "analysis_1",
      scanId: "scan_1",
      repositoryId: "repository_1",
      commitSha: "abc123",
      analyzerVersion: "analysis-4.7",
      generatedAt: new Date("2026-08-14T12:00:00.000Z"),
      project: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: {
          ecosystems: [],
          languages: [],
          packageManager: {
            status: "UNKNOWN",
            evidence: []
          },
          frameworks: [],
          manifests: [],
          packages: [],
          dependencies: [],
          issues: []
        }
      },
      files: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: []
      },
      sourceStructures: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: []
      },
      relationships: {
        scanId: "scan_1",
        repositoryId: "repository_1",
        commitSha: "abc123",
        result: {
          relationships: [],
          dependencies: [],
          issues: []
        }
      }
    };

    expect(new AnalysisResultAggregationService().aggregate(input)).toMatchObject({
      analysisId: "analysis_1",
      scanId: "scan_1",
      files: [],
      sourceStructures: [],
      relationships: [],
      dependencies: [],
      issues: []
    });
  });
});
