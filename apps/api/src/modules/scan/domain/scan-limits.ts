export const SCAN_LIMITS = {
  maxFiles: 5_000,
  maxIndividualFileSizeBytes: 1_048_576,
  maxTotalSizeBytes: 26_214_400
} as const;

export type ScanLimits = typeof SCAN_LIMITS;
