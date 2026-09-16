import { V1_USAGE_LIMITS } from "./v1-usage-limits.js";
import type { OperationLockSpec } from "./operation-lock.service.js";

export function globalScanLock(): OperationLockSpec {
  return {
    key: "global:scan",
    operationType: "scan.global",
    leaseMs: V1_USAGE_LIMITS.lockLeaseMs.scan
  };
}

export function globalAnalysisLock(): OperationLockSpec {
  return {
    key: "global:analysis",
    operationType: "analysis.global",
    leaseMs: V1_USAGE_LIMITS.lockLeaseMs.analysis
  };
}

export function userHeavyOperationLock(userId: string, leaseMs: number): OperationLockSpec {
  return {
    key: `user:${userId}:heavy`,
    operationType: "user.heavy",
    leaseMs
  };
}

export function repositoryScanLock(repositoryId: string): OperationLockSpec {
  return {
    key: `repository:${repositoryId}:scan`,
    operationType: "scan.repository",
    leaseMs: V1_USAGE_LIMITS.lockLeaseMs.scan
  };
}

export function scanAnalysisLock(scanId: string): OperationLockSpec {
  return {
    key: `scan:${scanId}:analysis`,
    operationType: "analysis.scan",
    leaseMs: V1_USAGE_LIMITS.lockLeaseMs.analysis
  };
}

export function repositoryConnectLock(userId: string): OperationLockSpec {
  return {
    key: `user:${userId}:repository-connect`,
    operationType: "repository.connect",
    leaseMs: V1_USAGE_LIMITS.lockLeaseMs.repositoryConnect
  };
}

export function aiExportQuotaLock(userId: string): OperationLockSpec {
  return {
    key: `user:${userId}:ai-export-quota`,
    operationType: "ai-export.quota",
    leaseMs: V1_USAGE_LIMITS.lockLeaseMs.aiExport
  };
}
