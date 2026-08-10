import type { ScanStatus } from "./contracts/scan-repository.contract.js";
import { InvalidScanStateTransitionError } from "./errors/invalid-scan-state-transition.error.js";

const VALID_SCAN_TRANSITIONS: Readonly<Record<ScanStatus, readonly ScanStatus[]>> = {
  PENDING: ["RUNNING", "CANCELLED"],
  RUNNING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: []
};

export function canTransitionScanStatus(
  currentStatus: ScanStatus,
  nextStatus: ScanStatus
): boolean {
  return VALID_SCAN_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function assertValidScanStatusTransition(
  currentStatus: ScanStatus,
  nextStatus: ScanStatus
): void {
  if (!canTransitionScanStatus(currentStatus, nextStatus)) {
    throw new InvalidScanStateTransitionError(currentStatus, nextStatus);
  }
}
