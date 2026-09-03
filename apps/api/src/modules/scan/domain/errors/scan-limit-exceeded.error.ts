import type { ScanLimits } from "../scan-limits.js";

export type ScanLimitFailureReason =
  "FILE_COUNT_LIMIT" | "INDIVIDUAL_FILE_SIZE_LIMIT" | "TOTAL_SIZE_LIMIT";

export type ScanLimitUsage = {
  filesProcessed: number;
  totalBytesConsidered: bigint;
};

export class ScanLimitExceededError extends Error {
  constructor(
    readonly reason: ScanLimitFailureReason,
    readonly usage: ScanLimitUsage,
    readonly limits: ScanLimits,
    readonly filePath?: string
  ) {
    super(`Repository scan limit reached: ${reason}.`);
    this.name = "ScanLimitExceededError";
  }
}
