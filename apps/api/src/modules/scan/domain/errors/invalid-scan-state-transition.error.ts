import type { ScanStatus } from "../contracts/scan-repository.contract.js";

export class InvalidScanStateTransitionError extends Error {
  constructor(
    readonly currentStatus: ScanStatus,
    readonly nextStatus: ScanStatus
  ) {
    super(`Invalid scan state transition from ${currentStatus} to ${nextStatus}`);
    this.name = "InvalidScanStateTransitionError";
  }
}
