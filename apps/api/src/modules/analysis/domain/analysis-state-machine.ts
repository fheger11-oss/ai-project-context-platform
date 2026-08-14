import type { AnalysisStatus } from "./analysis-status.js";
import { InvalidAnalysisStateTransitionError } from "./errors/invalid-analysis-state-transition.error.js";

const VALID_ANALYSIS_TRANSITIONS: Readonly<Record<AnalysisStatus, readonly AnalysisStatus[]>> = {
  PENDING: ["RUNNING", "CANCELLED"],
  RUNNING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: []
};

export function canTransitionAnalysisStatus(
  currentStatus: AnalysisStatus,
  nextStatus: AnalysisStatus
): boolean {
  return VALID_ANALYSIS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function assertValidAnalysisStatusTransition(
  currentStatus: AnalysisStatus,
  nextStatus: AnalysisStatus
): void {
  if (!canTransitionAnalysisStatus(currentStatus, nextStatus)) {
    throw new InvalidAnalysisStateTransitionError(currentStatus, nextStatus);
  }
}
