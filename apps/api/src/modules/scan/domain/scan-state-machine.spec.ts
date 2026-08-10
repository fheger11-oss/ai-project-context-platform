import { describe, expect, it } from "vitest";

import type { ScanStatus } from "./contracts/scan-repository.contract.js";
import { InvalidScanStateTransitionError } from "./errors/invalid-scan-state-transition.error.js";
import { assertValidScanStatusTransition, canTransitionScanStatus } from "./scan-state-machine.js";

const validTransitions: Array<[ScanStatus, ScanStatus]> = [
  ["PENDING", "RUNNING"],
  ["PENDING", "CANCELLED"],
  ["RUNNING", "COMPLETED"],
  ["RUNNING", "FAILED"],
  ["RUNNING", "CANCELLED"]
];

const invalidTransitions: Array<[ScanStatus, ScanStatus]> = [
  ["PENDING", "COMPLETED"],
  ["PENDING", "FAILED"],
  ["RUNNING", "PENDING"],
  ["COMPLETED", "RUNNING"],
  ["COMPLETED", "FAILED"],
  ["FAILED", "RUNNING"],
  ["CANCELLED", "RUNNING"]
];

const terminalStatuses: ScanStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];
const allStatuses: ScanStatus[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

describe("Scan state machine", () => {
  it.each(validTransitions)("allows %s to transition to %s", (currentStatus, nextStatus) => {
    expect(canTransitionScanStatus(currentStatus, nextStatus)).toBe(true);
    expect(() => assertValidScanStatusTransition(currentStatus, nextStatus)).not.toThrow();
  });

  it.each(invalidTransitions)("rejects %s to %s", (currentStatus, nextStatus) => {
    expect(canTransitionScanStatus(currentStatus, nextStatus)).toBe(false);
    expect(() => assertValidScanStatusTransition(currentStatus, nextStatus)).toThrow(
      InvalidScanStateTransitionError
    );
  });

  it.each(terminalStatuses)("prevents terminal state %s from transitioning", (currentStatus) => {
    for (const nextStatus of allStatuses) {
      expect(canTransitionScanStatus(currentStatus, nextStatus)).toBe(false);
    }
  });

  it("includes current and requested statuses in invalid transition errors", () => {
    expect(() => assertValidScanStatusTransition("COMPLETED", "FAILED")).toThrow(
      new InvalidScanStateTransitionError("COMPLETED", "FAILED")
    );
  });
});
