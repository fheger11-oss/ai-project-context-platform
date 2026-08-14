import { describe, expect, it } from "vitest";

import type { AnalysisStatus } from "./analysis-status.js";
import {
  assertValidAnalysisStatusTransition,
  canTransitionAnalysisStatus
} from "./analysis-state-machine.js";
import { InvalidAnalysisStateTransitionError } from "./errors/invalid-analysis-state-transition.error.js";

const validTransitions: Array<[AnalysisStatus, AnalysisStatus]> = [
  ["PENDING", "RUNNING"],
  ["PENDING", "CANCELLED"],
  ["RUNNING", "COMPLETED"],
  ["RUNNING", "FAILED"],
  ["RUNNING", "CANCELLED"]
];

const invalidTransitions: Array<[AnalysisStatus, AnalysisStatus]> = [
  ["PENDING", "COMPLETED"],
  ["PENDING", "FAILED"],
  ["RUNNING", "PENDING"],
  ["COMPLETED", "RUNNING"],
  ["COMPLETED", "FAILED"],
  ["FAILED", "RUNNING"],
  ["CANCELLED", "RUNNING"]
];

describe("Analysis state machine", () => {
  it.each(validTransitions)("allows %s to transition to %s", (currentStatus, nextStatus) => {
    expect(canTransitionAnalysisStatus(currentStatus, nextStatus)).toBe(true);
    expect(() => assertValidAnalysisStatusTransition(currentStatus, nextStatus)).not.toThrow();
  });

  it.each(invalidTransitions)("rejects %s to %s", (currentStatus, nextStatus) => {
    expect(canTransitionAnalysisStatus(currentStatus, nextStatus)).toBe(false);
    expect(() => assertValidAnalysisStatusTransition(currentStatus, nextStatus)).toThrow(
      InvalidAnalysisStateTransitionError
    );
  });
});
