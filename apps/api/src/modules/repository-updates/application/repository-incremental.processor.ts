import { BadGatewayException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import { RunAnalysisService } from "../../analysis/application/run-analysis.service.js";
import { SourceStructureProcessingDisposition } from "../../analysis/application/source-structure-analysis.service.js";
import {
  ANALYSIS_REPOSITORY,
  type AnalysisRepository
} from "../../analysis/domain/contracts/analysis-repository.contract.js";
import {
  SCAN_CONTENT_READER,
  type ScanContentReader,
  type ScanContentFile
} from "../../analysis/domain/contracts/scan-content-reader.contract.js";
import { RuleBasedFileClassifier } from "../../analysis/domain/classification/rule-based-file-classifier.js";
import { shouldAnalyzeSourceStructure } from "../../analysis/domain/source-structure/source-file-selector.js";
import type { SourceFileStructure } from "../../analysis/domain/source-structure/source-file-structure.js";
import {
  ChangeSetCompleteness,
  ComparisonStatus,
  FileChangeType
} from "../../change-sets/domain/change-set.js";
import { GenerateAndPersistProjectContextService } from "../../context/application/generate-and-persist-project-context.service.js";
import { RepositoryStateService } from "../../repositories/repository-state.service.js";
import { ScanService } from "../../scan/application/scan.service.js";
import {
  SCAN_REPOSITORY,
  type ScanRepository
} from "../../scan/domain/contracts/scan-repository.contract.js";
import {
  IncrementalAnalysisDecisionOutcome,
  IncrementalAnalysisDecisionReason
} from "./contracts/incremental-analysis-decision.contract.js";
import {
  IncrementalFallbackReason as Reason,
  type IncrementalProcessingInput,
  type IncrementalProcessingResult,
  type IncrementalProcessingSummary,
  type RepositoryIncrementalProcessor
} from "./contracts/repository-incremental-processor.contract.js";
import { IncrementalAnalysisDecisionService } from "./incremental-analysis-decision.service.js";

@Injectable()
export class RepositoryIncrementalProcessorService implements RepositoryIncrementalProcessor {
  constructor(
    @Inject(RepositoryStateService) private readonly states: RepositoryStateService,
    @Inject(SCAN_REPOSITORY) private readonly scans: ScanRepository,
    @Inject(ANALYSIS_REPOSITORY) private readonly analyses: AnalysisRepository,
    @Inject(SCAN_CONTENT_READER) private readonly content: ScanContentReader,
    @Inject(ScanService) private readonly scanner: ScanService,
    @Inject(RunAnalysisService) private readonly analyzer: RunAnalysisService,
    @Inject(GenerateAndPersistProjectContextService)
    private readonly contexts: GenerateAndPersistProjectContextService,
    @Inject(IncrementalAnalysisDecisionService)
    private readonly incrementalAnalysisDecision: IncrementalAnalysisDecisionService
  ) {}

  async process(input: IncrementalProcessingInput): Promise<IncrementalProcessingResult> {
    const summary = this.createSummary(input);
    // This ownership check precedes reading any base artifact, including fallback cases.
    const state = await this.states.getOrInitialize(input.repositoryId, input.userId);
    if (input.changeSet.targetCommitSha !== input.targetCommitSha) {
      throw new BadGatewayException("Incremental ChangeSet target commit mismatch.");
    }
    if (input.changeSet.completeness !== ChangeSetCompleteness.COMPLETE) {
      return this.fallback(Reason.INCOMPLETE_CHANGE_SET, summary);
    }
    if (!state.currentProjectContextId || !state.currentContextCommitSha) {
      return this.fallback(Reason.MISSING_BASE_CONTEXT, summary);
    }
    if (
      state.currentContextCommitSha !== input.baseCommitSha ||
      input.changeSet.baseCommitSha !== input.baseCommitSha
    ) {
      return this.fallback(Reason.BASE_COMMIT_MISMATCH, summary);
    }
    // Diverged/behind comparisons may describe a merge-base diff rather than the base tree.
    if (
      input.changeSet.comparisonStatus !== ComparisonStatus.AHEAD ||
      input.changeSet.files.some((file) => file.type === FileChangeType.COPIED)
    ) {
      return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
    }
    let baseContext;
    try {
      baseContext = await this.states.getCurrentProjectContext(input.repositoryId, input.userId);
    } catch (error) {
      if (error instanceof NotFoundException)
        return this.fallback(Reason.MISSING_BASE_CONTEXT, summary);
      throw error;
    }
    if (
      baseContext.commitSha !== input.baseCommitSha ||
      baseContext.id !== state.currentProjectContextId
    ) {
      return this.fallback(Reason.BASE_COMMIT_MISMATCH, summary);
    }
    const baseScan = await this.scans.getScan(baseContext.scanId);
    const baseAnalysis = await this.analyses.findResultById(baseContext.analysisId);
    const baseAnalysisState = await this.analyses.findById(baseContext.analysisId);
    if (
      !baseScan ||
      !baseAnalysis ||
      baseAnalysisState?.status !== "COMPLETED" ||
      baseScan.status !== "COMPLETED" ||
      baseScan.repositoryId !== input.repositoryId ||
      baseScan.commitSha !== input.baseCommitSha ||
      baseAnalysisState.scanId !== baseScan.id ||
      baseAnalysisState.analyzerVersion !== ANALYSIS_ENGINE_VERSION ||
      baseAnalysis.scanId !== baseScan.id ||
      baseAnalysis.repositoryId !== input.repositoryId ||
      baseAnalysis.commitSha !== input.baseCommitSha ||
      baseAnalysis.analyzerVersion !== ANALYSIS_ENGINE_VERSION
    ) {
      return this.fallback(Reason.MISSING_BASE_ARTIFACTS, summary);
    }
    // Materialize base evidence before target scan retention can prune ordinary artifacts.
    const baseFiles = await this.files(baseScan.id);
    if (baseFiles.size !== baseScan.totalFiles)
      return this.fallback(Reason.INSUFFICIENT_REPOSITORY_CONTENT, summary);
    const classifier = new RuleBasedFileClassifier();
    const baseAnalyzablePaths = new Set(
      [...baseFiles.values()]
        .filter((file) => shouldAnalyzeSourceStructure(file, classifier.classify(file)))
        .map((file) => file.path)
    );
    const analysisDecision = this.incrementalAnalysisDecision.evaluate({
      repositoryId: input.repositoryId,
      baseCommitSha: input.baseCommitSha,
      targetCommitSha: input.targetCommitSha,
      changeSet: input.changeSet,
      baseScan,
      baseAnalysis,
      baseAnalysisStatus: baseAnalysisState.status,
      baseAnalysisScanId: baseAnalysisState.scanId,
      baseAnalysisAnalyzerVersion: baseAnalysisState.analyzerVersion,
      baseAnalyzablePaths
    });
    if (analysisDecision.outcome === IncrementalAnalysisDecisionOutcome.FALLBACK_REQUIRED) {
      return this.fallback(this.analysisFallbackReason(analysisDecision.reason), summary);
    }
    const expectedPaths = new Set(baseFiles.keys());
    const changedPaths = new Set<string>();
    const touchedPaths = new Set<string>();
    for (const change of input.changeSet.files) {
      if (touchedPaths.has(change.path)) return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
      touchedPaths.add(change.path);
      switch (change.type) {
        case FileChangeType.ADDED:
          if (expectedPaths.has(change.path))
            return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
          expectedPaths.add(change.path);
          changedPaths.add(change.path);
          break;
        case FileChangeType.MODIFIED:
          if (!expectedPaths.has(change.path))
            return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
          changedPaths.add(change.path);
          break;
        case FileChangeType.DELETED:
          if (!expectedPaths.delete(change.path))
            return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
          break;
        case FileChangeType.RENAMED:
          if (
            !change.previousPath ||
            touchedPaths.has(change.previousPath) ||
            expectedPaths.has(change.path) ||
            !expectedPaths.delete(change.previousPath)
          ) {
            return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
          }
          touchedPaths.add(change.previousPath);
          expectedPaths.add(change.path);
          changedPaths.add(change.path);
          break;
        case FileChangeType.COPIED:
        default:
          return this.fallback(Reason.UNSUPPORTED_CHANGE, summary);
      }
    }

    // A real full snapshot is retained. The optimization is source parsing, not scanning.
    const scan = await this.scanner.startScan({
      repositoryId: input.repositoryId,
      userId: input.userId,
      reference: input.targetCommitSha
    });
    if (scan.commitSha !== input.targetCommitSha)
      throw new BadGatewayException("Incremental scan target commit mismatch.");
    if (scan.status !== "COMPLETED" || scan.repositoryId !== input.repositoryId)
      return this.fallback(Reason.INCREMENTAL_ARTIFACT_INVALID, summary);
    const targetFiles = await this.files(scan.id);
    summary.totalTargetFiles = targetFiles.size;
    if (
      targetFiles.size !== scan.totalFiles ||
      targetFiles.size !== expectedPaths.size ||
      [...expectedPaths].some((path) => !targetFiles.has(path))
    ) {
      return this.fallback(Reason.INSUFFICIENT_REPOSITORY_CONTENT, summary);
    }
    const baseStructures = new Map(
      baseAnalysis.sourceStructures.map((structure) => [structure.path, structure])
    );
    const reuse = new Map<string, SourceFileStructure>();
    for (const file of targetFiles.values()) {
      if (!file.isBinary && !(await this.content.readFile(scan.id, file.path)))
        return this.fallback(Reason.INSUFFICIENT_REPOSITORY_CONTENT, summary);
      if (changedPaths.has(file.path)) continue;
      const previous = baseFiles.get(file.path);
      // Validate ChangeSet completeness against immutable snapshot evidence; never infer
      // additional changed paths or reuse structures for an unreported content change.
      if (
        !previous ||
        !file.sha ||
        previous.sha !== file.sha ||
        previous.size !== file.size ||
        previous.extension !== file.extension ||
        previous.isBinary !== file.isBinary ||
        previous.isHidden !== file.isHidden
      ) {
        return this.fallback(Reason.INSUFFICIENT_REPOSITORY_CONTENT, summary);
      }
      if (shouldAnalyzeSourceStructure(file, classifier.classify(file))) {
        const structure = baseStructures.get(file.path);
        if (!structure) return this.fallback(Reason.INSUFFICIENT_REPOSITORY_CONTENT, summary);
        reuse.set(file.path, structure);
      }
    }
    // Global project detection and relationships are recomputed by the existing pipeline
    // from the complete target snapshot and combined source structures.
    const analysis = await this.analyzer.runWithSourceStructureReuse(
      { userId: input.userId, scanId: scan.id },
      reuse,
      ({ disposition }) => {
        switch (disposition) {
          case SourceStructureProcessingDisposition.REUSED:
            summary.reusedFileCount += 1;
            break;
          case SourceStructureProcessingDisposition.PARSED:
            summary.parsedFileCount += 1;
            break;
          case SourceStructureProcessingDisposition.EXCLUDED:
            summary.excludedFileCount += 1;
            break;
        }
      }
    );
    if (analysis.commitSha !== input.targetCommitSha)
      throw new BadGatewayException("Incremental analysis target commit mismatch.");
    const completedAnalysis = await this.analyses.findById(analysis.analysisId);
    if (
      analysis.scanId !== scan.id ||
      analysis.repositoryId !== input.repositoryId ||
      completedAnalysis?.status !== "COMPLETED" ||
      completedAnalysis.scanId !== scan.id ||
      analysis.analyzerVersion !== ANALYSIS_ENGINE_VERSION
    )
      return this.fallback(Reason.INCREMENTAL_ARTIFACT_INVALID, summary);
    const projectContext = await this.contexts.generate({
      userId: input.userId,
      analysisId: analysis.analysisId
    });
    if (projectContext.commitSha !== input.targetCommitSha)
      throw new BadGatewayException("Incremental context target commit mismatch.");
    if (projectContext.context.commitSha !== input.targetCommitSha)
      throw new BadGatewayException("Incremental context snapshot target commit mismatch.");
    if (
      projectContext.analysisId !== analysis.analysisId ||
      projectContext.scanId !== scan.id ||
      projectContext.repositoryId !== input.repositoryId ||
      projectContext.context.analysisId !== analysis.analysisId ||
      projectContext.context.scanId !== scan.id ||
      projectContext.context.repositoryId !== input.repositoryId
    )
      return this.fallback(Reason.INCREMENTAL_ARTIFACT_INVALID, summary);
    if (
      summary.reusedFileCount + summary.parsedFileCount + summary.excludedFileCount !==
      summary.totalTargetFiles
    )
      return this.fallback(Reason.INCREMENTAL_ARTIFACT_INVALID, summary);
    summary.parsingWorkReduced = summary.reusedFileCount > 0;
    return {
      outcome: "COMPLETED",
      targetCommitSha: input.targetCommitSha,
      scan,
      analysis,
      projectContext,
      summary
    };
  }

  private createSummary(input: IncrementalProcessingInput): IncrementalProcessingSummary {
    const count = (type: FileChangeType) =>
      input.changeSet.files.filter((file) => file.type === type).length;
    return {
      totalTargetFiles: 0,
      reusedFileCount: 0,
      parsedFileCount: 0,
      excludedFileCount: 0,
      addedFileCount: count(FileChangeType.ADDED),
      modifiedFileCount: count(FileChangeType.MODIFIED),
      deletedFileCount: count(FileChangeType.DELETED),
      renamedFileCount: count(FileChangeType.RENAMED),
      parsingWorkReduced: false,
      fallbackRequired: false,
      fallbackReason: null
    };
  }

  private fallback(
    reason: Reason,
    summary: IncrementalProcessingSummary
  ): IncrementalProcessingResult {
    summary.fallbackRequired = true;
    summary.fallbackReason = reason;
    // A fallback executes the canonical full parser path, so no net parser work is saved.
    summary.parsingWorkReduced = false;
    return { outcome: "FALLBACK_REQUIRED", reason, summary };
  }

  private analysisFallbackReason(reason: IncrementalAnalysisDecisionReason): Reason {
    switch (reason) {
      case IncrementalAnalysisDecisionReason.INCOMPLETE_CHANGE_SET:
        return Reason.INCOMPLETE_CHANGE_SET;
      case IncrementalAnalysisDecisionReason.UNSUPPORTED_COMPARISON:
      case IncrementalAnalysisDecisionReason.UNSUPPORTED_CHANGE:
      case IncrementalAnalysisDecisionReason.CONFLICTING_PATH_OPERATION:
        return Reason.UNSUPPORTED_CHANGE;
      case IncrementalAnalysisDecisionReason.BASE_COMMIT_MISMATCH:
        return Reason.BASE_COMMIT_MISMATCH;
      case IncrementalAnalysisDecisionReason.SOURCE_STRUCTURE_MISMATCH:
        return Reason.INSUFFICIENT_REPOSITORY_CONTENT;
      default:
        return Reason.MISSING_BASE_ARTIFACTS;
    }
  }

  private async files(scanId: string): Promise<Map<string, ScanContentFile>> {
    const files = new Map<string, ScanContentFile>();
    for await (const file of this.content.listFiles(scanId)) files.set(file.path, file);
    return files;
  }
}
