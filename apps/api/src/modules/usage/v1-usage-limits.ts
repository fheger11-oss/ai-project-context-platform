export const V1_USAGE_LIMITS = {
  repositories: 1,
  scansPerMonth: 3,
  analysesPerMonth: 3,
  contextsPerMonth: 3,
  documentsPerMonth: 5,
  aiExportsPerMonth: 10,
  retainedCompletedScansPerRepository: 2,
  concurrency: {
    maxHeavyOperationsPerUser: 1,
    maxActiveScansPerRepository: 1,
    maxActiveAnalysesPerScan: 1,
    maxGlobalScans: 1,
    maxGlobalAnalyses: 1
  },
  lockLeaseMs: {
    scan: 15 * 60 * 1000,
    analysis: 10 * 60 * 1000,
    context: 5 * 60 * 1000,
    document: 5 * 60 * 1000,
    repositoryConnect: 60 * 1000,
    aiExport: 60 * 1000
  }
} as const;

export type V1UsageLimits = typeof V1_USAGE_LIMITS;
