import { describe, expect, it, vi } from "vitest";

import type { RunAnalysisService } from "../../analysis/application/run-analysis.service.js";
import type { AnalysisResult } from "../../analysis/domain/contracts/analysis-result.contract.js";
import type { SourceFileStructure } from "../../analysis/domain/source-structure/source-file-structure.js";
import {
  IncrementalAnalysisDecisionOutcome as Outcome,
  IncrementalAnalysisDecisionReason as Reason,
  IncrementalAnalysisStage as Stage,
  IncrementalAnalysisStageDisposition as Disposition,
  type IncrementalAnalysisDecisionResult
} from "./contracts/incremental-analysis-decision.contract.js";
import { IncrementalAnalysisExecutionService } from "./incremental-analysis-execution.service.js";

const safeDecision: IncrementalAnalysisDecisionResult = {
  outcome: Outcome.PROCEED,
  reason: Reason.SAFE_FILE_LOCAL_REUSE,
  stages: [
    { stage: Stage.FILE_CLASSIFICATION, disposition: Disposition.RECOMPUTE },
    { stage: Stage.PROJECT_DETECTION, disposition: Disposition.RECOMPUTE },
    { stage: Stage.SOURCE_STRUCTURE, disposition: Disposition.REUSABLE },
    { stage: Stage.RELATIONSHIP_ANALYSIS, disposition: Disposition.RECOMPUTE },
    { stage: Stage.RESULT_AGGREGATION, disposition: Disposition.RECOMPUTE }
  ]
};

describe("IncrementalAnalysisExecutionService", () => {
  it("executes the shared analysis pipeline with verified reusable structures", async () => {
    const result = { analysisId: "analysis" } as AnalysisResult;
    const runWithSourceStructureReuse = vi.fn(async () => result);
    const service = new IncrementalAnalysisExecutionService({
      runWithSourceStructureReuse
    } as unknown as RunAnalysisService);
    const structures = new Map<string, SourceFileStructure>();
    const observer = vi.fn();

    await expect(
      service.execute({ userId: "user", scanId: "target-scan" }, safeDecision, structures, observer)
    ).resolves.toBe(result);
    expect(runWithSourceStructureReuse).toHaveBeenCalledWith(
      { userId: "user", scanId: "target-scan" },
      structures,
      observer
    );
  });

  it("does not execute analysis for a fallback decision", async () => {
    const runWithSourceStructureReuse = vi.fn();
    const service = new IncrementalAnalysisExecutionService({
      runWithSourceStructureReuse
    } as unknown as RunAnalysisService);

    await expect(
      service.execute(
        { userId: "user", scanId: "target-scan" },
        { ...safeDecision, outcome: Outcome.FALLBACK_REQUIRED },
        new Map()
      )
    ).rejects.toThrow("requires a safe PROCEED decision");
    expect(runWithSourceStructureReuse).not.toHaveBeenCalled();
  });

  it("rejects an unsafe stage policy instead of silently reusing global analysis", async () => {
    const runWithSourceStructureReuse = vi.fn();
    const service = new IncrementalAnalysisExecutionService({
      runWithSourceStructureReuse
    } as unknown as RunAnalysisService);
    const unsafeDecision: IncrementalAnalysisDecisionResult = {
      ...safeDecision,
      stages: safeDecision.stages.map((stage) =>
        stage.stage === Stage.RELATIONSHIP_ANALYSIS
          ? { ...stage, disposition: Disposition.REUSABLE }
          : stage
      )
    };

    await expect(
      service.execute({ userId: "user", scanId: "target-scan" }, unsafeDecision, new Map())
    ).rejects.toThrow("requires a safe PROCEED decision");
    expect(runWithSourceStructureReuse).not.toHaveBeenCalled();
  });

  it("propagates unexpected analysis failures without converting them to fallback", async () => {
    const error = new Error("analysis failed unexpectedly");
    const service = new IncrementalAnalysisExecutionService({
      runWithSourceStructureReuse: vi.fn(async () => Promise.reject(error))
    } as unknown as RunAnalysisService);

    await expect(
      service.execute({ userId: "user", scanId: "target-scan" }, safeDecision, new Map())
    ).rejects.toBe(error);
  });
});
