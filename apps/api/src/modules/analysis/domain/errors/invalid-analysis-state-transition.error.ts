import type { AnalysisStatus } from "../analysis-status.js";

export class InvalidAnalysisStateTransitionError extends Error {
  constructor(
    readonly currentStatus: AnalysisStatus,
    readonly nextStatus: AnalysisStatus
  ) {
    super(`Cannot transition analysis from ${currentStatus} to ${nextStatus}.`);
    this.name = "InvalidAnalysisStateTransitionError";
  }
}
