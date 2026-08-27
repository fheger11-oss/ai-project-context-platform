import type { ScanStatus } from "@/features/scans/api/scan-api";

export type ScanStatusTone = "error" | "muted" | "pending" | "running" | "success";

export function scanStatusLabel(status: ScanStatus): string {
  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "RUNNING") {
    return "Running";
  }

  if (status === "PENDING") {
    return "Pending";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Cancelled";
}

export function scanStatusTone(status: ScanStatus): ScanStatusTone {
  if (status === "COMPLETED") {
    return "success";
  }

  if (status === "FAILED") {
    return "error";
  }

  if (status === "RUNNING") {
    return "running";
  }

  if (status === "PENDING") {
    return "pending";
  }

  return "muted";
}
