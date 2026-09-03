import type { ScanLimitFailureReason } from "../errors/scan-limit-exceeded.error.js";

export const SCAN_REPOSITORY = Symbol("SCAN_REPOSITORY");

export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type ScanSnapshot = {
  id: string;
  repositoryId: string;
  status: ScanStatus;
  commitSha: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  totalFiles: number;
  totalSize: bigint;
  filesProcessed: number;
  totalBytesConsidered: bigint;
  scanLimitReason: ScanLimitFailureReason | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateScanInput = {
  repositoryId: string;
  commitSha: string;
  status?: ScanStatus;
  startedAt?: Date;
};

export type UpdateScanStatusInput = {
  scanId: string;
  status: ScanStatus;
  completedAt?: Date;
  durationMs?: number;
  totalFiles?: number;
  totalSize?: bigint;
  filesProcessed?: number;
  totalBytesConsidered?: bigint;
  scanLimitReason?: ScanLimitFailureReason | null;
};

export type StoreScanFileInput = {
  path: string;
  extension: string | null;
  size: bigint;
  sha: string;
  content: string | null;
  isBinary: boolean;
  isHidden: boolean;
};

export type ScanHistoryQuery = {
  repositoryId: string;
  page: number;
  pageSize: number;
};

export type ScanHistoryQueryResult = {
  items: ScanSnapshot[];
  totalItems: number;
};

export interface ScanRepository {
  createScan(input: CreateScanInput): Promise<ScanSnapshot>;
  updateScanStatus(input: UpdateScanStatusInput): Promise<ScanSnapshot>;
  storeScanFiles(scanId: string, files: readonly StoreScanFileInput[]): Promise<void>;
  findCompletedScanByRepositoryAndCommit(
    repositoryId: string,
    commitSha: string
  ): Promise<ScanSnapshot | null>;
  getScan(scanId: string): Promise<ScanSnapshot | null>;
  getLatestScan(repositoryId: string): Promise<ScanSnapshot | null>;
  listScanHistory(input: ScanHistoryQuery): Promise<ScanHistoryQueryResult>;
}
