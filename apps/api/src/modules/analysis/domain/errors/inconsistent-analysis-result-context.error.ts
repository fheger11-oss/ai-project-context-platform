import type { AnalysisResultContext } from "../contracts/analysis-result.contract.js";

export class InconsistentAnalysisResultContextError extends Error {
  constructor(
    readonly expected: AnalysisResultContext,
    readonly actual: AnalysisResultContext,
    readonly component: string
  ) {
    super(
      `Analysis result component context mismatch for ${component}: expected scanId=${expected.scanId}, repositoryId=${expected.repositoryId}, commitSha=${expected.commitSha}.`
    );
    this.name = "InconsistentAnalysisResultContextError";
  }
}
