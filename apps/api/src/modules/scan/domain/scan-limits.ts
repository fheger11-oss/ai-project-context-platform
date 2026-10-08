export const SCAN_LIMITS = {
  maxFiles: 1_000,
  maxIndividualNonBinaryFileSizeBytes: 524_288,
  maxNonBinaryContentSizeBytes: 5_242_880,
  binaryContentFetched: false,
  binaryFilesCountTowardFileLimit: true,
  // Compatibility aliases. Both byte limits now describe non-binary content.
  maxIndividualFileSizeBytes: 524_288,
  maxTotalSizeBytes: 5_242_880
} as const;

export type ScanLimits = typeof SCAN_LIMITS;
