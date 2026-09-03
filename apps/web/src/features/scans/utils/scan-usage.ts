import type { ScanLimitErrorResponse, ScanLimitFailureReason } from "@/features/scans/api/scan-api";

const BYTES_PER_MIB = 1024 * 1024;

export function formatBytes(bytes: string | number | bigint): string {
  const value = typeof bytes === "string" ? Number(bytes) : Number(bytes);

  if (!Number.isFinite(value)) {
    return `${String(bytes)} bytes`;
  }

  if (value < BYTES_PER_MIB) {
    return `${value.toLocaleString()} bytes`;
  }

  return `${(value / BYTES_PER_MIB).toLocaleString(undefined, {
    maximumFractionDigits: 1
  })} MiB`;
}

export function limitReasonLabel(reason: ScanLimitFailureReason | null): string {
  if (reason === "FILE_COUNT_LIMIT") {
    return "File limit reached";
  }

  if (reason === "INDIVIDUAL_FILE_SIZE_LIMIT") {
    return "File size limit reached";
  }

  if (reason === "TOTAL_SIZE_LIMIT") {
    return "Total data limit reached";
  }

  return "Within scan limits";
}

export function scanLimitErrorMessage(error: ScanLimitErrorResponse): string {
  if (error.limit.reason === "FILE_COUNT_LIMIT") {
    return `This repository exceeds the ${error.limits.maxFiles.toLocaleString()}-file limit for a single scan. ${error.usage.filesProcessed.toLocaleString()} files were processed.`;
  }

  if (error.limit.reason === "INDIVIDUAL_FILE_SIZE_LIMIT") {
    return `A non-binary file exceeds the ${formatBytes(
      error.limits.maxIndividualFileSizeBytes
    )} maximum file size. The scan could not continue.`;
  }

  return `This scan exceeded the ${formatBytes(
    error.limits.maxTotalSizeBytes
  )} total repository file-data limit. ${error.usage.filesProcessed.toLocaleString()} files were processed and ${formatBytes(
    error.usage.totalBytesConsidered
  )} were considered.`;
}
