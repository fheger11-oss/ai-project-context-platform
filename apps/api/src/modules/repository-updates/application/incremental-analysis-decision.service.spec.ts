import { describe, expect, it } from "vitest";

import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import {
  ChangeSetCompleteness,
  ComparisonStatus,
  FileChangeType,
  createChangeSet,
  type ChangedFile
} from "../../change-sets/domain/change-set.js";
import type { ScanSnapshot } from "../../scan/domain/contracts/scan-repository.contract.js";
import {
  IncrementalAnalysisDecisionOutcome as Outcome,
  IncrementalAnalysisDecisionReason as Reason,
  IncrementalAnalysisStage as Stage,
  IncrementalAnalysisStageDisposition as Disposition,
  type IncrementalAnalysisDecisionInput
} from "./contracts/incremental-analysis-decision.contract.js";
import { IncrementalAnalysisDecisionService } from "./incremental-analysis-decision.service.js";

const now = new Date("2026-09-24T00:00:00Z");

function scan(overrides: Partial<ScanSnapshot> = {}): ScanSnapshot {
  return {
    id: "base-scan",
    repositoryId: "repository",
    commitSha: "base",
    status: "COMPLETED",
    totalFiles: 1,
    totalSize: 1n,
    filesProcessed: 1,
    totalBytesConsidered: 1n,
    scanLimitReason: null,
    startedAt: now,
    completedAt: now,
    durationMs: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function analysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: "base-analysis",
    scanId: "base-scan",
    repositoryId: "repository",
    commitSha: "base",
    analyzerVersion: ANALYSIS_ENGINE_VERSION,
    generatedAt: now,
    project: {} as AnalysisResult["project"],
    files: [],
    sourceStructures: [
      {
        path: "src/a.ts",
        language: "TYPESCRIPT",
        imports: [],
        exports: [],
        declarations: [],
        issues: []
      }
    ],
    relationships: [],
    dependencies: [],
    issues: [],
    ...overrides
  };
}

function input(
  files: ChangedFile[] = [
    { path: "src/a.ts", type: FileChangeType.MODIFIED, additions: 1, deletions: 1 }
  ],
  overrides: Partial<IncrementalAnalysisDecisionInput> = {}
): IncrementalAnalysisDecisionInput {
  return {
    repositoryId: "repository",
    baseCommitSha: "base",
    targetCommitSha: "target",
    changeSet: createChangeSet({
      baseCommitSha: "base",
      targetCommitSha: "target",
      comparisonStatus: ComparisonStatus.AHEAD,
      completeness: ChangeSetCompleteness.COMPLETE,
      files
    }),
    baseScan: scan(),
    baseAnalysis: analysis(),
    baseAnalysisStatus: "COMPLETED",
    baseAnalysisScanId: "base-scan",
    baseAnalysisAnalyzerVersion: ANALYSIS_ENGINE_VERSION,
    baseAnalyzablePaths: new Set(["src/a.ts"]),
    ...overrides
  };
}

describe("IncrementalAnalysisDecisionService", () => {
  const service = new IncrementalAnalysisDecisionService();

  it("classifies only file-local source structures as reusable", () => {
    expect(service.evaluate(input())).toEqual({
      outcome: Outcome.PROCEED,
      reason: Reason.SAFE_FILE_LOCAL_REUSE,
      stages: [
        { stage: Stage.FILE_CLASSIFICATION, disposition: Disposition.RECOMPUTE },
        { stage: Stage.PROJECT_DETECTION, disposition: Disposition.RECOMPUTE },
        { stage: Stage.SOURCE_STRUCTURE, disposition: Disposition.REUSABLE },
        { stage: Stage.RELATIONSHIP_ANALYSIS, disposition: Disposition.RECOMPUTE },
        { stage: Stage.RESULT_AGGREGATION, disposition: Disposition.RECOMPUTE }
      ]
    });
  });

  it.each([
    {
      label: "ADDED",
      files: [{ path: "src/new.ts", type: FileChangeType.ADDED, additions: 1, deletions: 0 }]
    },
    {
      label: "MODIFIED",
      files: [{ path: "src/a.ts", type: FileChangeType.MODIFIED, additions: 1, deletions: 1 }]
    },
    {
      label: "DELETED",
      files: [{ path: "src/a.ts", type: FileChangeType.DELETED, additions: 0, deletions: 1 }]
    },
    {
      label: "RENAMED",
      files: [
        {
          path: "src/b.ts",
          previousPath: "src/a.ts",
          type: FileChangeType.RENAMED,
          additions: 0,
          deletions: 0
        }
      ]
    }
  ] satisfies Array<{ label: string; files: ChangedFile[] }>)(
    "allows explicit supported $label changes",
    ({ files }) => {
      expect(service.evaluate(input(files)).outcome).toBe(Outcome.PROCEED);
    }
  );

  it("requires fallback for copied files", () => {
    expect(
      service.evaluate(
        input([{ path: "src/b.ts", type: FileChangeType.COPIED, additions: 1, deletions: 0 }])
      )
    ).toMatchObject({ outcome: Outcome.FALLBACK_REQUIRED, reason: Reason.UNSUPPORTED_CHANGE });
  });

  it("requires fallback for incomplete comparisons and conflicting paths", () => {
    const incomplete = input();
    incomplete.changeSet.completeness = ChangeSetCompleteness.INCOMPLETE;
    expect(service.evaluate(incomplete)).toMatchObject({
      outcome: Outcome.FALLBACK_REQUIRED,
      reason: Reason.INCOMPLETE_CHANGE_SET
    });
    expect(
      service.evaluate(
        input([
          { path: "src/a.ts", type: FileChangeType.MODIFIED, additions: 1, deletions: 1 },
          { path: "src/a.ts", type: FileChangeType.DELETED, additions: 0, deletions: 1 }
        ])
      )
    ).toMatchObject({
      outcome: Outcome.FALLBACK_REQUIRED,
      reason: Reason.CONFLICTING_PATH_OPERATION
    });
  });

  it.each([
    ["missing artifact", input([], { baseAnalysis: null }), Reason.MISSING_BASE_ARTIFACT],
    [
      "incomplete artifact",
      input([], { baseAnalysisStatus: "FAILED" }),
      Reason.INCOMPLETE_BASE_ARTIFACT
    ],
    [
      "wrong repository",
      input([], { baseAnalysis: analysis({ repositoryId: "wrong" }) }),
      Reason.INVALID_ARTIFACT_PROVENANCE
    ],
    ["wrong base", input([], { baseCommitSha: "wrong" }), Reason.BASE_COMMIT_MISMATCH],
    ["wrong target", input([], { targetCommitSha: "wrong" }), Reason.TARGET_COMMIT_MISMATCH],
    [
      "analyzer mismatch",
      input([], { baseAnalysisAnalyzerVersion: "old" }),
      Reason.ANALYZER_VERSION_MISMATCH
    ],
    [
      "missing source structure",
      input([], { baseAnalysis: analysis({ sourceStructures: [] }) }),
      Reason.SOURCE_STRUCTURE_MISMATCH
    ],
    [
      "duplicate source structure",
      input([], {
        baseAnalysis: analysis({
          sourceStructures: [...analysis().sourceStructures, ...analysis().sourceStructures]
        })
      }),
      Reason.SOURCE_STRUCTURE_MISMATCH
    ],
    [
      "incomplete source coverage",
      input([], { baseAnalyzablePaths: new Set(["src/a.ts", "src/missing.ts"]) }),
      Reason.SOURCE_STRUCTURE_MISMATCH
    ]
  ])("requires fallback for %s", (_label, decisionInput, reason) => {
    expect(service.evaluate(decisionInput as IncrementalAnalysisDecisionInput)).toMatchObject({
      outcome: Outcome.FALLBACK_REQUIRED,
      reason
    });
  });
});
