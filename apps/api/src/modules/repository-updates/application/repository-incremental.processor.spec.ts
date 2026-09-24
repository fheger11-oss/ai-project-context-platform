import { createHash } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { Analysis } from "../../analysis/domain/analysis.js";
import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import { AnalysisPipelineService } from "../../analysis/application/analysis-pipeline.service.js";
import { AnalysisResultAggregationService } from "../../analysis/application/analysis-result-aggregation.service.js";
import { AnalysisInputService } from "../../analysis/application/analysis-input.service.js";
import { FileClassificationService } from "../../analysis/application/file-classification.service.js";
import { ProjectDetectionService } from "../../analysis/application/project-detection.service.js";
import { RelationshipAnalysisService } from "../../analysis/application/relationship-analysis.service.js";
import { SourceStructureAnalysisService } from "../../analysis/application/source-structure-analysis.service.js";
import { RunAnalysisService } from "../../analysis/application/run-analysis.service.js";
import { PersistAnalysisResultService } from "../../analysis/application/persist-analysis-result.service.js";
import { TypeScriptSourceParser } from "../../analysis/infrastructure/typescript-source.parser.js";
import type { AnalysisRepository } from "../../analysis/domain/contracts/analysis-repository.contract.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { ScanContentReader } from "../../analysis/domain/contracts/scan-content-reader.contract.js";
import {
  createChangeSet,
  ChangeSetCompleteness,
  ComparisonStatus,
  FileChangeType,
  type ChangedFile
} from "../../change-sets/domain/change-set.js";
import { DeterministicContextGenerator } from "../../context/application/deterministic-context.generator.js";
import type { GenerateAndPersistProjectContextService } from "../../context/application/generate-and-persist-project-context.service.js";
import type { RepositoryStateService } from "../../repositories/repository-state.service.js";
import type { ScanService } from "../../scan/application/scan.service.js";
import type {
  ScanRepository,
  ScanSnapshot
} from "../../scan/domain/contracts/scan-repository.contract.js";
import type { OperationLockService } from "../../usage/operation-lock.service.js";
import type { UsageService } from "../../usage/usage.service.js";
import { RepositoryIncrementalProcessorService } from "./repository-incremental.processor.js";
import { IncrementalFallbackReason as Reason } from "./contracts/repository-incremental-processor.contract.js";

const now = new Date("2026-09-24T00:00:00Z");
const base = {
  "package.json": '{"name":"fixture","dependencies":{"react":"19"}}',
  "src/stable.ts": 'import { x } from "./old"; export const stable = x;',
  "src/old.ts": "export const x = 1;"
};

async function harness(
  type = FileChangeType.MODIFIED,
  path = "src/old.ts",
  additionalSourceFiles = 0,
  includeManifest = true
) {
  const baseSnapshot: Record<string, string> = {
    ...(includeManifest
      ? base
      : Object.fromEntries(Object.entries(base).filter(([p]) => p !== "package.json")))
  };
  for (let index = 0; index < additionalSourceFiles; index += 1) {
    baseSnapshot[`src/unchanged-${index}.ts`] = `export const unchanged${index} = ${index};`;
  }
  const target: Record<string, string> = { ...baseSnapshot };
  const change: ChangedFile = { path, type, additions: 1, deletions: 1 };
  if (type === FileChangeType.MODIFIED) target[change.path] = "export const x = 2;";
  if (type === FileChangeType.ADDED || type === FileChangeType.COPIED) {
    change.path = "src/new.ts";
    target[change.path] = "export const added = 3;";
  }
  if (type === FileChangeType.DELETED) delete target[change.path];
  if (type === FileChangeType.RENAMED) {
    change.previousPath = "src/old.ts";
    change.path = "src/new.ts";
    target[change.path] = target[change.previousPath]!;
    delete target[change.previousPath];
  }
  const snapshots: Record<string, Record<string, string>> = {
    base_scan: baseSnapshot,
    target_scan: target
  };
  const reader: ScanContentReader = {
    async *listFiles(scanId) {
      for (const [path, content] of Object.entries(snapshots[scanId]!).sort(([a], [b]) =>
        a.localeCompare(b)
      )) {
        yield {
          path,
          sha: createHash("sha256").update(content).digest("hex"),
          size: BigInt(content.length),
          extension: path.split(".").at(-1)!,
          isHidden: false,
          isBinary: false
        };
      }
    },
    readFile: vi.fn(async (scanId: string, path: string) => {
      const content = snapshots[scanId]?.[path];
      return content === undefined ? null : { path, content };
    })
  };
  const parser = new TypeScriptSourceParser();
  const parse = vi.spyOn(parser, "parse");
  const structures = new SourceStructureAnalysisService(parser);
  const project = new ProjectDetectionService();
  const pipeline = new AnalysisPipelineService(
    new FileClassificationService(),
    project,
    structures,
    new RelationshipAnalysisService(structures, project),
    new AnalysisResultAggregationService()
  );
  const analysisInput = (scanId: string, commitSha: string) => ({
    scanId,
    repositoryId: "repo",
    commitSha,
    contentReader: reader
  });
  const baseAnalysis = await pipeline.analyze({
    analysis: Analysis.create({
      id: "base_analysis",
      scanId: "base_scan",
      analyzerVersion: ANALYSIS_ENGINE_VERSION
    }),
    input: analysisInput("base_scan", "base"),
    generatedAt: now
  });
  parse.mockClear();
  const scan = (id: string, commitSha: string): ScanSnapshot => ({
    id,
    repositoryId: "repo",
    commitSha,
    status: "COMPLETED",
    totalFiles: Object.keys(snapshots[id]!).length,
    totalSize: 1n,
    filesProcessed: Object.keys(snapshots[id]!).length,
    totalBytesConsidered: 1n,
    scanLimitReason: null,
    startedAt: now,
    completedAt: now,
    durationMs: 1,
    createdAt: now,
    updatedAt: now
  });
  const targetScan = scan("target_scan", "target");
  const getScan = vi.fn(async (id: string) => (id === "base_scan" ? scan(id, "base") : targetScan));
  const scans = { getScan } as unknown as ScanRepository;
  const results = new Map<string, AnalysisResult>([[baseAnalysis.analysisId, baseAnalysis]]);
  const states = new Map<string, Analysis>([
    [
      baseAnalysis.analysisId,
      Analysis.create({
        id: baseAnalysis.analysisId,
        scanId: "base_scan",
        status: "COMPLETED",
        analyzerVersion: ANALYSIS_ENGINE_VERSION
      })
    ]
  ]);
  const analyses = {
    save: vi.fn(async (analysis: Analysis) => {
      states.set(analysis.id, analysis);
      return analysis;
    }),
    saveResult: vi.fn(async (result: AnalysisResult) => {
      results.set(result.analysisId, result);
      states.set(result.analysisId, states.get(result.analysisId)!.transitionTo("COMPLETED"));
      return result;
    }),
    findResultById: vi.fn(async (id: string) => results.get(id) ?? null),
    findById: vi.fn(async (id: string) => states.get(id) ?? null)
  } as unknown as AnalysisRepository;
  const getOrInitialize = vi.fn(async () => ({
    currentProjectContextId: "base_context",
    currentContextCommitSha: "base"
  }));
  const getCurrentProjectContext = vi.fn(async () => ({
    id: "base_context",
    commitSha: "base",
    scanId: "base_scan",
    analysisId: "base_analysis"
  }));
  const repositoryStates = {
    getOrInitialize,
    getCurrentProjectContext
  } as unknown as RepositoryStateService;
  const ownership = { verifyRepositoryOwnership: vi.fn(async () => undefined) };
  const analyzer = new RunAnalysisService(
    scans,
    ownership,
    new AnalysisInputService(
      {
        resolveCompletedScan: async () => ({
          scanId: "target_scan",
          repositoryId: "repo",
          commitSha: "target"
        })
      },
      reader
    ),
    pipeline,
    new PersistAnalysisResultService(analyses),
    analyses,
    { assertMonthlyQuota: vi.fn() } as unknown as UsageService,
    {
      withRenewingLocks: async (_locks: unknown, operation: () => Promise<unknown>) => operation()
    } as unknown as OperationLockService
  );
  const runIncremental = vi.spyOn(analyzer, "runWithSourceStructureReuse");
  const generator = new DeterministicContextGenerator();
  const generate = vi.fn(async ({ analysisId }: { analysisId: string }) => {
    const context = await generator.generate({ analysis: results.get(analysisId)! });
    const snapshot = context.toSnapshot();
    return {
      ...snapshot,
      id: "new_context",
      contextId: snapshot.contextId,
      createdAt: now,
      context
    };
  });
  const startScan = vi.fn(async () => targetScan);
  const service = new RepositoryIncrementalProcessorService(
    repositoryStates,
    scans,
    analyses,
    reader,
    { startScan } as unknown as ScanService,
    analyzer,
    { generate } as unknown as GenerateAndPersistProjectContextService
  );
  const input = {
    repositoryId: "repo",
    userId: "owner",
    baseCommitSha: "base",
    targetCommitSha: "target",
    changeSet: createChangeSet({
      baseCommitSha: "base",
      targetCommitSha: "target",
      comparisonStatus: ComparisonStatus.AHEAD,
      completeness: ChangeSetCompleteness.COMPLETE,
      files: [change]
    })
  };
  return {
    service,
    input,
    parse,
    pipeline,
    analysisInput,
    results,
    baseAnalysis,
    reader,
    target,
    targetScan,
    getOrInitialize,
    getCurrentProjectContext,
    getScan,
    startScan,
    runIncremental,
    generate,
    generator,
    states
  };
}

describe("RepositoryIncrementalProcessorService", () => {
  it.each([
    FileChangeType.ADDED,
    FileChangeType.MODIFIED,
    FileChangeType.DELETED,
    FileChangeType.RENAMED
  ])("reuses unchanged parsing for %s and matches full analysis and context", async (type) => {
    const h = await harness(type);
    const previous = structuredClone(h.baseAnalysis);
    const result = await h.service.process(h.input);
    expect(result.outcome).toBe("COMPLETED");
    if (result.outcome !== "COMPLETED") throw new Error("expected completed result");
    expect(h.parse.mock.calls.map(([input]) => input.path)).toEqual(
      type === FileChangeType.DELETED ? [] : [h.input.changeSet.files[0]!.path]
    );
    expect(h.startScan).toHaveBeenCalledWith({
      repositoryId: "repo",
      userId: "owner",
      reference: "target"
    });
    expect(h.getOrInitialize).toHaveBeenCalledWith("repo", "owner");
    expect(h.baseAnalysis).toEqual(previous);
    const full = await h.pipeline.analyze({
      analysis: Analysis.create({
        id: result.analysis.analysisId,
        scanId: "target_scan",
        analyzerVersion: ANALYSIS_ENGINE_VERSION
      }),
      input: h.analysisInput("target_scan", "target"),
      generatedAt: result.analysis.generatedAt
    });
    expect(result.analysis).toEqual(full);
    expect(result.projectContext.context.toSnapshot()).toEqual({
      ...(await h.generator.generate({ analysis: full })).toSnapshot(),
      generatedAt: result.projectContext.generatedAt
    });
    expect(result.summary).toMatchObject({
      totalTargetFiles: Object.keys(h.target).length,
      reusedFileCount: type === FileChangeType.ADDED ? 2 : 1,
      parsedFileCount: type === FileChangeType.DELETED ? 0 : 1,
      excludedFileCount: 1,
      addedFileCount: type === FileChangeType.ADDED ? 1 : 0,
      modifiedFileCount: type === FileChangeType.MODIFIED ? 1 : 0,
      deletedFileCount: type === FileChangeType.DELETED ? 1 : 0,
      renamedFileCount: type === FileChangeType.RENAMED ? 1 : 0,
      parsingWorkReduced: true,
      fallbackRequired: false,
      fallbackReason: null
    });
  });

  it("falls back for copied files without beginning a scan", async () => {
    const h = await harness(FileChangeType.COPIED);
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.UNSUPPORTED_CHANGE,
      summary: {
        fallbackRequired: true,
        fallbackReason: Reason.UNSUPPORTED_CHANGE
      }
    });
    expect(h.startScan).not.toHaveBeenCalled();
  });

  it("rejects incomplete comparisons before processing", async () => {
    const h = await harness();
    h.input.changeSet.completeness = ChangeSetCompleteness.INCOMPLETE;
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.INCOMPLETE_CHANGE_SET
    });
    expect(h.startScan).not.toHaveBeenCalled();
  });

  it("falls back for missing current context", async () => {
    const h = await harness();
    h.getCurrentProjectContext.mockRejectedValue(new NotFoundException());
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.MISSING_BASE_CONTEXT
    });
    expect(h.startScan).not.toHaveBeenCalled();
  });

  it("falls back for a different current base", async () => {
    const h = await harness();
    h.input.baseCommitSha = "wrong";
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.BASE_COMMIT_MISMATCH
    });
  });

  it("falls back if retained base analysis is unavailable", async () => {
    const h = await harness();
    h.results.clear();
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.MISSING_BASE_ARTIFACTS
    });
  });

  it("fails hard on a wrong target commit", async () => {
    const h = await harness();
    h.targetScan.commitSha = "wrong";
    await expect(h.service.process(h.input)).rejects.toThrow("target commit mismatch");
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("falls back if target content is missing", async () => {
    const h = await harness();
    vi.mocked(h.reader.readFile).mockResolvedValue(null);
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.INSUFFICIENT_REPOSITORY_CONTENT
    });
    expect(h.runIncremental).not.toHaveBeenCalled();
  });

  it("never reuses a file whose unreported contents changed", async () => {
    const h = await harness();
    h.target["src/stable.ts"] = "export const unreported = 1;";
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.INSUFFICIENT_REPOSITORY_CONTENT
    });
    expect(h.runIncremental).not.toHaveBeenCalled();
  });

  it("falls back for invalid generated provenance", async () => {
    const h = await harness();
    const generate = h.generate.getMockImplementation()!;
    h.generate.mockImplementation(async (input) => ({
      ...(await generate(input)),
      scanId: "wrong_scan"
    }));
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.INCREMENTAL_ARTIFACT_INVALID
    });
  });

  it("propagates unexpected provider failures", async () => {
    const h = await harness();
    const error = new Error("provider failed");
    h.startScan.mockRejectedValue(error);
    await expect(h.service.process(h.input)).rejects.toBe(error);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("does not claim parsing for a non-source-only modification", async () => {
    const h = await harness(FileChangeType.MODIFIED, "package.json");
    h.target["package.json"] = '{"name":"fixture-updated","dependencies":{"react":"19"}}';
    const result = await h.service.process(h.input);
    expect(result.outcome).toBe("COMPLETED");
    if (result.outcome !== "COMPLETED") throw new Error("expected completed result");
    expect(result.summary).toMatchObject({
      totalTargetFiles: 3,
      reusedFileCount: 2,
      parsedFileCount: 0,
      excludedFileCount: 1,
      modifiedFileCount: 1,
      parsingWorkReduced: true
    });
    expect(h.parse).not.toHaveBeenCalled();
    const full = await h.pipeline.analyze({
      analysis: Analysis.create({
        id: result.analysis.analysisId,
        scanId: "target_scan",
        analyzerVersion: ANALYSIS_ENGINE_VERSION
      }),
      input: h.analysisInput("target_scan", "target"),
      generatedAt: result.analysis.generatedAt
    });
    expect(result.analysis).toEqual(full);
    expect(result.projectContext.context.toSnapshot()).toEqual({
      ...(await h.generator.generate({ analysis: full })).toSnapshot(),
      generatedAt: result.projectContext.generatedAt
    });
  });

  it("measures reduced parser work from actual reuse for 100 target source files", async () => {
    const h = await harness(FileChangeType.MODIFIED, "src/old.ts", 98, false);
    h.target["src/stable.ts"] = "export const stable = 2;";
    h.input.changeSet.files.push({
      path: "src/stable.ts",
      type: FileChangeType.MODIFIED,
      additions: 1,
      deletions: 1
    });
    const result = await h.service.process(h.input);
    expect(result.outcome).toBe("COMPLETED");
    if (result.outcome !== "COMPLETED") throw new Error("expected completed result");
    expect(result.summary).toMatchObject({
      totalTargetFiles: 100,
      reusedFileCount: 98,
      parsedFileCount: 2,
      excludedFileCount: 0,
      modifiedFileCount: 2,
      parsingWorkReduced: true
    });
    expect(h.parse).toHaveBeenCalledTimes(2);
  });

  it("falls back when the retained analyzer version is incompatible", async () => {
    const h = await harness();
    const baseState = h.states.get(h.baseAnalysis.analysisId)!;
    h.states.set(
      h.baseAnalysis.analysisId,
      Analysis.create({
        id: baseState.id,
        scanId: baseState.scanId,
        status: "COMPLETED",
        analyzerVersion: "incompatible"
      })
    );
    expect(await h.service.process(h.input)).toMatchObject({
      outcome: "FALLBACK_REQUIRED",
      reason: Reason.MISSING_BASE_ARTIFACTS,
      summary: { fallbackRequired: true, fallbackReason: Reason.MISSING_BASE_ARTIFACTS }
    });
    expect(h.startScan).not.toHaveBeenCalled();
  });

  it("propagates unexpected parser exceptions instead of falling back", async () => {
    const h = await harness();
    h.parse.mockImplementation(() => {
      throw new Error("parser failed");
    });
    await expect(h.service.process(h.input)).rejects.toThrow("parser failed");
    expect(h.generate).not.toHaveBeenCalled();
  });
});
