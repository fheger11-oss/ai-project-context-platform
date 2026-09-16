export const SCAN_LIMITS = {
  maxFiles: 1_000,
  maxIndividualFileSizeBytes: 524_288,
  maxTotalSizeBytes: 5_242_880
} as const;

export type ScanLimits = typeof SCAN_LIMITS;
